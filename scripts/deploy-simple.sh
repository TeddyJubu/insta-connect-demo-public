#!/usr/bin/env bash

# Simple Deployment Script
# Run this and enter your password when prompted

PROD_SERVER="root@147.93.112.223"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying Frontend to Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Server: $PROD_SERVER"
echo "Password: WMz84eLJcEHqA8S#"
echo ""
echo "You'll be prompted for the password 3 times (once per step)"
echo ""
read -p "Press Enter to start deployment..."
echo ""

# Step 1: Build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/3: Building Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER 'bash -s' << 'ENDSSH'
set -e
cd /root/insta-connect-demo
echo "📥 Pulling latest code..."
git pull origin main || git fetch origin && git reset --hard origin/main
cd frontend
echo "📝 Creating .env.production..."
echo "BACKEND_URL=http://localhost:3000
NODE_ENV=production" > .env.production
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps
echo "🔨 Building..."
npm run build
echo "✅ Build complete!"
ENDSSH

echo ""
echo "✅ Step 1 Complete"
echo ""
read -p "Press Enter for Step 2..."
echo ""

# Step 2: Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/3: Creating Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER 'bash -s' << 'ENDSSH'
set -e
echo "📝 Creating systemd service..."
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
systemctl daemon-reload
systemctl enable insta-connect-frontend
systemctl stop insta-connect-frontend 2>/dev/null || true
systemctl start insta-connect-frontend
sleep 2
systemctl status insta-connect-frontend --no-pager | head -15
echo "✅ Service started!"
ENDSSH

echo ""
echo "✅ Step 2 Complete"
echo ""
read -p "Press Enter for Step 3..."
echo ""

# Step 3: Nginx
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/3: Configuring Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -t $PROD_SERVER 'bash -s' << 'ENDSSH'
set -e
echo "💾 Backing up config..."
cp /etc/nginx/sites-available/insta-connect /etc/nginx/sites-available/insta-connect.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
echo "📝 Creating Nginx config..."
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

    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF
nginx -t
systemctl reload nginx
echo "✅ Nginx configured!"
ENDSSH

echo ""
echo "✅ Step 3 Complete"
echo ""

# Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Testing endpoints..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com)
echo "HTTPS: HTTP $HTTP_CODE"

HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com/health)
echo "Health: HTTP $HEALTH_CODE"

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🌐 Visit: https://insta.tiblings.com"
echo "📊 Logs: ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -f'"
echo ""

