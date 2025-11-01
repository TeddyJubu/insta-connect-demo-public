# Frontend Deployment Guide

This guide walks you through deploying the Next.js frontend to production.

## Prerequisites

- SSH access to production server (147.93.112.223)
- Node.js and npm installed on production server
- Nginx configured with SSL

## Deployment Steps

### 1. Build Frontend Locally (Already Done ✅)

The frontend has been built successfully with the following output:
```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /dashboard
├ ○ /dashboard/webhooks
├ ○ /login
├ ○ /oauth/error
├ ○ /oauth/start
├ ○ /oauth/success
└ ○ /register
```

### 2. Deploy to Production Server

Run the deployment script:

```bash
./scripts/deploy-frontend.sh
```

**Note:** You'll be prompted for the SSH password for root@147.93.112.223

The script will:
1. ✅ Build frontend locally
2. Create production environment file on server
3. Sync frontend files to server
4. Install dependencies and build on server
5. Create systemd service for Next.js
6. Update Nginx configuration
7. Check service status

### 3. Manual Deployment (Alternative)

If the automated script doesn't work, follow these manual steps:

#### Step 1: SSH into the server
```bash
ssh root@147.93.112.223
```

#### Step 2: Navigate to project directory
```bash
cd /root/insta-connect-demo
```

#### Step 3: Pull latest changes
```bash
git pull origin main
```

#### Step 4: Create production environment file
```bash
cd frontend
cat > .env.production << 'EOF'
BACKEND_URL=http://localhost:3000
NODE_ENV=production
EOF
```

#### Step 5: Install dependencies and build
```bash
npm install
npm run build
```

#### Step 6: Create systemd service
```bash
sudo tee /etc/systemd/system/insta-connect-frontend.service > /dev/null << 'EOF'
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
```

#### Step 7: Enable and start the service
```bash
sudo systemctl daemon-reload
sudo systemctl enable insta-connect-frontend
sudo systemctl start insta-connect-frontend
```

#### Step 8: Check service status
```bash
sudo systemctl status insta-connect-frontend
```

#### Step 9: Update Nginx configuration
```bash
sudo tee /etc/nginx/sites-available/insta-connect > /dev/null << 'EOF'
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
```

#### Step 10: Test and reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Verify Deployment

#### Check services are running:
```bash
sudo systemctl status insta-connect-frontend
sudo systemctl status insta-connect
```

#### Check logs:
```bash
# Frontend logs
sudo journalctl -u insta-connect-frontend -f

# Backend logs
sudo journalctl -u insta-connect -f
```

#### Test the application:
```bash
# Test frontend
curl -I https://insta.tiblings.com

# Test backend health
curl https://insta.tiblings.com/health
```

### 5. Access the Application

Open your browser and navigate to:
```
https://insta.tiblings.com
```

You should see the new Next.js frontend with:
- ✅ Modern UI with animations
- ✅ Toast notifications
- ✅ Login/Register pages
- ✅ Dashboard with stats
- ✅ OAuth flow
- ✅ Webhook dashboard

## Troubleshooting

### Frontend service won't start
```bash
# Check logs
sudo journalctl -u insta-connect-frontend -n 50

# Check if port 3001 is in use
sudo lsof -i :3001

# Restart the service
sudo systemctl restart insta-connect-frontend
```

### Nginx errors
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Can't access the site
```bash
# Check firewall
sudo ufw status

# Check if services are running
sudo systemctl status insta-connect-frontend
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates
```

## Rollback

If something goes wrong, you can rollback to the old configuration:

```bash
# Stop frontend service
sudo systemctl stop insta-connect-frontend
sudo systemctl disable insta-connect-frontend

# Restore old Nginx config
sudo cp /etc/nginx/sites-available/insta-connect.backup /etc/nginx/sites-available/insta-connect
sudo nginx -t
sudo systemctl reload nginx
```

## Next Steps

After successful deployment:

1. **Test all features:**
   - Register a new account
   - Login
   - Connect Instagram account
   - View webhook events

2. **Monitor logs:**
   - Watch for any errors
   - Check performance

3. **Set up monitoring:**
   - Add uptime monitoring
   - Set up error alerts

4. **Optimize:**
   - Enable caching
   - Add CDN for static assets
   - Optimize images

## Support

If you encounter any issues, check:
- Frontend logs: `sudo journalctl -u insta-connect-frontend -f`
- Backend logs: `sudo journalctl -u insta-connect -f`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`

