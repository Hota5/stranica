# TradingView Webhook Tracker

A full-stack **automatic paper trading tracker** for TradingView crypto signals. Track your bot performance in real-time with zero manual work - webhooks automatically execute virtual trades, calculate P&L, and show beautiful performance analytics.

![TradingView Tracker](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-18+-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

## ✨ Features

### 🎯 Realistic Forward Testing (NOT just backtesting!)
- **Slippage Simulation** - Execution prices worse than signal prices
  - BUY: Pay 0.1-0.3% MORE than TradingView signal
  - SELL: Get 0.1-0.3% LESS than TradingView signal
- **Configurable Commission** - Match your exchange (0.05% default for Pionex)
- **Signal vs Execution Tracking** - See exactly what slippage cost you
- **Realistic P&L** - Accounts for real market conditions
- **No Perfect Fills** - Unlike backtesting, this shows what you'd ACTUALLY get

### 🤖 Fully Automatic Paper Trading
- **Zero Manual Work** - Set initial balance, get webhooks, view results
- **Auto Trade Execution** - Webhooks trigger virtual buy/sell automatically  
- **Real-time Balance Tracking** - See your balance grow (or shrink) in real-time
- **Automatic P&L Calculation** - Matches buys with sells, calculates profit/loss
- **Insufficient Balance Protection** - Won't execute if you don't have funds

### Backend
- 📊 **REST API** - Receive and process TradingView webhooks
- 💾 **PostgreSQL Database** - Store bots and trade history
- 🔐 **JWT Authentication** - Secure access with token-based auth
- 📈 **Smart Matching** - Pairs buy/sell orders for accurate P&L
- 🔒 **Security** - Rate limiting, CORS, SQL injection prevention
- ⚡ **Instant Processing** - Webhooks execute trades in milliseconds

### Frontend
- 🎨 **Dark Mode UI** - AlphaInsider-inspired gradient design
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 📊 **Balance Charts** - Visualize portfolio growth over time
- 🤖 **Bot Management** - Create, view, and delete trading bots
- 💹 **Trade Timeline** - Complete history with buy/sell indicators
- 📋 **Copy Webhook URLs** - One-click copy for TradingView alerts
- 🎯 **Performance Metrics** - Return %, win rate, total P&L

### Trading Features
- 🎯 **Multiple Strategies** - Track unlimited bots/strategies simultaneously
- 💰 **Virtual Balance** - Starts with your chosen amount (e.g., $1000)
- 📊 **Return Tracking** - See percentage gain/loss from starting balance
- 📈 **Win Rate Analysis** - Track winning vs losing trades
- 🔄 **Multi-Symbol Support** - Trade BTC, ETH, SOL, any symbol
- 📝 **Trade Details** - Price, contracts, commission, balance after each trade

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### How It Works

1. **Create a Bot** - Set a name and starting balance (e.g., $1000)
2. **Get Webhook URL** - System generates unique URL for this bot
3. **Configure TradingView** - Add webhook to your strategy alerts
4. **Automatic Trading** - Webhooks trigger virtual trades instantly:
   - **BUY**: Deducts price × contracts + commission from balance
   - **SELL**: Adds proceeds, matches with previous buy, calculates P&L
5. **Watch Performance** - Real-time charts show balance growth
6. **Analyze Results** - Win rate, total return %, trade history

**Example Flow (with realistic slippage):**
```
Starting Balance: $1,000
Slippage: 0.1% | Commission: 0.05%
↓
TradingView Signal: BUY 0.02 BTC @ $50,000
Execution Price: $50,050 (0.1% worse due to slippage)
Cost: $1,001 + $0.50 fee
Balance: -$1.50 (over-spent slightly)
↓  
TradingView Signal: SELL 0.02 BTC @ $55,000
Execution Price: $54,945 (0.1% worse due to slippage)
Revenue: $1,098.90 - $0.55 fee
Balance: $1,096.85
↓
Net Profit: $96.85 (not $100 like backtesting would show!)
Return: +9.69%
```

**vs Perfect Backtesting:**
```
Buy @ $50,000, Sell @ $55,000
Profit: $100
Return: +10%
```

**Difference:** Realistic testing shows 0.31% less profit due to slippage + fees!

### Local Development

1. **Clone the repository**

```bash
git clone <repository-url>
cd tradingview-tracker
```

2. **Setup Database**

```bash
# Create PostgreSQL database
createdb tradingview_tracker

# Run migrations
cd database
npm install
node migrate.js
```

3. **Setup Backend**

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Start backend
npm run dev
```

4. **Setup Frontend**

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your API URL

# Start frontend
npm start
```

5. **Open browser**

Navigate to `http://localhost:3000`

Default credentials: `admin` / `admin123` (change in `.env`)

## 🐳 Docker Deployment

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🌐 Production Deployment (DigitalOcean)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to DigitalOcean with:
- Ubuntu 22.04 server setup
- PostgreSQL configuration
- Nginx reverse proxy
- Let's Encrypt SSL certificates
- PM2 process management
- Security hardening

## 📡 TradingView Webhook Setup

1. **Create a Bot**
   - Login to the tracker
   - Click "New Bot"
   - Enter bot name and starting balance
   - Copy the generated webhook URL

2. **Configure TradingView Alert**
   - Create alert in TradingView
   - Go to "Notifications" tab
   - Enable "Webhook URL"
   - Paste your bot's webhook URL

3. **Set Webhook Message**

Use this JSON format in your alert message:

```json
{
  "data": {
    "action": "{{strategy.order.action}}",
    "contracts": "{{strategy.order.contracts}}",
    "position_size": "{{strategy.position_size}}"
  },
  "price": "{{close}}",
  "signal_param": "{}",
  "signal_type": "{{strategy.order.id}}",
  "symbol": "{{ticker}}",
  "time": "{{time}}"
}
```

**Action values**: `buy` or `sell`

4. **Track Trades**
   - Webhooks are automatically received and stored
   - View trades in bot detail page
   - Edit actual execution prices after manual fills on Pionex

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password

### Bots
- `GET /api/bots` - Get all bots with stats
- `GET /api/bots/:id` - Get single bot with trades
- `POST /api/bots` - Create new bot
- `PUT /api/bots/:id` - Update bot
- `DELETE /api/bots/:id` - Delete bot

### Trades
- `PUT /api/trades/:id` - Update trade actual price

### Webhooks
- `POST /webhook/:bot_id` - Receive TradingView webhook

## 🗄️ Database Schema

### Bots Table
```sql
id                UUID PRIMARY KEY
name              VARCHAR(255)
webhook_url       TEXT UNIQUE
created_at        TIMESTAMP
starting_balance  DECIMAL(20, 8)
current_balance   DECIMAL(20, 8)
commission_rate   DECIMAL(10, 6)  -- Default: 0.0005 (0.05%)
slippage_percent  DECIMAL(10, 6)  -- Default: 0.001 (0.1%)
```

### Trades Table
```sql
id              SERIAL PRIMARY KEY
bot_id          UUID (references bots)
symbol          VARCHAR(50)
action          VARCHAR(10) (buy/sell)
signal_price    DECIMAL(20, 8)     -- TradingView signal
execution_price DECIMAL(20, 8)     -- Actual fill (with slippage)
contracts       DECIMAL(20, 8)
position_size   DECIMAL(20, 8)
commission      DECIMAL(20, 8)
pnl             DECIMAL(20, 8)
balance_after   DECIMAL(20, 8)
timestamp       TIMESTAMP
created_at      TIMESTAMP
```

**Key Difference from Backtesting:**
- `signal_price` = What TradingView sent
- `execution_price` = What you actually got (signal ± slippage)
- P&L calculated using `execution_price`, not `signal_price`

## 🔒 Security Features

- **JWT Authentication** - Secure token-based sessions
- **Password Hashing** - bcrypt for credential storage
- **Rate Limiting** - Prevent webhook spam (100/min per IP)
- **CORS Protection** - Configured for frontend domain only
- **SQL Injection Prevention** - Parameterized queries
- **HTTPS Only** - SSL/TLS in production
- **Helmet.js** - Security headers
- **Environment Variables** - Sensitive data not in code

## 🛠️ Technology Stack

### Backend
- Node.js 18+
- Express.js
- PostgreSQL 15+
- JWT (jsonwebtoken)
- bcrypt
- pg (node-postgres)
- helmet, cors, express-rate-limit

### Frontend
- React 18
- React Router v6
- Axios
- Recharts (charts)
- React Icons
- date-fns

### DevOps
- Docker & Docker Compose
- Nginx (reverse proxy)
- PM2 (process manager)
- Let's Encrypt (SSL)

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
API_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tradingview_tracker
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-domain.com
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 🐛 Known Issues / Limitations

- No real-time WebSocket updates (page refresh to see new trades)
- Single user authentication (no multi-user support)
- PnL calculation assumes FIFO for matching buy/sell pairs
- No position sizing rules (trades use exact webhook amounts)

## 🗺️ Roadmap

- [ ] WebSocket support for real-time trade updates
- [ ] Multi-user authentication and separate portfolios
- [ ] Email/Telegram notifications for trades
- [ ] Advanced filtering and search
- [ ] Export trades to CSV
- [ ] Position sizing rules (% of balance, max drawdown)
- [ ] Stop-loss and take-profit simulation
- [ ] Mobile app (React Native)
- [ ] Backtesting on historical data

## 📚 Complete Documentation

- **START_HERE.md** - Quick start guide
- **REALISTIC_TESTING.md** - ⭐ **Understanding slippage & realistic forward testing**
- **TRADINGVIEW_SETUP.md** - Webhook configuration
- **DEPLOYMENT.md** - Production deployment guide
- **README.md** - This file (features & tech stack)

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Check deployment documentation
- Review logs for error messages

## 🙏 Acknowledgments

- Inspired by AlphaInsider's UI design
- Built for crypto traders using TradingView and Pionex
- Community feedback and contributions

---

**Happy Trading! 🚀📈**

Made with ❤️ for the crypto trading community
