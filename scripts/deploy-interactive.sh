#!/bin/bash

# Interactive Frontend Deployment Script
# This script will guide you through the deployment process

set -e

PROD_SERVER="root@147.93.112.223"
DOMAIN="insta.tiblings.com"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Interactive Frontend Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will deploy the Next.js frontend to production."
echo "You will be prompted for your SSH password when needed."
echo ""
echo "Server: $PROD_SERVER"
echo "Domain: https://$DOMAIN"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Step 1: Pull latest code and build on server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Pulling latest code and building frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER << 'ENDSSH'
set -e
cd /root/insta-connect-demo

echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "📁 Navigating to frontend directory..."
cd frontend

echo ""
echo "📝 Creating production environment file..."
cat > .env.production << 'EOF'
BACKEND_URL=http://localhost:3000
NODE_ENV=production
EOF

echo "✅ Environment file created"
cat .env.production

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building frontend..."
npm run build

echo ""
echo "✅ Frontend built successfully!"
ENDSSH

echo ""
echo -e "${GREEN}✅ Step 1 Complete${NC}"
echo ""
read -p "Press Enter to continue to Step 2..."
echo ""

# Step 2: Create systemd service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Creating systemd service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER << 'ENDSSH'
set -e

echo "📝 Creating systemd service file..."
cat > /etc/systemd/system/insta-connect-frontend.service << 'EOF'
[Unit]
Description=Instagram Connect Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/insta-connect-demo/frontend
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created"

echo ""
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

echo ""
echo "🔧 Enabling service..."
systemctl enable insta-connect-frontend

echo ""
echo "▶️  Starting service..."
systemctl start insta-connect-frontend

echo ""
echo "📊 Service status:"
systemctl status insta-connect-frontend --no-pager | head -15

echo ""
echo "✅ Frontend service is running!"
ENDSSH

echo ""
echo -e "${GREEN}✅ Step 2 Complete${NC}"
echo ""
read -p "Press Enter to continue to Step 3..."
echo ""

# Step 3: Update Nginx configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Updating Nginx configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER << 'ENDSSH'
set -e

echo "💾 Backing up existing Nginx config..."
cp /etc/nginx/sites-available/insta-connect /etc/nginx/sites-available/insta-connect.backup.$(date +%Y%m%d_%H%M%S) || true

echo ""
echo "📝 Creating new Nginx configuration..."
cat > /etc/nginx/sites-available/insta-connect << 'EOF'
server {
    listen 80;
    server_name insta.tiblings.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name insta.tiblings.com;

    ssl_certificate /etc/letsencrypt/live/insta.tiblings.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/insta.tiblings.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Next.js frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook endpoint (direct to Express)
    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

echo "✅ Nginx configuration created"

echo ""
echo "🧪 Testing Nginx configuration..."
nginx -t

echo ""
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "✅ Nginx reloaded successfully!"
ENDSSH

echo ""
echo -e "${GREEN}✅ Step 3 Complete${NC}"
echo ""
read -p "Press Enter to continue to verification..."
echo ""

# Step 4: Verify deployment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Verifying deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER << 'ENDSSH'
set -e

echo "📊 Checking service status..."
echo ""
echo "Frontend service:"
systemctl status insta-connect-frontend --no-pager | head -10

echo ""
echo "Backend service:"
systemctl status insta-connect --no-pager | head -10

echo ""
echo "Nginx service:"
systemctl status nginx --no-pager | head -10

echo ""
echo "🔌 Checking ports..."
echo "Port 3001 (Frontend):"
lsof -i :3001 | head -5 || echo "No process on port 3001"

echo ""
echo "Port 3000 (Backend):"
lsof -i :3000 | head -5 || echo "No process on port 3000"

echo ""
echo "📝 Recent frontend logs:"
journalctl -u insta-connect-frontend -n 10 --no-pager

echo ""
echo "✅ Server-side verification complete!"
ENDSSH

echo ""
echo -e "${GREEN}✅ Step 4 Complete${NC}"
echo ""

# Step 5: Test from local machine
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Testing from local machine"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Running production tests..."
echo ""

if [ -f "./scripts/test-production.sh" ]; then
    ./scripts/test-production.sh
else
    echo "⚠️  Test script not found, running manual tests..."
    
    echo -n "Testing HTTPS... "
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
    
    echo -n "Testing Health... "
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" | grep -q "200"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo ""
echo "🌐 Your application is now live at:"
echo "   https://$DOMAIN"
echo ""
echo "📊 Next steps:"
echo "   1. Open https://$DOMAIN in your browser"
echo "   2. Test registration and login"
echo "   3. Test Instagram OAuth connection"
echo "   4. Check webhook dashboard"
echo ""
echo "📝 Monitoring commands:"
echo "   Frontend logs: ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -f'"
echo "   Backend logs:  ssh $PROD_SERVER 'journalctl -u insta-connect -f'"
echo ""

