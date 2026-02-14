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
      const totalPnl = parseFloat(bot.total_pnl) || 0;
      const currentBalance = parseFloat(bot.current_balance);
      const startingBalance = parseFloat(bot.starting_balance);
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
    let totalPnl = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    const dailyBalance = {};
    const dailyPnl = {};

    trades.forEach(trade => {
      const pnl = parseFloat(trade.pnl) || 0;
      const date = new Date(trade.timestamp).toISOString().split('T')[0];
      
      if (trade.action === 'sell') {
        totalPnl += pnl;
        
        if (pnl > 0) winningTrades++;
        else if (pnl < 0) losingTrades++;

        // Daily PnL
        dailyPnl[date] = (dailyPnl[date] || 0) + pnl;
      }

      // Track balance after each trade
      dailyBalance[date] = parseFloat(trade.balance_after);
    });

    // Convert to array for chart
    const balanceHistory = Object.keys(dailyBalance)
      .sort()
      .map(date => ({
        date,
        balance: dailyBalance[date],
        pnl: dailyPnl[date] || 0
      }));

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const currentBalance = parseFloat(bot.current_balance);
    const startingBalance = parseFloat(bot.starting_balance);
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
        balance_after: parseFloat(t.balance_after)
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
  
  try {
    const { bot_id } = req.params;
    const webhookData = req.body;

    await client.query('BEGIN');

    // Verify bot exists
    const botResult = await client.query('SELECT * FROM bots WHERE id = $1', [bot_id]);
    if (botResult.rows.length === 0) {
      await client.query('ROLLBACK');
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

    if (!action || !signalPrice || !symbol) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields: action, price, symbol' });
    }

    // REALISTIC EXECUTION: Apply slippage to simulate real market conditions
    const slippagePercent = parseFloat(bot.slippage_percent);
    let executionPrice;
    
    if (action === 'buy') {
      // BUY: You pay MORE than the signal price (slippage against you)
      executionPrice = signalPrice * (1 + slippagePercent);
    } else if (action === 'sell') {
      // SELL: You get LESS than the signal price (slippage against you)
      executionPrice = signalPrice * (1 - slippagePercent);
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid action: must be buy or sell' });
    }

    // Calculate trade value with realistic execution price
    const tradeValue = contracts * executionPrice;
    const commission = tradeValue * parseFloat(bot.commission_rate);

    // Get current balance
    const balanceResult = await client.query(
      'SELECT current_balance FROM bots WHERE id = $1',
      [bot_id]
    );
    let currentBalance = parseFloat(balanceResult.rows[0].current_balance);

    // Execute virtual trade
    let newBalance = currentBalance;
    let pnl = 0;

    if (action === 'buy') {
      // BUY: Deduct cost + commission
      const totalCost = tradeValue + commission;
      
      if (totalCost > currentBalance) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Insufficient balance',
          required: totalCost.toFixed(2),
          available: currentBalance.toFixed(2)
        });
      }
      
      newBalance = currentBalance - totalCost;
      
      // Insert trade
      await client.query(
        `INSERT INTO trades 
         (bot_id, symbol, action, signal_price, execution_price, contracts, position_size, commission, balance_after, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [bot_id, symbol, action, signalPrice, executionPrice, contracts, position_size, commission, newBalance, timestamp]
      );

    } else if (action === 'sell') {
      // SELL: Find matching buy to calculate PnL
      const buyResult = await client.query(
        `SELECT * FROM trades 
         WHERE bot_id = $1 AND symbol = $2 AND action = 'buy' AND contracts > 0
         ORDER BY timestamp DESC LIMIT 1`,
        [bot_id, symbol]
      );

      if (buyResult.rows.length > 0) {
        const buyTrade = buyResult.rows[0];
        const buyExecutionPrice = parseFloat(buyTrade.execution_price);
        
        // Calculate profit/loss using EXECUTION prices (not signal prices)
        const buyCommission = parseFloat(buyTrade.commission);
        const sellRevenue = executionPrice * contracts;
        const buyCost = buyExecutionPrice * contracts;
        
        pnl = sellRevenue - buyCost - commission - buyCommission;
        newBalance = currentBalance + sellRevenue - commission;
      } else {
        // No matching buy, just add sell proceeds (shouldn't happen in real trading)
        newBalance = currentBalance + (contracts * executionPrice) - commission;
        pnl = 0;
      }

      // Insert trade
      await client.query(
        `INSERT INTO trades 
         (bot_id, symbol, action, signal_price, execution_price, contracts, position_size, commission, pnl, balance_after, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [bot_id, symbol, action, signalPrice, executionPrice, contracts, position_size, commission, pnl, newBalance, timestamp]
      );
    }

    // Update bot balance
    await client.query(
      'UPDATE bots SET current_balance = $1 WHERE id = $2',
      [newBalance, bot_id]
    );

    await client.query('COMMIT');

    const slippagePct = (slippagePercent * 100).toFixed(2);

    console.log(`✅ Realistic trade executed for bot ${bot_id}:`, {
      symbol,
      action,
      signalPrice: signalPrice.toFixed(2),
      executionPrice: executionPrice.toFixed(2),
      slippage: `${slippagePct}%`,
      contracts,
      commission: commission.toFixed(2),
      pnl: pnl.toFixed(2),
      newBalance: newBalance.toFixed(2)
    });

    res.status(201).json({
      message: 'Virtual trade executed with realistic slippage',
      action,
      symbol,
      signal_price: signalPrice.toFixed(2),
      execution_price: executionPrice.toFixed(2),
      slippage_applied: `${slippagePct}%`,
      contracts,
      commission: commission.toFixed(2),
      pnl: pnl.toFixed(2),
      balance: newBalance.toFixed(2)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
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
