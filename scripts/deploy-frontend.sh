#!/bin/bash

# Deploy Frontend to Production
# Deploys the Next.js frontend to the production server

set -e

echo "🚀 Deploying Frontend to Production..."
echo ""

# Configuration
PROD_SERVER="root@147.93.112.223"
PROD_PATH="/root/insta-connect-demo"
FRONTEND_PATH="$PROD_PATH/frontend"

# Step 1: Build frontend locally
echo "1️⃣  Building frontend locally..."
cd frontend
npm run build
cd ..
echo "   ✅ Frontend built successfully"
echo ""

# Step 2: Create .env.production on server
echo "2️⃣  Creating production environment file..."
ssh $PROD_SERVER << 'EOF'
cd /root/insta-connect-demo/frontend
cat > .env.production << 'ENVEOF'
BACKEND_URL=http://localhost:3000
NODE_ENV=production
ENVEOF
echo "   ✅ Environment file created"
EOF
echo ""

# Step 3: Sync frontend files to server
echo "3️⃣  Syncing frontend files to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env.local' \
  frontend/ $PROD_SERVER:$FRONTEND_PATH/
echo "   ✅ Files synced"
echo ""

# Step 4: Install dependencies and build on server
echo "4️⃣  Installing dependencies and building on server..."
ssh $PROD_SERVER << 'EOF'
cd /root/insta-connect-demo/frontend
npm install --production=false
npm run build
echo "   ✅ Dependencies installed and built"
EOF
echo ""

# Step 5: Create systemd service for Next.js
echo "5️⃣  Creating systemd service..."
ssh $PROD_SERVER << 'EOF'
cat > /etc/systemd/system/insta-connect-frontend.service << 'SERVICEEOF'
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
SERVICEEOF

systemctl daemon-reload
systemctl enable insta-connect-frontend
systemctl restart insta-connect-frontend
echo "   ✅ Systemd service created and started"
EOF
echo ""

# Step 6: Update Nginx configuration
echo "6️⃣  Updating Nginx configuration..."
ssh $PROD_SERVER << 'EOF'
# Backup existing config
cp /etc/nginx/sites-available/insta-connect /etc/nginx/sites-available/insta-connect.backup

# Update Nginx config to proxy to Next.js
cat > /etc/nginx/sites-available/insta-connect << 'NGINXEOF'
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

    # Express backend API (proxied through Next.js)
    # Next.js will handle the rewrites to backend

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
NGINXEOF

# Test and reload Nginx
nginx -t && systemctl reload nginx
echo "   ✅ Nginx configuration updated"
EOF
echo ""

# Step 7: Check service status
echo "7️⃣  Checking service status..."
ssh $PROD_SERVER << 'EOF'
echo "Frontend service status:"
systemctl status insta-connect-frontend --no-pager | head -10
echo ""
echo "Backend service status:"
systemctl status insta-connect --no-pager | head -10
EOF
echo ""

echo "✅ Frontend deployment complete!"
echo ""
echo "🌐 Access your application at: https://insta.tiblings.com"
echo ""
echo "📊 Check logs:"
echo "   Frontend: ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -f'"
echo "   Backend:  ssh $PROD_SERVER 'journalctl -u insta-connect -f'"
echo ""

