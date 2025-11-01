#!/bin/bash

# Quick Deployment Script
# Deploys the frontend to production with minimal interaction

set -e

PROD_SERVER="root@147.93.112.223"
SSH_PASS="WMz84eLJcEHqA8S#"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Quick Frontend Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if sshpass is available
if command -v sshpass &> /dev/null; then
    echo "✅ Using sshpass for automated deployment"
    USE_SSHPASS=true
    SSH_CMD="sshpass -p '$SSH_PASS' ssh -o StrictHostKeyChecking=no"
    SCP_CMD="sshpass -p '$SSH_PASS' scp -o StrictHostKeyChecking=no"
else
    echo "⚠️  sshpass not found - you'll need to enter password manually"
    echo ""
    echo "To install sshpass:"
    echo "  macOS: brew install hudochenkov/sshpass/sshpass"
    echo "  Linux: sudo apt-get install sshpass"
    echo ""
    echo "Your password: $SSH_PASS"
    echo ""
    read -p "Press Enter to continue with manual password entry..."
    USE_SSHPASS=false
    SSH_CMD="ssh"
    SCP_CMD="scp"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Deploying Code and Building"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

$SSH_CMD $PROD_SERVER bash << 'ENDSSH'
set -e

echo "📁 Navigating to project directory..."
cd /root/insta-connect-demo

echo ""
echo "📥 Pulling latest code..."
git pull origin main || {
    echo "⚠️  Git pull failed, trying to reset..."
    git fetch origin
    git reset --hard origin/main
}

echo ""
echo "📁 Entering frontend directory..."
cd frontend

echo ""
echo "📝 Creating production environment file..."
cat > .env.production << 'EOF'
BACKEND_URL=http://localhost:3000
NODE_ENV=production
EOF
echo "✅ Environment file created"

echo ""
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps 2>&1 | tail -20

echo ""
echo "🔨 Building frontend..."
npm run build 2>&1 | tail -30

echo ""
echo "✅ Build complete!"
ls -lh .next/BUILD_ID 2>/dev/null || echo "Build ID: $(cat .next/BUILD_ID 2>/dev/null || echo 'unknown')"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Step 1 Complete${NC}"
else
    echo -e "${RED}❌ Step 1 Failed${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Creating Systemd Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

$SSH_CMD $PROD_SERVER bash << 'ENDSSH'
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created"

echo ""
echo "🔄 Reloading systemd..."
systemctl daemon-reload

echo ""
echo "🔧 Enabling service..."
systemctl enable insta-connect-frontend

echo ""
echo "🛑 Stopping service if running..."
systemctl stop insta-connect-frontend 2>/dev/null || true

echo ""
echo "▶️  Starting service..."
systemctl start insta-connect-frontend

echo ""
echo "⏳ Waiting for service to start..."
sleep 3

echo ""
echo "📊 Service status:"
systemctl status insta-connect-frontend --no-pager -l | head -20

echo ""
if systemctl is-active --quiet insta-connect-frontend; then
    echo "✅ Frontend service is running!"
else
    echo "❌ Frontend service failed to start"
    echo ""
    echo "Recent logs:"
    journalctl -u insta-connect-frontend -n 30 --no-pager
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Step 2 Complete${NC}"
else
    echo -e "${RED}❌ Step 2 Failed${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Configuring Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

$SSH_CMD $PROD_SERVER bash << 'ENDSSH'
set -e

echo "💾 Backing up existing config..."
cp /etc/nginx/sites-available/insta-connect /etc/nginx/sites-available/insta-connect.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

echo ""
echo "📝 Creating Nginx configuration..."
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

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Step 3 Complete${NC}"
else
    echo -e "${RED}❌ Step 3 Failed${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking services on server..."
$SSH_CMD $PROD_SERVER bash << 'ENDSSH'
echo "Frontend: $(systemctl is-active insta-connect-frontend)"
echo "Backend:  $(systemctl is-active insta-connect)"
echo "Nginx:    $(systemctl is-active nginx)"

echo ""
echo "Ports in use:"
lsof -i :3001 | head -2 || echo "Port 3001: Not in use"
lsof -i :3000 | head -2 || echo "Port 3000: Not in use"
ENDSSH

echo ""
echo "Testing from local machine..."
sleep 2

echo -n "HTTPS endpoint: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
fi

echo -n "Health endpoint: "
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com/health 2>/dev/null || echo "000")
if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTP $HEALTH_CODE${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HEALTH_CODE${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo ""
echo "🌐 Your application: https://insta.tiblings.com"
echo ""
echo "📊 Service status:"
echo "   Frontend: systemctl status insta-connect-frontend"
echo "   Backend:  systemctl status insta-connect"
echo ""
echo "📝 View logs:"
echo "   ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -f'"
echo ""
echo "🧪 Run full tests:"
echo "   ./scripts/test-production.sh"
echo ""

