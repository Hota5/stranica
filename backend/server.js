require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - needed when behind Nginx reverse proxy
app.set('trust proxy', 1);

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tradingview_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rate limiting for webhooks
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests from this IP'
});

// Rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

// JWT Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hardcoded credentials (as per requirements)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, username });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== BOT ROUTES ====================

// Get all bots with stats
app.get('/api/bots', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        COUNT(DISTINCT t.id) as total_trades,
        COALESCE(SUM(CASE WHEN t.pnl > 0 THEN 1 ELSE 0 END), 0) as winning_trades,
        COALESCE(SUM(CASE WHEN t.pnl < 0 THEN 1 ELSE 0 END), 0) as losing_trades,
        COALESCE(SUM(t.pnl), 0) as total_pnl
      FROM bots b
      LEFT JOIN trades t ON b.id = t.bot_id AND t.action = 'sell'
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);

    const bots = result.rows.map(bot => {
      const currentBalance = parseFloat(bot.current_balance);
      const startingBalance = parseFloat(bot.starting_balance);
      const totalPnl = currentBalance - startingBalance; // Real P&L = current - starting
      const totalTrades = parseInt(bot.total_trades) || 0;
      const winningTrades = parseInt(bot.winning_trades) || 0;
      const losingTrades = parseInt(bot.losing_trades) || 0;
      const completedTrades = winningTrades + losingTrades;
      const winRate = completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0;
      const returnPct = startingBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0;

      return {
        id: bot.id,
        name: bot.name,
        webhook_url: bot.webhook_url,
        created_at: bot.created_at,
        starting_balance: startingBalance,
        current_balance: currentBalance,
        commission_rate: parseFloat(bot.commission_rate),
        slippage_percent: parseFloat(bot.slippage_percent),
        stats: {
          total_trades: totalTrades,
          completed_trades: completedTrades,
          winning_trades: winningTrades,
          losing_trades: losingTrades,
          total_pnl: totalPnl,
          return_pct: returnPct,
          win_rate: winRate
        }
      };
    });

    res.json(bots);
  } catch (error) {
    console.error('Get bots error:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Get single bot with detailed stats
app.get('/api/bots/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const botResult = await pool.query('SELECT * FROM bots WHERE id = $1', [id]);
    if (botResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const bot = botResult.rows[0];
    const tradesResult = await pool.query(
      'SELECT * FROM trades WHERE bot_id = $1 ORDER BY timestamp DESC',
      [id]
    );

    const trades = tradesResult.rows;
    
    // Calculate detailed stats
    const currentBalance = parseFloat(bot.current_balance);
    const startingBalance = parseFloat(bot.starting_balance);
    const totalPnl = currentBalance - startingBalance; // Real P&L = difference
    let winningTrades = 0;
    let losingTrades = 0;

    // Build per-trade balance history
    const balanceHistory = [];
    
    // Add starting point
    if (trades.length > 0) {
      balanceHistory.push({
        timestamp: new Date(bot.created_at).toISOString(),
        balance: startingBalance,
        trade_id: null,
        action: 'start'
      });
    }

    trades.forEach(trade => {
      const pnl = parseFloat(trade.pnl) || 0;
      
      if (trade.trade_type && trade.trade_type.includes('CLOSE') && pnl !== 0) {
        if (pnl > 0) winningTrades++;
        else if (pnl < 0) losingTrades++;
      }

      // Add each trade to balance history
      balanceHistory.push({
        timestamp: trade.timestamp,
        balance: parseFloat(trade.balance_after),
        trade_id: trade.id,
        action: trade.action,
        symbol: trade.symbol,
        pnl: pnl
      });
    });

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const returnPct = startingBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0;

    res.json({
      ...bot,
      starting_balance: startingBalance,
      current_balance: currentBalance,
      commission_rate: parseFloat(bot.commission_rate),
      slippage_percent: parseFloat(bot.slippage_percent),
      trades: trades.map(t => ({
        ...t,
        signal_price: parseFloat(t.signal_price),
        execution_price: parseFloat(t.execution_price),
        contracts: parseFloat(t.contracts),
        position_size: parseFloat(t.position_size),
        commission: parseFloat(t.commission),
        pnl: parseFloat(t.pnl),
        balance_after: parseFloat(t.balance_after),
        trade_type: t.trade_type
      })),
      stats: {
        total_trades: trades.length,
        completed_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        win_rate: winRate,
        total_pnl: totalPnl,
        return_pct: returnPct,
        balance_history: balanceHistory
      }
    });
  } catch (error) {
    console.error('Get bot error:', error);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Create new bot
app.post('/api/bots', authenticateToken, async (req, res) => {
  try {
    const { name, starting_balance, commission_rate, slippage_percent } = req.body;
    const bot_id = uuidv4();
    const webhook_url = `${process.env.API_URL || 'http://localhost:5000'}/webhook/${bot_id}`;
    
    // Default Pionex fee: 0.05% maker/taker
    const commission = commission_rate !== undefined ? commission_rate : 0.0005;
    
    // Default slippage: 0.1% (realistic for crypto)
    const slippage = slippage_percent !== undefined ? slippage_percent : 0.001;

    const result = await pool.query(
      'INSERT INTO bots (id, name, webhook_url, starting_balance, current_balance, commission_rate, slippage_percent) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [bot_id, name, webhook_url, starting_balance, starting_balance, commission, slippage]
    );

    res.status(201).json({
      ...result.rows[0],
      starting_balance: parseFloat(result.rows[0].starting_balance),
      current_balance: parseFloat(result.rows[0].current_balance),
      commission_rate: parseFloat(result.rows[0].commission_rate),
      slippage_percent: parseFloat(result.rows[0].slippage_percent)
    });
  } catch (error) {
    console.error('Create bot error:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// Update bot
app.put('/api/bots/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, starting_balance } = req.body;

    const result = await pool.query(
      'UPDATE bots SET name = $1, starting_balance = $2 WHERE id = $3 RETURNING *',
      [name, starting_balance, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      ...result.rows[0],
      starting_balance: parseFloat(result.rows[0].starting_balance),
      commission_rate: parseFloat(result.rows[0].commission_rate)
    });
  } catch (error) {
    console.error('Update bot error:', error);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

// Update bot settings
app.put('/api/bots/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, slippage_percent, commission_rate, starting_balance } = req.body;
    
    // Get current bot data
    const currentBot = await client.query('SELECT * FROM bots WHERE id = $1', [id]);
    if (currentBot.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bot not found' });
    }

    const bot = currentBot.rows[0];
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (slippage_percent !== undefined) {
      updates.push(`slippage_percent = $${paramCount}`);
      values.push(parseFloat(slippage_percent) / 100);
      paramCount++;
    }
    if (commission_rate !== undefined) {
      updates.push(`commission_rate = $${paramCount}`);
      values.push(parseFloat(commission_rate) / 100);
      paramCount++;
    }
    
    // SPECIAL HANDLING for starting_balance
    if (starting_balance !== undefined) {
      const newStartingBalance = parseFloat(starting_balance);
      const oldStartingBalance = parseFloat(bot.starting_balance);
      const oldCurrentBalance = parseFloat(bot.current_balance);
      
      // Calculate return percentage based on old values
      const returnPct = oldStartingBalance > 0 
        ? (oldCurrentBalance - oldStartingBalance) / oldStartingBalance 
        : 0;
      
      // Apply same return percentage to new starting balance
      const newCurrentBalance = newStartingBalance * (1 + returnPct);
      
      updates.push(`starting_balance = $${paramCount}`);
      values.push(newStartingBalance);
      paramCount++;
      
      updates.push(`current_balance = $${paramCount}`);
      values.push(newCurrentBalance);
      paramCount++;
      
      console.log(`What-if calculation for bot ${id}:`, {
        oldStarting: oldStartingBalance,
        oldCurrent: oldCurrentBalance,
        returnPct: (returnPct * 100).toFixed(2) + '%',
        newStarting: newStartingBalance,
        newCurrent: newCurrentBalance
      });
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE bots SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await client.query(query, values);
    await client.query('COMMIT');

    res.json({
      ...result.rows[0],
      starting_balance: parseFloat(result.rows[0].starting_balance),
      current_balance: parseFloat(result.rows[0].current_balance),
      commission_rate: parseFloat(result.rows[0].commission_rate),
      slippage_percent: parseFloat(result.rows[0].slippage_percent)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update bot error:', error);
    res.status(500).json({ error: 'Failed to update bot' });
  } finally {
    client.release();
  }
});

// Get webhook logs for a bot
app.get('/api/bots/:id/logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT 
        id,
        status,
        request_body,
        response_body,
        error_message,
        created_at
       FROM webhook_logs 
       WHERE bot_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [id, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Delete bot
app.delete('/api/bots/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete trades first
    await pool.query('DELETE FROM trades WHERE bot_id = $1', [id]);
    
    // Delete bot
    const result = await pool.query('DELETE FROM bots WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({ message: 'Bot deleted successfully' });
  } catch (error) {
    console.error('Delete bot error:', error);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// ==================== WEBHOOK ROUTE ====================

// Receive TradingView webhook and auto-execute virtual trade
app.post('/webhook/:bot_id', webhookLimiter, async (req, res) => {
  const client = await pool.connect();
  const startTime = Date.now();
  let logStatus = 'success';
  let logResponse = '';
  let logError = '';
  
  try {
    const { bot_id } = req.params;
    const webhookData = req.body;

    await client.query('BEGIN');

    // Verify bot exists
    const botResult = await client.query('SELECT * FROM bots WHERE id = $1', [bot_id]);
    if (botResult.rows.length === 0) {
      logStatus = 'error';
      logError = 'Bot not found';
      logResponse = JSON.stringify({ error: 'Bot not found' });
      
      await client.query(
        `INSERT INTO webhook_logs (bot_id, status, request_body, response_body, error_message) 
         VALUES ($1, $2, $3, $4, $5)`,
        [bot_id, logStatus, JSON.stringify(webhookData), logResponse, logError]
      );
      await client.query('COMMIT');
      return res.status(404).json({ error: 'Bot not found' });
    }

    const bot = botResult.rows[0];

    // Parse webhook data
    const action = webhookData.data?.action?.toLowerCase();
    const contracts = parseFloat(webhookData.data?.contracts || 0);
    const position_size = parseFloat(webhookData.data?.position_size || 0);
    const signalPrice = parseFloat(webhookData.price || 0);
    const symbol = webhookData.symbol;
    const timestamp = webhookData.time || new Date().toISOString();

    if (!action || !signalPrice || !symbol || !contracts) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields: action, price, symbol, contracts' });
    }

    // Apply slippage
    const slippagePercent = parseFloat(bot.slippage_percent);
    let executionPrice;
    
    if (action === 'buy') {
      executionPrice = signalPrice * (1 + slippagePercent);
    } else if (action === 'sell') {
      executionPrice = signalPrice * (1 - slippagePercent);
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid action: must be buy or sell' });
    }

    // Get current balance
    const balanceResult = await client.query(
      'SELECT current_balance FROM bots WHERE id = $1',
      [bot_id]
    );
    let currentBalance = parseFloat(balanceResult.rows[0].current_balance);

    // Check current position for this symbol
    // Only count OPEN trades since we delete them when closed
    const positionResult = await client.query(
      `SELECT 
        COALESCE(SUM(CASE 
          WHEN action = 'buy' AND trade_type = 'OPEN LONG' THEN contracts 
          WHEN action = 'sell' AND trade_type = 'OPEN SHORT' THEN -contracts 
        END), 0) as net_position
       FROM trades 
       WHERE bot_id = $1 AND symbol = $2 AND trade_type LIKE 'OPEN%'`,
      [bot_id, symbol]
    );

    const netPosition = parseFloat(positionResult.rows[0]?.net_position || 0);

    let newBalance = currentBalance;
    let pnl = 0;
    let tradeType = '';

    // FUTURES LOGIC:
    // Position = 0: Opening new position (LONG or SHORT)
    // Position > 0: Open LONG, opposite action closes
    // Position < 0: Open SHORT, opposite action closes

    if (Math.abs(netPosition) < 0.0001) {
      // NO OPEN POSITION - Opening new position
      if (action === 'buy') {
        tradeType = 'OPEN LONG';
      } else {
        tradeType = 'OPEN SHORT';
      }

      // Calculate notional value and commission
      const notionalValue = contracts * executionPrice;
      const commission = notionalValue * parseFloat(bot.commission_rate);

      // For paper trading: Check if they have enough balance to cover the position size
      // (In real trading this would be margin requirement based on leverage)
      if (notionalValue > currentBalance) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Insufficient balance for position size',
          required: notionalValue.toFixed(2),
          available: currentBalance.toFixed(2),
          note: 'Using 1x leverage - position size cannot exceed balance'
        });
      }

      // For paper trading: Only deduct commission on opening
      // (The notional value is virtual - we don't actually hold the asset)
      newBalance = currentBalance - commission;

      await client.query(
        `INSERT INTO trades 
         (bot_id, symbol, action, signal_price, execution_price, contracts, position_size, commission, pnl, balance_after, timestamp, trade_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [bot_id, symbol, action, signalPrice, executionPrice, contracts, position_size, commission, 0, newBalance, timestamp, tradeType]
      );

    } else {
      // HAVE OPEN POSITION
      const isClosing = (netPosition > 0 && action === 'sell') || (netPosition < 0 && action === 'buy');
      const absNetPosition = Math.abs(netPosition);

      if (isClosing) {
        // CLOSING or REVERSING POSITION
        
        // Find the opening trade (FIFO)
        const openingTrades = await client.query(
          `SELECT * FROM trades 
           WHERE bot_id = $1 AND symbol = $2 AND trade_type LIKE 'OPEN%'
           ORDER BY timestamp ASC
           LIMIT 1`,
          [bot_id, symbol]
        );

        if (openingTrades.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'No opening position found' });
        }

        const openingTrade = openingTrades.rows[0];
        const entryPrice = parseFloat(openingTrade.execution_price);
        const entryCommission = parseFloat(openingTrade.commission);
        
        // Determine how many contracts are CLOSING vs REVERSING
        const contractsClosing = Math.min(contracts, absNetPosition);
        const contractsReversing = Math.max(0, contracts - absNetPosition);
        
        // CLOSE THE EXISTING POSITION
        if (netPosition > 0) {
          tradeType = 'CLOSE LONG';
        } else {
          tradeType = 'CLOSE SHORT';
        }

        // Calculate commission for the CLOSING portion only
        const closeCommission = contractsClosing * executionPrice * parseFloat(bot.commission_rate);

        // Calculate P&L for CLOSING portion only
        let priceDifference;
        if (netPosition > 0) {
          // CLOSING LONG: profit if price went UP
          priceDifference = executionPrice - entryPrice;
        } else {
          // CLOSING SHORT: profit if price went DOWN
          priceDifference = entryPrice - executionPrice;
        }

        // P&L = price movement × CLOSING contracts only - commissions
        pnl = (priceDifference * contractsClosing) - entryCommission - closeCommission;

        // Update balance with P&L from closing
        newBalance = currentBalance + pnl;

        // Insert the closing trade
        await client.query(
          `INSERT INTO trades 
           (bot_id, symbol, action, signal_price, execution_price, contracts, position_size, commission, pnl, balance_after, timestamp, trade_type) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [bot_id, symbol, action, signalPrice, executionPrice, contractsClosing, position_size, closeCommission, pnl, newBalance, timestamp, tradeType]
        );

        // Delete the matched opening trade
        await client.query(
          `DELETE FROM trades WHERE id = $1`,
          [openingTrade.id]
        );

        // If there are REVERSING contracts, open opposite position
        if (contractsReversing > 0) {
          // Determine new position type
          let reverseTradeType;
          if (action === 'buy') {
            reverseTradeType = 'OPEN LONG';
          } else {
            reverseTradeType = 'OPEN SHORT';
          }

          // Calculate commission for opening the reverse position
          const reverseCommission = contractsReversing * executionPrice * parseFloat(bot.commission_rate);
          
          // Check if enough balance for reverse position
          const reverseNotional = contractsReversing * executionPrice;
          if (reverseNotional > newBalance) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              error: 'Insufficient balance for reverse position after closing',
              required: reverseNotional.toFixed(2),
              available: newBalance.toFixed(2)
            });
          }

          // Deduct commission for opening reverse position
          newBalance = newBalance - reverseCommission;

          // Insert the reverse opening trade
          await client.query(
            `INSERT INTO trades 
             (bot_id, symbol, action, signal_price, execution_price, contracts, position_size, commission, pnl, balance_after, timestamp, trade_type) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [bot_id, symbol, action, signalPrice, executionPrice, contractsReversing, position_size, reverseCommission, 0, newBalance, timestamp, reverseTradeType]
          );

          console.log(`🔄 Position reversed: Closed ${contractsClosing}, Opened ${contractsReversing} ${reverseTradeType}`);
        }

      } else {
        // ADDING TO POSITION (same direction) - not supported
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Adding to positions not supported',
          current_position: netPosition,
          suggestion: 'Close current position first or reverse it'
        });
      }
    }

    // Update bot balance
    await client.query(
      'UPDATE bots SET current_balance = $1 WHERE id = $2',
      [newBalance, bot_id]
    );

    await client.query('COMMIT');

    const executionTime = Date.now() - startTime;
    logResponse = JSON.stringify({
      message: 'Futures trade executed successfully',
      trade_type: tradeType,
      execution_time_ms: executionTime
    });

    // Log successful webhook
    await client.query(
      `INSERT INTO webhook_logs (bot_id, status, request_body, response_body, error_message) 
       VALUES ($1, $2, $3, $4, $5)`,
      [bot_id, 'success', JSON.stringify(webhookData), logResponse, null]
    );

    console.log(`✅ FUTURES trade executed for bot ${bot_id}:`, {
      symbol,
      tradeType,
      action,
      signalPrice: signalPrice.toFixed(2),
      executionPrice: executionPrice.toFixed(2),
      contracts,
      pnl: pnl.toFixed(2),
      oldBalance: currentBalance.toFixed(2),
      newBalance: newBalance.toFixed(2)
    });

    res.status(201).json({
      message: 'Futures trade executed successfully',
      trade_type: tradeType,
      action,
      symbol,
      signal_price: signalPrice.toFixed(2),
      execution_price: executionPrice.toFixed(2),
      contracts,
      pnl: pnl.toFixed(2),
      balance: newBalance.toFixed(2)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    logStatus = 'error';
    logError = error.message || 'Unknown error';
    logResponse = JSON.stringify({ error: 'Failed to process webhook', details: error.message });
    
    // Log failed webhook
    try {
      await client.query(
        `INSERT INTO webhook_logs (bot_id, status, request_body, response_body, error_message) 
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.bot_id, logStatus, JSON.stringify(req.body), logResponse, logError]
      );
      await client.query('COMMIT');
    } catch (logErr) {
      console.error('Failed to log webhook error:', logErr);
    }
    
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook', details: error.message });
  } finally {
    client.release();
  }
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});
