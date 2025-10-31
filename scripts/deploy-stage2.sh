#!/bin/bash

# Stage 2 Production Deployment Script
# This script deploys database, authentication, and token refresh to production

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "🚀 Stage 2 Production Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
VPS_HOST="root@147.93.112.223"
PROJECT_DIR="/root/insta-connect-demo"
DOPPLER_PROJECT="insta-connect-demo"
DOPPLER_CONFIG="dev_insta"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v ssh &> /dev/null; then
    error "SSH not found. Please install SSH client."
    exit 1
fi
info "SSH client found"

if ! command -v doppler &> /dev/null; then
    warn "Doppler CLI not found. You'll need to configure secrets manually."
else
    info "Doppler CLI found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 1: Install PostgreSQL on VPS"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Install PostgreSQL on VPS? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing PostgreSQL..."
    ssh $VPS_HOST << 'ENDSSH'
        set -e
        echo "Updating package list..."
        apt update
        
        echo "Installing PostgreSQL..."
        apt install -y postgresql postgresql-contrib
        
        echo "Enabling PostgreSQL..."
        systemctl enable postgresql
        systemctl start postgresql
        
        echo "PostgreSQL status:"
        systemctl status postgresql --no-pager
ENDSSH
    info "PostgreSQL installed"
else
    warn "Skipping PostgreSQL installation"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 2: Create Database and User"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Create database and user? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please enter a secure password for the database user:"
    read -s DB_PASSWORD
    echo ""
    
    echo "Creating database and user..."
    ssh $VPS_HOST << ENDSSH
        set -e
        sudo -u postgres psql << 'EOF'
CREATE DATABASE insta_connect_demo;
CREATE USER insta_app WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE insta_connect_demo TO insta_app;
\c insta_connect_demo
GRANT ALL ON SCHEMA public TO insta_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insta_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO insta_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO insta_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO insta_app;
EOF
ENDSSH
    info "Database and user created"
    
    # Save password for later
    export DB_PASSWORD
else
    warn "Skipping database creation"
    echo "Please enter the database password for Doppler configuration:"
    read -s DB_PASSWORD
    export DB_PASSWORD
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 3: Configure Doppler Secrets"
echo "═══════════════════════════════════════════════════════════"
echo ""

if command -v doppler &> /dev/null; then
    read -p "Add database credentials to Doppler? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Configuring Doppler secrets..."
        
        # Generate SESSION_SECRET
        SESSION_SECRET=$(openssl rand -hex 32)
        
        doppler secrets set DB_HOST localhost --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        doppler secrets set DB_PORT 5432 --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        doppler secrets set DB_NAME insta_connect_demo --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        doppler secrets set DB_USER insta_app --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        doppler secrets set DB_PASSWORD "$DB_PASSWORD" --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        doppler secrets set DB_SSL false --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        doppler secrets set SESSION_SECRET "$SESSION_SECRET" --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG
        
        info "Doppler secrets configured"
    fi
else
    warn "Doppler CLI not available. Please configure secrets manually:"
    echo "  DB_HOST=localhost"
    echo "  DB_PORT=5432"
    echo "  DB_NAME=insta_connect_demo"
    echo "  DB_USER=insta_app"
    echo "  DB_PASSWORD=$DB_PASSWORD"
    echo "  DB_SSL=false"
    echo "  SESSION_SECRET=$(openssl rand -hex 32)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 4: Deploy Application Code"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Deploy application code to VPS? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying code..."
    ssh $VPS_HOST << ENDSSH
        set -e
        cd $PROJECT_DIR
        
        echo "Pulling latest code..."
        git pull origin main
        
        echo "Installing dependencies..."
        npm install
        
        echo "Code deployed successfully"
ENDSSH
    info "Application code deployed"
else
    warn "Skipping code deployment"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 5: Run Database Migrations"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Run database migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migrations..."
    ssh $VPS_HOST << ENDSSH
        set -e
        cd $PROJECT_DIR
        doppler run -- node src/db/migrate.js
ENDSSH
    info "Migrations completed"
else
    warn "Skipping migrations"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 6: Deploy Token Refresh Service"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Deploy token refresh service? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying token refresh service..."
    ssh $VPS_HOST << ENDSSH
        set -e
        cd $PROJECT_DIR
        
        echo "Copying systemd service file..."
        cp deployment/token-refresh.service /etc/systemd/system/
        
        echo "Reloading systemd..."
        systemctl daemon-reload
        
        echo "Enabling and starting service..."
        systemctl enable token-refresh.service
        systemctl start token-refresh.service
        
        echo "Service status:"
        systemctl status token-refresh.service --no-pager
ENDSSH
    info "Token refresh service deployed"
else
    warn "Skipping token refresh service deployment"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 7: Restart Application Service"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Restart application service? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restarting application..."
    ssh $VPS_HOST << ENDSSH
        set -e
        systemctl restart insta-connect-demo.service
        
        echo "Service status:"
        systemctl status insta-connect-demo.service --no-pager
ENDSSH
    info "Application restarted"
else
    warn "Skipping application restart"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Test authentication at https://insta.tiblings.com"
echo "2. Create a test account and verify database persistence"
echo "3. Test OAuth flow and verify data is saved"
echo "4. Monitor services:"
echo "   - Application: systemctl status insta-connect-demo.service"
echo "   - Token Refresh: systemctl status token-refresh.service"
echo ""
echo "View logs:"
echo "   - Application: journalctl -u insta-connect-demo.service -f"
echo "   - Token Refresh: journalctl -u token-refresh.service -f"
echo ""
echo "For detailed instructions, see docs/PRODUCTION_DEPLOYMENT.md"
echo ""

