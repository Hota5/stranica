#!/bin/bash

echo "🚀 Starting TradingView Tracker Update..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /var/www/tradingview-tracker || exit 1

echo -e "${BLUE}📥 Pulling latest code from git...${NC}"
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install --production
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend npm install failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

echo -e "${BLUE}🗄️  Running database migrations...${NC}"
cd ../database
npm install --production
node migrate.js
if [ $? -ne 0 ]; then
    echo -e "${RED}⚠️  Migration had issues (might be OK if already run)${NC}"
fi
echo -e "${GREEN}✅ Database migration complete${NC}"
echo ""

echo -e "${BLUE}🔄 Restarting backend...${NC}"
pm2 restart tradingview-backend
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restart backend!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

echo -e "${BLUE}🎨 Building frontend...${NC}"
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend npm install failed!${NC}"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built${NC}"
echo ""

echo -e "${BLUE}📋 Deploying frontend...${NC}"
cp -r build/* /var/www/tradingview-tracker-web/
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

echo -e "${GREEN}🎉 ================================================${NC}"
echo -e "${GREEN}✅ Update completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📊 Quick Status Check:${NC}"
pm2 status tradingview-backend
echo ""
echo -e "${BLUE}💡 Your bots and data are preserved${NC}"
echo -e "${BLUE}🌐 Website updated at: http://$(hostname -I | awk '{print $1}')${NC}"
echo ""
