import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bots } from '../utils/api';

function Dashboard() {
  const [botList, setBotList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const response = await bots.getAll();
      setBotList(response.data);
    } catch (error) {
      console.error('Failed to load bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading bots...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>🤖 TradingView Tracker</h1>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => navigate('/new-bot')}>
              + New Bot
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {botList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
            <h2 style={{ marginBottom: '1rem' }}>No bots yet</h2>
            <p>Create your first bot to start tracking TradingView webhooks</p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => navigate('/new-bot')}
            >
              Create First Bot
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {botList.map((bot) => (
              <div 
                key={bot.id} 
                className="card" 
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/bots/${bot.id}`)}
              >
                <div className="card-header">
                  <h3>{bot.name}</h3>
                  <span style={{ 
                    background: 'rgba(102, 126, 234, 0.2)', 
                    color: '#667eea',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem'
                  }}>
                    {bot.stats.total_trades} trades
                  </span>
                </div>

                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div className="stat-item">
                    <div className="stat-label">Current Balance</div>
                    <div className="stat-value">
                      {formatCurrency(bot.current_balance)}
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Return</div>
                    <div className={`stat-value ${bot.stats.return_pct >= 0 ? 'positive' : 'negative'}`}>
                      {bot.stats.return_pct >= 0 ? '+' : ''}{bot.stats.return_pct.toFixed(2)}%
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Total P&L</div>
                    <div className={`stat-value ${bot.stats.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(bot.stats.total_pnl)}
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Win Rate</div>
                    <div className="stat-value">
                      {bot.stats.win_rate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                  <p>Trades: {bot.stats.completed_trades} completed ({bot.stats.winning_trades}W / {bot.stats.losing_trades}L)</p>
                  <p>Starting Balance: {formatCurrency(bot.starting_balance)}</p>
                  <p>Created: {new Date(bot.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
