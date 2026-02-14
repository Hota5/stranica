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

  useEffect(() => {
    loadBot();
  }, [id]);

  const loadBot = async () => {
    try {
      const response = await bots.getById(id);
      setBot(response.data);
    } catch (error) {
      console.error('Failed to load bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(bot.webhook_url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
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
    if (!bot?.stats?.balance_history) return [];
    return bot.stats.balance_history.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      balance: item.balance
    }));
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
          </div>
          
          {getChartData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.2)" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1f3a', 
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#667eea" 
                  strokeWidth={2}
                  dot={{ fill: '#667eea' }}
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
              bot.trades.map(trade => (
                <div key={trade.id} className={`trade-card ${trade.action}`}>
                  <div className="trade-info">
                    <h4>
                      {trade.action === 'buy' ? '📈 BUY' : '📉 SELL'} {trade.symbol}
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
                      {trade.action === 'sell' && (
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
              ))
            )}
          </div>
        </div>
      </div>

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
