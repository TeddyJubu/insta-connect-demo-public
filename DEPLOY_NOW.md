# Deploy Frontend NOW - Quick Guide

## Option 1: Run the Interactive Script (Recommended)

The script is already running in your terminal. Just:

1. **Press Enter** when prompted
2. **Enter password** when asked: `WMz84eLJcEHqA8S#`
3. **Press Enter** after each step completes
4. Done!

---

## Option 2: Manual Commands (Copy & Paste)

If the script doesn't work, run these commands manually:

### Step 1: SSH into Server

```bash
ssh root@147.93.112.223
```

**Password:** `WMz84eLJcEHqA8S#`

---

### Step 2: Run All Deployment Commands

Once logged in, copy and paste this entire block:

```bash
# Navigate to project
cd /root/insta-connect-demo

# Pull latest code
git pull origin main || (git fetch origin && git reset --hard origin/main)

# Go to frontend
cd frontend

# Create production environment
cat > .env.production << 'EOF'
BACKEND_URL=http://localhost:3000
NODE_ENV=production
EOF

# Install dependencies
npm install --legacy-peer-deps

# Build frontend
npm run build

# Create systemd service
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

# Start service
systemctl daemon-reload
systemctl enable insta-connect-frontend
systemctl stop insta-connect-frontend 2>/dev/null || true
systemctl start insta-connect-frontend

# Check service status
systemctl status insta-connect-frontend

# Update Nginx configuration
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

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Verify everything is running
echo ""
echo "=== Service Status ==="
systemctl status insta-connect-frontend --no-pager | head -10
systemctl status insta-connect --no-pager | head -10

echo ""
echo "=== Ports ==="
lsof -i :3001 | head -2
lsof -i :3000 | head -2

echo ""
echo "✅ Deployment complete!"
echo "Exit and test: https://insta.tiblings.com"

# Exit SSH
exit
```

---

### Step 3: Test from Your Local Machine

After exiting SSH, run:

```bash
# Test HTTPS
curl -I https://insta.tiblings.com

# Test health
curl https://insta.tiblings.com/health

# Run full test suite
./scripts/test-production.sh

# Open in browser
open https://insta.tiblings.com
```

---

## Option 3: One-Line Deployment

If you want to do it all in one command from your local machine:

```bash
ssh root@147.93.112.223 'cd /root/insta-connect-demo && git pull origin main && cd frontend && echo "BACKEND_URL=http://localhost:3000
NODE_ENV=production" > .env.production && npm install --legacy-peer-deps && npm run build && cat > /etc/systemd/system/insta-connect-frontend.service << "EOF"
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
systemctl daemon-reload && systemctl enable insta-connect-frontend && systemctl restart insta-connect-frontend && cat > /etc/nginx/sites-available/insta-connect << "EOF2"
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
        proxy_set_header Connection "upgrade";
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
EOF2
nginx -t && systemctl reload nginx && systemctl status insta-connect-frontend --no-pager'
```

**Password:** `WMz84eLJcEHqA8S#`

---

## Troubleshooting

### If build fails:
```bash
ssh root@147.93.112.223
cd /root/insta-connect-demo/frontend
rm -rf node_modules .next
npm install --legacy-peer-deps
npm run build
```

### If service won't start:
```bash
ssh root@147.93.112.223
journalctl -u insta-connect-frontend -n 50
systemctl restart insta-connect-frontend
```

### If Nginx fails:
```bash
ssh root@147.93.112.223
nginx -t
tail -f /var/log/nginx/error.log
```

---

## After Deployment

1. **Test the site:** https://insta.tiblings.com
2. **Check logs:** `ssh root@147.93.112.223 'journalctl -u insta-connect-frontend -f'`
3. **Run tests:** `./scripts/test-production.sh`

---

## Quick Status Check

```bash
ssh root@147.93.112.223 'systemctl status insta-connect-frontend insta-connect nginx --no-pager'
```

---

**Choose the option that works best for you and let me know the results!**

