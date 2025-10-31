# Task List

## Current Sprint: HTTPS Setup & Deployment

### ✅ Completed Tasks
- [x] Initial project setup with Express server
- [x] Basic OAuth flow implementation
- [x] Environment variables configuration with Doppler
- [x] Deployment to Hostinger VPS (147.93.112.223)
- [x] DNS configuration (insta.tiblings.com → 147.93.112.223)

### 🔄 In Progress

#### HTTPS Configuration
- [ ] Install Nginx and Certbot on VPS
  - [ ] SSH into server (root@147.93.112.223)
  - [ ] Run `sudo apt update`
  - [ ] Install packages: `sudo apt install nginx certbot python3-certbot-nginx -y`
  - [ ] Verify Nginx is running: `sudo systemctl status nginx`

- [ ] Configure Nginx as reverse proxy
  - [ ] Create site config: `/etc/nginx/sites-available/insta-connect-demo`
  - [ ] Add proxy_pass configuration to forward traffic to localhost:3000
  - [ ] Enable site: symlink to `/etc/nginx/sites-enabled/`
  - [ ] Test config: `sudo nginx -t`
  - [ ] Reload Nginx: `sudo systemctl reload nginx`

- [ ] Obtain SSL certificate with Let's Encrypt
  - [ ] Run Certbot: `sudo certbot --nginx -d insta.tiblings.com`
  - [ ] Provide email for renewal notices
  - [ ] Accept terms and conditions
  - [ ] Choose option 2 to redirect HTTP → HTTPS
  - [ ] Verify HTTPS works in browser (lock icon visible)
  - [ ] Test auto-renewal: `sudo certbot renew --dry-run`

- [ ] Update application environment variables
  - [ ] Set `ENFORCE_HTTPS=true` in Doppler
  - [ ] Set `NODE_ENV=production` in Doppler
  - [ ] Set `COOKIE_DOMAIN=insta.tiblings.com` in Doppler
  - [ ] Restart service: `sudo systemctl restart insta-connect-demo`
  - [ ] Verify service status: `sudo systemctl status insta-connect-demo`

- [ ] Final verification
  - [ ] Test HTTPS access: https://insta.tiblings.com
  - [ ] Verify HTTP redirects to HTTPS
  - [ ] Check browser console for mixed-content warnings
  - [ ] Review server logs: `sudo journalctl -u insta-connect-demo -n 100`
  - [ ] Test Instagram OAuth flow end-to-end on HTTPS

### 📋 Upcoming Tasks
- [ ] Add comprehensive test suite (Jest + Supertest)
- [ ] Implement token refresh logic
- [ ] Add error handling and logging middleware
- [ ] Set up monitoring and alerting
- [ ] Document deployment procedures
- [ ] Add health check endpoint

### 📝 Notes
- VPS IP: 147.93.112.223
- Domain: insta.tiblings.com
- Node app runs on port 3000 (internal)
- Nginx will handle port 80/443 (external)
- Certificates auto-renew via Certbot cron job
- All secrets managed via Doppler (project: insta-connect-demo, config: dev_insta)

### ⚠️ Blockers & Issues
None currently

### 🔒 Security Checklist
- [ ] Verify `.env` is in `.gitignore`
- [ ] Confirm all secrets are in Doppler, not committed to repo
- [ ] Review Nginx security headers
- [ ] Run `npm audit` and address high-severity issues
- [ ] Rotate OAUTH_STATE_SECRET if it was ever exposed