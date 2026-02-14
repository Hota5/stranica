import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bots } from '../utils/api';

function NewBot() {
  const [name, setName] = useState('');
  const [startingBalance, setStartingBalance] = useState('1000');
  const [commissionRate, setCommissionRate] = useState('0.05');
  const [slippagePercent, setSlippagePercent] = useState('0.1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await bots.create({
        name,
        starting_balance: parseFloat(startingBalance),
        commission_rate: parseFloat(commissionRate) / 100, // Convert to decimal
        slippage_percent: parseFloat(slippagePercent) / 100, // Convert to decimal
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>Create New Bot</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Bot Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., XMR Scalper, ENX Long"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Starting Balance (USD)</label>
              <input
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Commission Rate (% per trade)</label>
              <input
                type="number"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                required
              />
              <small style={{ color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>
                Pionex: 0.05% • Binance: 0.1% • Most CEX: 0.05-0.1%
              </small>
            </div>

            <div className="form-group">
              <label>Slippage (% worse than signal)</label>
              <input
                type="number"
                step="0.01"
                value={slippagePercent}
                onChange={(e) => setSlippagePercent(e.target.value)}
                required
              />
              <small style={{ color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>
                Recommended: 0.05-0.2% for liquid pairs, 0.2-0.5% for low volume
              </small>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? 'Creating...' : 'Create Bot'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => navigate('/')}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#9ca3af'
          }}>
            <p><strong style={{ color: '#667eea' }}>🎯 Realistic Forward Testing</strong></p>
            <p style={{ marginTop: '0.5rem' }}>
              This simulates REAL trading conditions:
            </p>
            <ul style={{ marginLeft: '1.2rem', marginTop: '0.5rem' }}>
              <li><strong>Signal Price:</strong> What TradingView sent</li>
              <li><strong>Execution Price:</strong> What you'd actually get (worse due to slippage)</li>
              <li><strong>Commission:</strong> Applied to every trade</li>
              <li><strong>Result:</strong> More realistic than backtesting!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewBot;
