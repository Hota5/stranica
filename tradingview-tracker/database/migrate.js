require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tradingview_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Create bots table with slippage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bots (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        webhook_url TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        starting_balance DECIMAL(20, 8) DEFAULT 0,
        current_balance DECIMAL(20, 8) DEFAULT 0,
        commission_rate DECIMAL(10, 6) DEFAULT 0.0005,
        slippage_percent DECIMAL(10, 6) DEFAULT 0.001
      )
    `);
    console.log('✓ Bots table created');

    // Create trades table with signal_price and execution_price
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell')),
        signal_price DECIMAL(20, 8) NOT NULL,
        execution_price DECIMAL(20, 8) NOT NULL,
        contracts DECIMAL(20, 8) NOT NULL,
        position_size DECIMAL(20, 8) NOT NULL,
        commission DECIMAL(20, 8) DEFAULT 0,
        pnl DECIMAL(20, 8) DEFAULT 0,
        balance_after DECIMAL(20, 8) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Trades table created');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_bot_id ON trades(bot_id);
      CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_action ON trades(action);
    `);
    console.log('✓ Indexes created');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nRealistic Trading Features:');
    console.log('  • Signal Price: What TradingView sent');
    console.log('  • Execution Price: What you actually got (with slippage)');
    console.log('  • Slippage: Default 0.1% (configurable per bot)');
    console.log('  • Commission: Default 0.05% per trade (Pionex rate)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
