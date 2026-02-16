# TradingView Tracker - DigitalOcean Deployment Guide

This guide will walk you through deploying the TradingView Webhook Tracker on a DigitalOcean droplet.

## Prerequisites

- DigitalOcean account
- Domain name (for SSL/HTTPS)
- Basic knowledge of SSH and Linux commands

## Step 1: Create a DigitalOcean Droplet

1. Log into DigitalOcean
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic (at least $12/month - 2GB RAM recommended)
   - **Data center**: Choose closest to your location
   - **Authentication**: SSH key (recommended) or password
   - **Hostname**: tradingview-tracker

3. Note your droplet's IP address

## Step 2: Point Your Domain to DigitalOcean

1. In your domain registrar, add an A record:
   - **Type**: A
   - **Host**: @ (or your subdomain)
   - **Value**: Your droplet's IP address
   - **TTL**: 3600

2. Optionally add a www subdomain:
   - **Type**: A
   - **Host**: www
   - **Value**: Your droplet's IP address

## Step 3: Initial Server Setup

SSH into your droplet:

```bash
ssh root@your-droplet-ip
```

Update system packages:

```bash
apt update && apt upgrade -y
```

## Step 4: Install Required Software

### Install Node.js 18:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
node -v  # Verify installation
npm -v
```

### Install PostgreSQL:

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### Install Nginx:

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### Install Certbot (for SSL):

```bash
apt install -y certbot python3-certbot-nginx
```

### Install PM2 (Process Manager):

```bash
npm install -g pm2
```

## Step 5: Setup PostgreSQL Database

Switch to postgres user:

```bash
sudo -u postgres psql
```

Create database and user:

```sql
CREATE DATABASE tradingview_tracker;
CREATE USER tracker_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE tradingview_tracker TO tracker_user;
\q
```

## Step 6: Upload Your Application

### Option A: Using Git (Recommended)

```bash
cd /var/www
git clone https://github.com/yourusername/tradingview-tracker.git
cd tradingview-tracker
```

### Option B: Using SCP

On your local machine:

```bash
scp -r tradingview-tracker root@your-droplet-ip:/var/www/
```

## Step 7: Configure Backend

```bash
cd /var/www/tradingview-tracker/backend
```

Create `.env` file:

```bash
nano .env
```

Add the following (replace with your actual values):

```env
NODE_ENV=production
PORT=5000
API_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tradingview_tracker
DB_USER=tracker_user
DB_PASSWORD=your_secure_password_here

# Authentication - CHANGE THESE!
JWT_SECRET=generate_a_random_32_character_string_here
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_admin_password
```

Install dependencies and run migrations:

```bash
npm install --production
node /var/www/tradingview-tracker/database/migrate.js
```

Start backend with PM2:

```bash
pm2 start server.js --name tradingview-backend
pm2 save
pm2 startup
```

## Step 8: Build and Deploy Frontend

```bash
cd /var/www/tradingview-tracker/frontend
```

Create `.env` file:

```bash
nano .env
```

Add:

```env
REACT_APP_API_URL=https://your-domain.com
```

Build the frontend:

```bash
npm install
npm run build
```

Move build files to nginx directory:

```bash
mkdir -p /var/www/tradingview-tracker-web
cp -r build/* /var/www/tradingview-tracker-web/
```

## Step 9: Configure Nginx

Create nginx config:

```bash
nano /etc/nginx/sites-available/tradingview-tracker
```

Paste the content from `deployment/nginx-reverse-proxy.conf`, replacing:
- `your-domain.com` with your actual domain
- `/var/www/tradingview-tracker` with `/var/www/tradingview-tracker-web`

Enable the site:

```bash
ln -s /etc/nginx/sites-available/tradingview-tracker /etc/nginx/sites-enabled/
```

Test nginx configuration:

```bash
nginx -t
```

If successful, reload nginx:

```bash
systemctl reload nginx
```

## Step 10: Setup SSL with Let's Encrypt

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (choose yes)

Test auto-renewal:

```bash
certbot renew --dry-run
```

## Step 11: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 12: Verify Deployment

1. Visit your domain: `https://your-domain.com`
2. You should see the login page
3. Login with your admin credentials
4. Create a test bot and verify webhook URL is generated

## Step 13: Monitor and Maintain

### View backend logs:

```bash
pm2 logs tradingview-backend
```

### Restart backend:

```bash
pm2 restart tradingview-backend
```

### View nginx logs:

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Check PM2 status:

```bash
pm2 status
pm2 monit
```

## Updating Your Application

```bash
cd /var/www/tradingview-tracker

# Backend update
cd backend
git pull  # or upload new files
npm install --production
pm2 restart tradingview-backend

# Frontend update
cd ../frontend
git pull  # or upload new files
npm install
npm run build
cp -r build/* /var/www/tradingview-tracker-web/
```

## Security Best Practices

1. **Use strong passwords** for database and admin account
2. **Regularly update** system packages: `apt update && apt upgrade`
3. **Monitor logs** for suspicious activity
4. **Backup database** regularly:
   ```bash
   pg_dump -U tracker_user tradingview_tracker > backup.sql
   ```
5. **Keep SSL certificates** updated (Certbot auto-renews)
6. **Use SSH keys** instead of passwords
7. **Consider** setting up fail2ban for additional security

## Troubleshooting

### Backend not starting:

```bash
pm2 logs tradingview-backend
# Check for database connection errors, missing environment variables
```

### Database connection failed:

```bash
sudo -u postgres psql -c "SELECT version();"
# Verify PostgreSQL is running
systemctl status postgresql
```

### Frontend shows blank page:

```bash
# Check nginx error logs
tail -f /var/log/nginx/error.log

# Verify build files exist
ls -la /var/www/tradingview-tracker-web/
```

### Webhooks not working:

1. Check firewall allows HTTPS
2. Verify webhook URL in bot settings
3. Check backend logs for incoming requests
4. Test with curl:
   ```bash
   curl -X POST https://your-domain.com/webhook/bot-id \
     -H "Content-Type: application/json" \
     -d '{"data":{"action":"buy","contracts":"1","position_size":"100"},"price":"50000","symbol":"BTCUSDT","time":"2024-01-01T00:00:00Z"}'
   ```

## Cost Estimate

- **Droplet**: $12-24/month (2-4GB RAM)
- **Domain**: $10-15/year
- **Total**: ~$15-30/month

## Support

If you encounter issues:
1. Check logs (`pm2 logs`, nginx logs)
2. Verify all environment variables are set correctly
3. Ensure database is running and accessible
4. Check firewall rules

---

**Congratulations!** Your TradingView Tracker is now deployed and ready to receive webhooks from TradingView alerts.
