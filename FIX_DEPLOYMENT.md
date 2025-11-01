# Fix Deployment Issues

## Current Status

✅ Site is accessible at https://insta.tiblings.com
⚠️  Serving old static HTML instead of Next.js app
⚠️  Backend service not responding on port 3000
⚠️  Frontend service not responding on port 3001

---

## Quick Fix Commands

SSH into the server and run these commands:

```bash
ssh root@147.93.112.223
```

**Password:** `WMz84eLJcEHqA8S#`

---

### Step 1: Check Service Status

```bash
# Check all services
systemctl status insta-connect
systemctl status insta-connect-frontend
systemctl status nginx

# Check what's on the ports
lsof -i :3000
lsof -i :3001
```

---

### Step 2: Start Backend Service

```bash
# Start backend if not running
systemctl start insta-connect

# Check status
systemctl status insta-connect

# If it fails, check logs
journalctl -u insta-connect -n 50
```

---

### Step 3: Start Frontend Service

```bash
# Navigate to frontend
cd /root/insta-connect-demo/frontend

# Check if build exists
ls -la .next/

# If no build, rebuild
npm run build

# Start the service
systemctl start insta-connect-frontend

# Check status
systemctl status insta-connect-frontend

# If it fails, check logs
journalctl -u insta-connect-frontend -n 50
```

---

### Step 4: Fix Nginx Configuration

The issue might be that Nginx is serving static files from `public/` instead of proxying to Next.js.

```bash
# Check current Nginx config
cat /etc/nginx/sites-available/insta-connect

# Update Nginx config to proxy to Next.js
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

    # Next.js frontend (proxy ALL requests to Next.js)
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
}
EOF

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

### Step 5: Verify Everything

```bash
# Check services
systemctl status insta-connect insta-connect-frontend nginx --no-pager

# Check ports
echo "Port 3000 (Backend):"
lsof -i :3000 | head -2

echo "Port 3001 (Frontend):"
lsof -i :3001 | head -2

# Test locally
curl -I http://localhost:3001
curl -I http://localhost:3000/health

# Exit
exit
```

---

## Alternative: Restart Everything

If the above doesn't work, try restarting all services:

```bash
ssh root@147.93.112.223

# Restart all services
systemctl restart insta-connect
systemctl restart insta-connect-frontend
systemctl restart nginx

# Wait a moment
sleep 3

# Check status
systemctl status insta-connect insta-connect-frontend nginx --no-pager

# Check logs
journalctl -u insta-connect -n 20
journalctl -u insta-connect-frontend -n 20

exit
```

---

## Common Issues

### Issue 1: Backend not starting

**Check logs:**
```bash
journalctl -u insta-connect -n 50
```

**Common causes:**
- Database not running: `systemctl status postgresql`
- Missing environment variables: `cat /root/insta-connect-demo/.env`
- Port already in use: `lsof -i :3000`

**Fix:**
```bash
cd /root/insta-connect-demo
doppler run -- node server.js
# If this works, then restart the service
systemctl restart insta-connect
```

---

### Issue 2: Frontend not starting

**Check logs:**
```bash
journalctl -u insta-connect-frontend -n 50
```

**Common causes:**
- Build failed: Missing `.next/` directory
- Node modules missing
- Port already in use: `lsof -i :3001`

**Fix:**
```bash
cd /root/insta-connect-demo/frontend
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
systemctl restart insta-connect-frontend
```

---

### Issue 3: Nginx serving wrong content

**Check config:**
```bash
cat /etc/nginx/sites-available/insta-connect
nginx -t
```

**Fix:**
- Make sure there's NO `root` directive pointing to `/root/insta-connect-demo/public`
- Make sure location `/` proxies to `http://localhost:3001`
- Reload: `systemctl reload nginx`

---

## Quick One-Liner Fix

Try this all-in-one command:

```bash
ssh root@147.93.112.223 'systemctl restart insta-connect insta-connect-frontend nginx && sleep 3 && systemctl status insta-connect insta-connect-frontend nginx --no-pager && curl -I http://localhost:3001'
```

**Password:** `WMz84eLJcEHqA8S#`

---

## After Fixing

Test from your local machine:

```bash
# Test the site
curl -I https://insta.tiblings.com

# Should see Next.js content
curl -s https://insta.tiblings.com | grep -i next

# Run full tests
./scripts/check-deployment.sh
```

---

**Let me know what you find and I'll help you fix it!**

