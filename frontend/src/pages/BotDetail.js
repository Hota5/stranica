import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bots } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiCopy, FiCheck, FiTrash2 } from 'react-icons/fi';

function BotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [chartView, setChartView] = useState('all');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSlippage, setEditSlippage] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editStartingBalance, setEditStartingBalance] = useState('');

  useEffect(() => {
    loadBot();
  }, [id]);

  const loadBot = async () => {
    try {
      const response = await bots.getById(id);
      setBot(response.data);
      // Set edit form values
      setEditName(response.data.name);
      setEditSlippage((response.data.slippage_percent * 100).toFixed(2));
      setEditCommission((response.data.commission_rate * 100).toFixed(2));
      setEditStartingBalance(response.data.starting_balance.toString());
    } catch (error) {
      console.error('Failed to load bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(bot.webhook_url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = bot.webhook_url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await bots.update(id, {
        name: editName,
        slippage_percent: parseFloat(editSlippage),
        commission_rate: parseFloat(editCommission),
        starting_balance: parseFloat(editStartingBalance)
      });
      setShowEditModal(false);
      loadBot(); // Reload to show updated values
    } catch (error) {
      console.error('Failed to update bot:', error);
      alert('Failed to update settings');
    }
  };

  const handleDeleteBot = async () => {
    try {
      await bots.delete(id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete bot:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getChartData = () => {
    if (!bot?.stats?.balance_history || bot.stats.balance_history.length === 0) return [];
    
    const now = new Date();
    let cutoffTime;
    
    switch(chartView) {
      case 'hour':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(0); // Show all
    }
    
    return bot.stats.balance_history
      .filter(item => {
        const itemDate = new Date(item.timestamp);
        return !isNaN(itemDate.getTime()) && itemDate >= cutoffTime;
      })
      .map((item, index) => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });
        
        return {
          index: index + 1,
          time: timeStr,
          timestamp: date.getTime(),
          balance: item.balance,
          action: item.action,
          pnl: item.pnl || 0
        };
      });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading bot details...</p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Bot not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>{bot.name}</h1>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              ← Dashboard
            </button>
            <button className="btn btn-primary btn-small" onClick={() => setShowEditModal(true)}>
              ⚙️ Settings
            </button>
            <button className="btn btn-danger btn-small" onClick={() => setShowDeleteModal(true)}>
              <FiTrash2 /> Delete Bot
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Webhook URL */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Webhook URL</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Use this URL in your TradingView alerts. Trades will be automatically tracked!
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            <input
              type="text"
              value={bot.webhook_url}
              readOnly
              style={{ 
                flex: 1, 
                padding: '0.8rem', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '6px',
                color: '#9ca3af'
              }}
            />
            <button 
              className={`copy-button ${copiedWebhook ? 'copied' : ''}`}
              onClick={copyWebhookUrl}
            >
              {copiedWebhook ? <FiCheck /> : <FiCopy />}
              {copiedWebhook ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-item">
            <div className="stat-label">Current Balance</div>
            <div className="stat-value">{formatCurrency(bot.current_balance)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Return</div>
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
            <div className="stat-value">{bot.stats.win_rate.toFixed(1)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Trades</div>
            <div className="stat-value">{bot.stats.total_trades}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Completed Trades</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>
              <span style={{ color: '#10b981' }}>{bot.stats.winning_trades}</span>
              {' / '}
              <span style={{ color: '#ef4444' }}>{bot.stats.losing_trades}</span>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3>Balance Over Time</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { label: 'All', value: 'all' },
                { label: '1 Hour', value: 'hour' },
                { label: '1 Day', value: 'day' },
                { label: '1 Week', value: 'week' },
                { label: '1 Month', value: 'month' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`btn btn-small ${chartView === option.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartView(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {getChartData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.2)" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1f3a', 
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => {
                    if (name === 'balance') return formatCurrency(value);
                    if (name === 'pnl') return formatCurrency(value);
                    return value;
                  }}
                  labelFormatter={(label) => `Trade: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#667eea" 
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.action || payload.action === 'start') return null;
                    const color = payload.action === 'buy' ? '#10b981' : '#ef4444';
                    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              No trade data yet. Waiting for TradingView webhooks...
            </p>
          )}
        </div>

        {/* Trades Timeline */}
        <div className="card">
          <h3>Trade History</h3>
          <div className="trades-timeline">
            {bot.trades.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                No trades recorded yet. Configure your TradingView alert to start tracking!
              </p>
            ) : (
              bot.trades.map(trade => {
                const tradeType = trade.trade_type || (trade.action === 'buy' ? 'BUY' : 'SELL');
                const isOpening = tradeType.includes('OPEN');
                const isLong = tradeType.includes('LONG');
                const isShort = tradeType.includes('SHORT');
                
                let emoji = '📊';
                let typeColor = '#667eea';
                
                if (tradeType === 'OPEN LONG') {
                  emoji = '📈';
                  typeColor = '#10b981';
                } else if (tradeType === 'CLOSE LONG') {
                  emoji = '🔒';
                  typeColor = '#10b981';
                } else if (tradeType === 'OPEN SHORT') {
                  emoji = '📉';
                  typeColor = '#ef4444';
                } else if (tradeType === 'CLOSE SHORT') {
                  emoji = '🔓';
                  typeColor = '#ef4444';
                }

                return (
                  <div key={trade.id} className={`trade-card ${trade.action}`}>
                    <div className="trade-info">
                      <h4 style={{ color: typeColor }}>
                        {emoji} {tradeType} {trade.symbol}
                      </h4>
                      <div className="trade-details">
                        <span>
                          Signal: {formatCurrency(trade.signal_price)}
                        </span>
                        <span style={{ 
                          color: trade.action === 'buy' ? '#ef4444' : '#10b981',
                          fontWeight: '600' 
                        }}>
                          Filled: {formatCurrency(trade.execution_price)}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                          Slippage: {formatCurrency(Math.abs(trade.execution_price - trade.signal_price))}
                        </span>
                        <span>Contracts: {trade.contracts}</span>
                        <span>Fee: {formatCurrency(trade.commission)}</span>
                        {!isOpening && trade.pnl !== undefined && (
                          <span style={{ 
                            fontWeight: '700',
                            color: trade.pnl >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            P&L: {formatCurrency(trade.pnl)}
                          </span>
                        )}
                        <span>Balance: {formatCurrency(trade.balance_after)}</span>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Settings Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>⚙️ Bot Settings</h3>
            
            <div className="form-group">
              <label>Bot Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Starting Balance ($)</label>
              <input
                type="number"
                step="0.01"
                value={editStartingBalance}
                onChange={(e) => setEditStartingBalance(e.target.value)}
              />
              <small style={{ color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>
                Change this to see "what if" scenarios with different capital
              </small>
            </div>

            <div className="form-group">
              <label>Slippage (%)</label>
              <input
                type="number"
                step="0.01"
                value={editSlippage}
                onChange={(e) => setEditSlippage(e.target.value)}
              />
              <small style={{ color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>
                How much worse than signal price you get filled
              </small>
            </div>

            <div className="form-group">
              <label>Commission Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={editCommission}
                onChange={(e) => setEditCommission(e.target.value)}
              />
              <small style={{ color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>
                Fee per trade (Pionex: 0.05%, Binance: 0.1%)
              </small>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSaveSettings}>
                Save Changes
              </button>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
            </div>

            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#9ca3af'
            }}>
              <p><strong style={{ color: '#ef4444' }}>⚠️ Note:</strong></p>
              <p style={{ marginTop: '0.5rem' }}>
                Changing <strong>starting balance</strong> will recalculate your return % and P&L, 
                but won't affect your actual trade history or current balance.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                This is useful for "what if" analysis - e.g., "what if I started with $500 instead of $100?"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Bot</h3>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
              Are you sure you want to delete "{bot.name}"? This will permanently delete all {bot.stats.total_trades} trades.
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleDeleteBot}>
                Delete Permanently
              </button>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BotDetail;
