# 🚀 Quick Update Guide

## ✅ One-Command Update

```bash
cd /var/www/tradingview-tracker
chmod +x update.sh
./update.sh
```

**That's it!** The script will:
- ✅ Pull latest code from git
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Restart backend
- ✅ Build & deploy frontend
- ✅ **Keep all your bots and data safe!**

---

## 🆕 What's New in This Update

### 🐛 Fixed Bugs
- ✅ **Fixed P&L Calculation** - Now shows correct total (was showing -$34.49, now shows real -$9.07)
- ✅ **Fixed Copy Webhook Button** - Actually copies to clipboard now
- ✅ **Futures Support** - Proper LONG/SHORT position tracking
- ✅ **FIFO Matching** - Correct position matching for P&L

### 🎨 New Features
- ✅ **Edit Bot Settings** - Change slippage, commission, starting balance AFTER creation
- ✅ **"What If" Analysis** - Adjust starting balance to see different scenarios
- ✅ **Colorful Favicon** - Purple/blue gradient chart icon (easy to spot in tabs)
- ✅ **Better Trade Display** - Shows OPEN SHORT, CLOSE LONG, etc.
- ✅ **Per-Trade Charts** - See balance after every single trade
- ✅ **Time Range Filters** - View by hour/day/week/month

---

## 📝 Step-by-Step Update

### 1. Backup Your .env Files (Optional but recommended)
```bash
cd /var/www/tradingview-tracker/backend
cp .env .env.backup
```

### 2. Update Your Git Repo

**On your local machine (where you have the new code):**
```bash
cd tradingview-tracker
git add .
git commit -m "Update with P&L fix and edit settings"
git push
```

**On your server:**
```bash
cd /var/www/tradingview-tracker
./update.sh
```

### 3. Verify It's Working
```bash
# Check backend logs
pm2 logs tradingview-backend --lines 20

# Test a webhook
curl http://localhost:5000/health
```

Visit your website and check:
- ✅ P&L shows correct value
- ✅ Copy webhook button works
- ✅ Settings button appears (⚙️ icon)
- ✅ Favicon shows in browser tab

---

## 🔧 Manual Update (if automated script fails)

### Backend
```bash
cd /var/www/tradingview-tracker
git pull
cd backend
npm install
pm2 restart tradingview-backend
```

### Database
```bash
cd /var/www/tradingview-tracker/database
npm install
node migrate.js
```

### Frontend
```bash
cd /var/www/tradingview-tracker/frontend
npm install
npm run build
cp -r build/* /var/www/tradingview-tracker-web/
```

---

## ⚙️ Using New Features

### Edit Bot Settings

1. Click into any bot
2. Click **⚙️ Settings** button (top right)
3. Change:
   - **Bot Name**
   - **Starting Balance** (for "what if" scenarios)
   - **Slippage %** (adjust based on pair liquidity)
   - **Commission Rate %** (match your exchange)
4. Click **Save Changes**

**Example Use Case:**
```
You started with $100 and are at $90 after trades.
Change starting balance to $1000 to see:
"If I had started with $1000, I'd now have $900"
This helps you decide if strategy is worth scaling up!
```

### Copy Webhook URL

1. Click into bot
2. Click **Copy** button next to webhook URL
3. Paste in TradingView alert

---

## 🛡️ Your Data is Safe

This update:
- ✅ **Keeps all existing bots**
- ✅ **Keeps all trade history**
- ✅ **Keeps your .env settings**
- ✅ **Only updates code and adds new features**

---

## 🚨 Troubleshooting

### Backend won't start
```bash
pm2 logs tradingview-backend --lines 50
```
Look for errors. Common fixes:
- Database connection issue → Check .env DB settings
- Port already in use → `pm2 delete tradingview-backend` then restart

### Frontend not updating
```bash
# Clear browser cache or hard refresh: Ctrl+Shift+R
# Verify build worked:
ls -la /var/www/tradingview-tracker-web/
```

### Copy button still doesn't work
- Clear browser cache
- Try different browser
- Check browser console for errors (F12)

---

## 📊 Verify P&L is Fixed

Before update:
```
Starting: $100
Current: $90.93
Showed P&L: -$34.49 ❌ (WRONG!)
```

After update:
```
Starting: $100
Current: $90.93
Shows P&L: -$9.07 ✅ (CORRECT!)
```

---

## 🎯 Next Steps

1. **Run the update**
2. **Test copy webhook button**
3. **Try editing a bot's settings**
4. **Adjust starting balance to see "what if" scenarios**
5. **Keep your bots running - no need to recreate them!**

---

**Questions?** Check the main README.md or server logs!

**Happy Trading!** 🚀📈
