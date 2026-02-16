# Webhook Logs Feature 📋

## 🎯 What Is This?

**Webhook Logs** let you see EXACTLY what TradingView is sending and how the tracker is responding!

Perfect for debugging when trades aren't showing up or something's wrong.

---

## 🔍 How to Use

### Step 1: Open Bot Detail
1. Click into any bot from dashboard
2. Click **📋 Webhook Logs** button (top right)

### Step 2: View Logs
You'll see the last 50 webhook attempts with:
- ✅ **SUCCESS** (green) - Trade executed
- ❌ **ERROR** (red) - Something went wrong

### Step 3: Expand Details
Click on any log to see:
- **📥 Request from TradingView** - What TradingView sent
- **📤 Response from Server** - What tracker replied
- **Error Message** - If something failed

---

## 📊 Example Logs

### ✅ Successful Trade
```
✅ SUCCESS
Feb 15, 2026, 7:30 PM

📥 Request from TradingView:
{
  "data": {
    "action": "buy",
    "contracts": "0.3",
    "position_size": "0.3"
  },
  "price": "335.00",
  "symbol": "XMRUSDT.P",
  "time": "2026-02-15T19:30:00Z"
}

📤 Response from Server:
{
  "message": "Futures trade executed successfully",
  "trade_type": "OPEN LONG",
  "execution_time_ms": 45
}
```

### ❌ Failed Trade
```
❌ ERROR
Feb 15, 2026, 7:25 PM

Error: Insufficient balance for margin

📥 Request from TradingView:
{
  "data": {
    "action": "buy",
    "contracts": "5.0",
    ...
  },
  ...
}

📤 Response from Server:
{
  "error": "Insufficient balance for position size",
  "required": "1675.00",
  "available": "98.51"
}
```

---

## 🚨 Common Errors & Fixes

### Error: "Bot not found"
**Cause:** Webhook URL doesn't match any bot
**Fix:** 
1. Copy webhook URL from bot detail page
2. Update TradingView alert with correct URL

---

### Error: "Insufficient balance"
**Cause:** Not enough money for the trade
**Fix:**
1. Check bot's current balance
2. Reduce position size in strategy
3. Or increase starting balance

---

### Error: "Missing required fields"
**Cause:** TradingView message is incomplete
**Fix:**
1. Check TradingView alert message format
2. Should be:
```json
{
  "data": {
    "action": "{{strategy.order.action}}",
    "contracts": "{{strategy.order.contracts}}",
    "position_size": "{{strategy.position_size}}"
  },
  "price": "{{close}}",
  "symbol": "{{ticker}}",
  "time": "{{timenow}}"
}
```

---

### Error: "No opening position found"
**Cause:** Trying to close a position that doesn't exist
**Fix:**
1. Check if position was already closed
2. Verify strategy is sending correct signals
3. Delete bot and create fresh one

---

### Error: Column "trade_type" does not exist
**Cause:** Database not migrated
**Fix:**
```bash
cd /var/www/tradingview-tracker/database
node migrate.js
pm2 restart tradingview-backend
```

---

## 🔧 Debugging Workflow

### Problem: Trades Not Showing Up

**Step 1:** Check Webhook Logs
- Any logs at all? → TradingView is sending signals ✓
- No logs? → TradingView alert not configured ❌

**Step 2:** Check Log Status
- All ✅ SUCCESS? → Trades should appear ✓
- Some ❌ ERROR? → Read error message

**Step 3:** Check Request Data
- Does it have `action`, `contracts`, `price`, `symbol`? ✓
- Missing fields? → Fix TradingView message ❌

**Step 4:** Check Response
- "trade executed successfully"? → Should be in trade history ✓
- Error message? → Follow fix above

---

## 🎯 Pro Tips

### Tip 1: Use Logs to Verify Setup
After creating a bot:
1. Trigger one test signal from TradingView
2. Check Webhook Logs immediately
3. If you see ✅ SUCCESS → Everything works!
4. If you see ❌ ERROR → Fix before real trading

### Tip 2: Compare with TradingView
When P&L seems wrong:
1. Open Webhook Logs
2. Expand request from problem trade
3. Compare `contracts` and `price` with TradingView
4. Helps find discrepancies

### Tip 3: Monitor in Real-Time
During active trading:
1. Keep Webhook Logs open
2. Click 🔄 Refresh after each signal
3. Catch errors immediately

### Tip 4: Check Timestamps
Logs show exact time webhook was received:
- If delayed by seconds → Normal network lag
- If delayed by minutes → TradingView alert issue

---

## 📋 Log Retention

- **Stored:** Last 50 webhooks per bot
- **Automatic:** Older logs deleted automatically
- **Reset:** Logs deleted when bot is deleted

---

## 🚀 Update to Get This Feature

```bash
cd /var/www/tradingview-tracker
git pull
cd database
node migrate.js
pm2 restart tradingview-backend
cd ../frontend
npm run build
cp -r build/* /var/www/tradingview-tracker-web/
```

---

## 🎉 Benefits

**Before Webhook Logs:**
```
Why isn't my trade showing up?
*checks server logs*
*checks TradingView*
*checks database*
*still confused*
```

**After Webhook Logs:**
```
Click "Webhook Logs"
See: "Error: Insufficient balance"
Fix: Increase balance
Done! ✅
```

**Debugging time:** Minutes → Seconds! 🚀

---

## 💡 Example Use Cases

### Use Case 1: New Bot Setup
```
1. Create bot
2. Set up TradingView alert
3. Send test signal
4. Check logs → ✅ SUCCESS
5. Confirmed working!
```

### Use Case 2: Missing Trades
```
1. Notice trade missing
2. Check Webhook Logs
3. See: ❌ "No opening position found"
4. Realize: Position was already closed
5. Understanding achieved!
```

### Use Case 3: Wrong P&L
```
1. P&L seems off
2. Check Webhook Logs
3. See: contracts = 0.6 (should be 0.3)
4. Check TradingView strategy
5. Find: Strategy sending wrong size
6. Fix strategy!
```

---

**Webhook Logs = Your debugging superpower!** 🦸‍♂️
