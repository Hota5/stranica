#!/bin/bash

echo "========================================="
echo "TradingView Tracker - Setup Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Found $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✓ Found PostgreSQL $PG_VERSION${NC}"
else
    echo -e "${RED}✗ PostgreSQL not found${NC}"
    echo "Please install PostgreSQL 15+ from https://www.postgresql.org/"
    exit 1
fi

echo ""
echo "========================================="
echo "Database Setup"
echo "========================================="

# Database setup
read -p "PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "PostgreSQL password: " DB_PASSWORD
echo ""

read -p "Database name (default: tradingview_tracker): " DB_NAME
DB_NAME=${DB_NAME:-tradingview_tracker}

echo ""
echo "Creating database..."
PGPASSWORD=$DB_PASSWORD createdb -U $DB_USER $DB_NAME 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${YELLOW}! Database might already exist${NC}"
fi

echo ""
echo "========================================="
echo "Backend Setup"
echo "========================================="

cd backend

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Create backend .env
echo "Creating backend .env file..."
cat > .env << EOF
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Authentication (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
EOF

echo -e "${GREEN}✓ Backend .env created${NC}"

# Run migrations
echo "Running database migrations..."
cd ..
node database/migrate.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${RED}✗ Database migrations failed${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Frontend Setup"
echo "========================================="

cd frontend

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Create frontend .env
echo "Creating frontend .env file..."
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000
EOF

echo -e "${GREEN}✓ Frontend .env created${NC}"

cd ..

echo ""
echo "========================================="
echo "Setup Complete! 🎉"
echo "========================================="
echo ""
echo "To start the application:"
echo ""
echo -e "${GREEN}Terminal 1 (Backend):${NC}"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo -e "${GREEN}Terminal 2 (Frontend):${NC}"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "Then open http://localhost:3000"
echo ""
echo -e "${YELLOW}Default credentials:${NC}"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}⚠️  Remember to change the admin password in production!${NC}"
echo ""
