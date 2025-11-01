# Frontend Deployment Checklist

Complete these steps to deploy the Next.js frontend to production.

## ✅ Pre-Deployment (Already Complete)

- [x] Frontend built locally (11 routes optimized)
- [x] TypeScript compilation successful
- [x] All tests passing
- [x] Production environment configured
- [x] Deployment scripts created

## 📋 Deployment Steps

### Step 1: SSH into Production Server

```bash
ssh root@147.93.112.223
```

**Expected:** You should be logged into the server.

---

### Step 2: Navigate to Project Directory

```bash
cd /root/insta-connect-demo
```

**Expected:** You should be in the project directory.

---

### Step 3: Pull Latest Changes

```bash
git pull origin main
```

**Expected:** You should see the latest frontend code pulled from GitHub.

---

### Step 4: Navigate to Frontend Directory

```bash
cd frontend
```

---

### Step 5: Create Production Environment File

```bash
cat > .env.production << 'EOF'
BACKEND_URL=http://localhost:3000
NODE_ENV=production
EOF
```

**Verify:**
```bash
cat .env.production
```

**Expected output:**
```
BACKEND_URL=http://localhost:3000
NODE_ENV=production
```

---

### Step 6: Install Dependencies

```bash
npm install
```

**Expected:** Dependencies should install without errors.

---

### Step 7: Build Frontend

```bash
npm run build
```

**Expected:** Build should complete successfully with output showing 11 routes.

---

### Step 8: Create Systemd Service

```bash
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
```

**Verify:**
```bash
cat /etc/systemd/system/insta-connect-frontend.service
```

---

### Step 9: Enable and Start Frontend Service

```bash
systemctl daemon-reload
systemctl enable insta-connect-frontend
systemctl start insta-connect-frontend
```

**Verify:**
```bash
systemctl status insta-connect-frontend
```

**Expected:** Service should be "active (running)" in green.

---

### Step 10: Check Frontend Logs

```bash
journalctl -u insta-connect-frontend -n 50
```

**Expected:** You should see Next.js starting on port 3001 without errors.

---

### Step 11: Test Frontend Locally on Server

```bash
curl -I http://localhost:3001
```

**Expected:** HTTP 200 or 307 response.

---

### Step 12: Update Nginx Configuration

```bash
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
```

---

### Step 13: Test Nginx Configuration

```bash
nginx -t
```

**Expected:** "syntax is ok" and "test is successful"

---

### Step 14: Reload Nginx

```bash
systemctl reload nginx
```

**Expected:** No errors.

---

### Step 15: Verify All Services Are Running

```bash
systemctl status insta-connect-frontend
systemctl status insta-connect
systemctl status nginx
```

**Expected:** All three services should be "active (running)".

---

### Step 16: Check Ports

```bash
lsof -i :3000  # Backend
lsof -i :3001  # Frontend
lsof -i :443   # Nginx HTTPS
```

**Expected:** All ports should show active processes.

---

### Step 17: Exit SSH

```bash
exit
```

---

## 🧪 Verification Steps (Run from Your Local Machine)

### Test 1: Check HTTPS Access

```bash
curl -I https://insta.tiblings.com
```

**Expected:** HTTP 200 or 307 response.

---

### Test 2: Check Health Endpoint

```bash
curl https://insta.tiblings.com/health
```

**Expected:** `{"status":"ok"}`

---

### Test 3: Check Auth Status

```bash
curl https://insta.tiblings.com/auth/status
```

**Expected:** JSON response with authentication status.

---

### Test 4: Open in Browser

Open your browser and navigate to:
```
https://insta.tiblings.com
```

**Expected:** You should see the new Next.js frontend with modern UI.

---

### Test 5: Test Registration

1. Click "Register" or navigate to `/register`
2. Fill in the form:
   - Email: test@example.com
   - Password: Test123!
3. Submit the form

**Expected:** You should be redirected to the dashboard.

---

### Test 6: Test Login

1. Logout if logged in
2. Click "Login" or navigate to `/login`
3. Enter credentials
4. Submit the form

**Expected:** You should be redirected to the dashboard.

---

### Test 7: Test Dashboard

1. Navigate to `/dashboard`
2. Check that stats are displayed
3. Check that "Connect Instagram Account" button is visible

**Expected:** Dashboard should load with all components.

---

### Test 8: Test OAuth Flow

1. Click "Connect Instagram Account"
2. You should be redirected to `/oauth/start`
3. Click "Continue with Facebook"

**Expected:** You should be redirected to Facebook OAuth.

---

### Test 9: Test Webhook Dashboard

1. Navigate to `/dashboard/webhooks`
2. Check that the webhook event list loads

**Expected:** Webhook dashboard should display (may be empty if no events).

---

### Test 10: Test Animations and Toasts

1. Try various interactions
2. Check for smooth transitions
3. Look for toast notifications on actions

**Expected:** Smooth animations and toast notifications should appear.

---

## 📊 Monitoring Commands

### View Frontend Logs (Real-time)

```bash
ssh root@147.93.112.223 'journalctl -u insta-connect-frontend -f'
```

### View Backend Logs (Real-time)

```bash
ssh root@147.93.112.223 'journalctl -u insta-connect -f'
```

### View Nginx Error Logs

```bash
ssh root@147.93.112.223 'tail -f /var/log/nginx/error.log'
```

### Check Service Status

```bash
ssh root@147.93.112.223 'systemctl status insta-connect-frontend insta-connect nginx'
```

---

## 🚨 Troubleshooting

### Frontend Service Won't Start

```bash
ssh root@147.93.112.223
journalctl -u insta-connect-frontend -n 100
systemctl restart insta-connect-frontend
```

### Port 3001 Already in Use

```bash
ssh root@147.93.112.223
lsof -i :3001
kill -9 <PID>
systemctl restart insta-connect-frontend
```

### Nginx Configuration Error

```bash
ssh root@147.93.112.223
nginx -t
# Fix any errors shown
systemctl reload nginx
```

### Site Not Accessible

```bash
# Check firewall
ssh root@147.93.112.223 'ufw status'

# Check SSL certificate
ssh root@147.93.112.223 'certbot certificates'

# Check DNS
nslookup insta.tiblings.com
```

---

## ✅ Deployment Complete Checklist

After completing all steps, verify:

- [ ] Frontend service is running (`systemctl status insta-connect-frontend`)
- [ ] Backend service is running (`systemctl status insta-connect`)
- [ ] Nginx is running (`systemctl status nginx`)
- [ ] Site is accessible at https://insta.tiblings.com
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads
- [ ] OAuth flow initiates
- [ ] Webhook dashboard loads
- [ ] Animations are smooth
- [ ] No errors in logs

---

## 🎉 Success!

Once all checks pass, your deployment is complete! 

**Next Steps:**
- Monitor logs for any issues
- Test all features thoroughly
- Set up monitoring/alerts
- Consider adding analytics

**Support:**
- Frontend logs: `journalctl -u insta-connect-frontend -f`
- Backend logs: `journalctl -u insta-connect -f`
- Nginx logs: `tail -f /var/log/nginx/error.log`

