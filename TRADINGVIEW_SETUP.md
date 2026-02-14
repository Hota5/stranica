# TradingView Webhook Configuration Guide

This guide shows you how to configure TradingView alerts to automatically track paper trades in your tracker.

## Step 1: Create a Bot in the Tracker

1. Login to your TradingView Tracker dashboard
2. Click "New Bot"
3. Enter a name (e.g., "BTC Scalper", "ETH Long Strategy")
4. **Set your starting balance** (e.g., $1000) - this is your virtual capital
5. Click "Create Bot"
6. **Copy the webhook URL** - you'll need this for TradingView

## What Happens Next?

Once configured, the system works **100% automatically**:
- TradingView sends webhook when strategy triggers
- Tracker executes virtual trade instantly
- Balance updates automatically (deducts for buys, adds for sells)
- P&L calculated when you sell (matched with previous buy)
- Charts and stats update in real-time

**No manual work required!** Just watch your virtual portfolio grow (or learn from losses).

## Step 2: Create a TradingView Alert

1. Open TradingView and go to your chart
2. Create or select a strategy/indicator
3. Click the "Alert" button (clock icon) in the top toolbar
4. Configure your alert conditions

## Step 3: Configure Alert Notifications

1. Scroll to the "Notifications" section
2. **Enable "Webhook URL"**
3. Paste your bot's webhook URL from Step 1

## Step 4: Set the Webhook Message

In the "Message" field, use this exact JSON format:

### For Strategy Alerts (with order.action)

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

### For Indicator Alerts (manual buy/sell)

**For BUY signals:**
```json
{
  "data": {
    "action": "buy",
    "contracts": "0.1",
    "position_size": "1000"
  },
  "price": "{{close}}",
  "signal_param": "{}",
  "signal_type": "manual_buy",
  "symbol": "{{ticker}}",
  "time": "{{time}}"
}
```

**For SELL signals:**
```json
{
  "data": {
    "action": "sell",
    "contracts": "0.1",
    "position_size": "1000"
  },
  "price": "{{close}}",
  "signal_param": "{}",
  "signal_type": "manual_sell",
  "symbol": "{{ticker}}",
  "time": "{{time}}"
}
```

## Webhook Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| `action` | Trade direction | `"buy"` or `"sell"` |
| `contracts` | Number of contracts/coins | `"0.1"`, `"1.5"` |
| `position_size` | Total position value in USD | `"1000"`, `"5000"` |
| `price` | Current close price | `"50000.50"` |
| `symbol` | Trading pair | `"BTCUSDT"`, `"ETHUSDT"` |
| `time` | Timestamp of alert | `"2024-01-01T12:00:00Z"` |

## TradingView Placeholders

TradingView supports these dynamic placeholders:

### Strategy Placeholders
- `{{strategy.order.action}}` - "buy" or "sell"
- `{{strategy.order.contracts}}` - Number of contracts
- `{{strategy.position_size}}` - Current position size
- `{{strategy.order.id}}` - Order identifier

### General Placeholders
- `{{ticker}}` - Symbol (e.g., BTCUSDT)
- `{{close}}` - Close price
- `{{open}}` - Open price
- `{{high}}` - High price
- `{{low}}` - Low price
- `{{time}}` - Timestamp
- `{{volume}}` - Volume

## Step 5: Name and Create Alert

1. Give your alert a descriptive name
2. Set expiration (or leave open-ended)
3. Click "Create"

## Testing Your Webhook

### Method 1: Trigger Real Alert
- Wait for your strategy/indicator to trigger
- Check your tracker dashboard for new trade

### Method 2: Manual Test with curl

```bash
curl -X POST https://your-domain.com/webhook/YOUR_BOT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "action": "buy",
      "contracts": "0.1",
      "position_size": "1000"
    },
    "price": "50000",
    "symbol": "BTCUSDT",
    "time": "2024-01-01T12:00:00Z"
  }'
```

Replace:
- `your-domain.com` with your actual domain
- `YOUR_BOT_ID` with your bot's ID from the webhook URL

### Method 3: Use Postman/Insomnia

1. Create new POST request
2. URL: Your webhook URL
3. Headers: `Content-Type: application/json`
4. Body: Raw JSON (use example above)
5. Send request

## Troubleshooting

### Webhook not working?

1. **Check webhook URL**
   - Make sure you copied the entire URL correctly
   - URL should look like: `https://your-domain.com/webhook/abc-123-def`

2. **Verify JSON format**
   - Use a JSON validator (jsonlint.com)
   - Check for missing commas or quotes
   - Ensure proper nesting of objects

3. **Check TradingView alert**
   - Alert must be active (not expired)
   - Webhook notifications must be enabled
   - Message field must contain valid JSON

4. **Server issues**
   - Check if your server is running
   - Verify firewall allows HTTPS traffic
   - Check backend logs: `pm2 logs tradingview-backend`

5. **SSL Certificate**
   - TradingView requires HTTPS (not HTTP)
   - Ensure SSL certificate is valid
   - Test with `curl -v https://your-domain.com/health`

### Common Errors

**"Bot not found"**
- Double-check webhook URL matches a bot in your dashboard

**"Invalid JSON"**
- Validate your webhook message format
- Check for TradingView placeholder syntax errors

**"Rate limit exceeded"**
- Too many webhooks in short time
- Default limit: 100 per minute per IP

## Example Webhook Messages

### Simple Buy/Sell

```json
{
  "data": {
    "action": "buy",
    "contracts": "1",
    "position_size": "50000"
  },
  "price": "50000",
  "symbol": "BTCUSDT",
  "time": "{{time}}"
}
```

### With Strategy Data

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

## Best Practices

1. **Test First**: Always test webhooks before using real strategies
2. **Monitor Logs**: Check backend logs regularly for errors
3. **Backup Data**: Export trades regularly (coming soon)
4. **Update Prices**: Manually update actual execution prices for accurate PnL
5. **Secure Credentials**: Never share webhook URLs publicly
6. **Use HTTPS**: Always use SSL/TLS in production

## Multiple Bots for Different Strategies

You can create multiple bots for:
- Different trading pairs (BTC, ETH, etc.)
- Different strategies (scalping, swing trading, etc.)
- Different timeframes (1m, 5m, 1h, etc.)
- Testing vs Production

Each bot gets its own unique webhook URL.

## Next Steps

After setting up webhooks:

1. **Monitor Performance**: Check dashboard to see automatic trades
2. **Watch Balance Grow**: Charts update as trades execute
3. **Analyze Stats**: Review win rate, P&L, and trade history
4. **Optimize Strategy**: Use data to improve your TradingView strategy

## Example Trading Scenario

**Starting Balance**: $1,000

**Webhook 1 - BUY Signal**:
```json
{
  "data": {"action": "buy", "contracts": "0.02"},
  "price": "50000",
  "symbol": "BTCUSDT"
}
```
- System buys 0.02 BTC at $50,000 = $1,000
- Commission: $0.50 (0.05%)
- **New Balance**: $0 (spent all on BTC, -$0.50 commission)

**Webhook 2 - SELL Signal** (price went up!):
```json
{
  "data": {"action": "sell", "contracts": "0.02"},
  "price": "55000",
  "symbol": "BTCUSDT"
}
```
- System sells 0.02 BTC at $55,000 = $1,100
- Commission: $0.55 (0.05%)
- Finds matching buy at $50,000
- **P&L**: +$99.45 (after commissions)
- **New Balance**: $1,099.45
- **Return**: +9.95%

**Dashboard Shows**:
- ✅ 1 winning trade
- 📈 Balance chart trending up
- 💰 Total P&L: +$99.45
- 🎯 Win rate: 100%

All calculated automatically - no manual input needed!

---

**Need Help?**

- Check the main [README.md](README.md)
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for server issues
- Check backend logs for webhook errors: `pm2 logs tradingview-backend`
- Verify TradingView alert is active and firing

Happy (Paper) Trading! 🚀
