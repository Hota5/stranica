# 🚀 QUICK START GUIDE

## 🎯 What is This?

This is an **automatic paper trading tracker** for TradingView. It simulates trades based on your TradingView strategy signals and shows you how your portfolio would perform - **completely hands-free**!

### How It Works:
1. You create a bot with a starting balance (e.g., $1000 virtual money)
2. You connect your TradingView strategy to the bot's webhook
3. When TradingView triggers a signal → **trade executes automatically**
4. System tracks your virtual balance in real-time
5. You see beautiful charts showing if you'd be profitable

**No real money. No manual work. Just automatic tracking and analysis!**

Think of it like AlphaInsider or a paper trading simulator - but for YOUR TradingView strategies.

## 📁 What You Got

```
tradingview-tracker/
├── backend/              # Node.js/Express API
├── frontend/             # React web app
├── database/             # PostgreSQL migrations
├── deployment/           # Nginx configs
├── README.md             # Full documentation
├── DEPLOYMENT.md         # DigitalOcean deployment guide
├── TRADINGVIEW_SETUP.md  # TradingView webhook guide
└── setup.sh              # Automated setup script
```

## ⚡ Choose Your Path

### 🏠 Option 1: Local Development (Easiest)

1. **Prerequisites**: Install Node.js 18+ and PostgreSQL 15+

2. **Run the setup script**:
   ```bash
   cd tradingview-tracker
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Start the app**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

4. **Open**: http://localhost:3000
   - Username: `admin`
   - Password: `admin123`

### 🐳 Option 2: Docker (Quick Deploy)

1. **Install Docker** and Docker Compose

2. **Configure**:
   ```bash
   cd tradingview-tracker
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start**:
   ```bash
   docker-compose up -d
   ```

4. **Open**: http://localhost

### ☁️ Option 3: DigitalOcean Production (Full Deploy)

Follow the detailed guide in `DEPLOYMENT.md` for:
- Ubuntu server setup
- Domain configuration
- SSL certificates
- Production deployment

## 📋 Next Steps

1. **Create Your First Bot**
   - Login to the dashboard
   - Click "New Bot"
   - Copy the webhook URL

2. **Setup TradingView**
   - Follow `TRADINGVIEW_SETUP.md`
   - Configure alerts
   - Paste webhook URL

3. **Start Trading**
   - Webhooks auto-record trades
   - View performance in dashboard
   - Edit actual execution prices

## 🔐 Security Notes

⚠️ **BEFORE DEPLOYING TO PRODUCTION**:

1. Change admin credentials in `.env`:
   ```env
   ADMIN_USERNAME=your_username
   ADMIN_PASSWORD=your_secure_password
   ```

2. Generate new JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Use strong PostgreSQL password

4. Enable HTTPS (included in deployment guide)

## 📚 Documentation

- **README.md** - Full features and tech stack
- **DEPLOYMENT.md** - Production deployment guide
- **TRADINGVIEW_SETUP.md** - Webhook configuration
- **Backend API** - Check `backend/server.js` for endpoints

## 🆘 Need Help?

**Common Issues**:

1. **Database connection failed**
   - Check PostgreSQL is running
   - Verify credentials in `.env`

2. **Webhooks not working**
   - Must use HTTPS in production
   - Check webhook URL is correct
   - Verify JSON format

3. **Frontend won't start**
   - Run `npm install` in frontend folder
   - Check `.env` has correct API URL

**Check Logs**:
```bash
# Backend logs
pm2 logs tradingview-backend

# Nginx logs
tail -f /var/log/nginx/error.log

# Database
sudo -u postgres psql -c "SELECT version();"
```

## 🎯 Features Overview

✅ **100% Automatic Paper Trading** - Zero manual work
✅ Multi-bot tracking (test different strategies)
✅ Real-time virtual balance tracking
✅ Automatic P&L calculation with commission (0.05%)
✅ Win rate and performance analytics
✅ Trade timeline (see every buy/sell)
✅ Balance growth charts
✅ Dark mode UI (AlphaInsider style)
✅ Copy webhook URLs
✅ Secure authentication
✅ Works with ANY symbol (BTC, ETH, stocks, whatever TradingView supports)

## 💡 Pro Tips

1. **Test First**: Create a test bot before using real strategies
2. **Monitor Regularly**: Check dashboard to see how your strategy performs
3. **Try Multiple Strategies**: Compare different bots to see what works best
4. **Use Realistic Amounts**: Start with amounts you'd actually trade ($500-$5000)
5. **Learn From Losses**: Losing trades show you what needs improvement

## 📖 Real Example

**You create a bot: "Bitcoin Scalper"**
- Starting Balance: $1,000

**TradingView triggers BUY signal:**
- Webhook received: BUY 0.02 BTC @ $50,000
- System automatically: Deducts $1,000.50 (including 0.05% commission)
- New Balance: $0 (all-in on BTC)

**Price goes up, TradingView triggers SELL signal:**
- Webhook received: SELL 0.02 BTC @ $55,000
- System automatically: 
  - Sells for $1,100
  - Matches with previous buy
  - Calculates P&L: +$99.45 (after commissions)
  - Updates balance: $1,099.45

**You check dashboard:**
- See green line going up on chart 📈
- Win Rate: 100% (1 winning trade)
- Total Return: +9.95%
- Trade History shows both buy and sell

**All automatic. You did nothing except watch!**

## 🚀 Ready to Trade?

1. Run setup script OR use Docker
2. Create a bot
3. Configure TradingView alert
4. Start tracking trades!

**Default Login**: admin / admin123 (CHANGE THIS!)

---

Made with ❤️ for crypto traders

Questions? Check the README.md or deployment docs!
