# Infrastructure Documentation

**Last Updated:** November 1, 2025

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet Users                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTPS (443)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Nginx Reverse Proxy (SSL/TLS)                  │
│              insta.tiblings.com:443                         │
│              (Let's Encrypt Certificate)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP (3000)
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Express.js Application Server                       │
│         Node.js Runtime                                     │
│         Port: 3000                                          │
│         ├─ Authentication Routes                           │
│         ├─ OAuth Flow                                      │
│         ├─ API Routes                                      │
│         ├─ Webhook Handler                                 │
│         └─ Health Check Endpoint                           │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   PostgreSQL      Redis Cache      File System
   Database        (Optional)        (Logs)
   Port: 5432
```

## 2. Deployment Environment

### 2.1 Production VPS

**Provider:** Hostinger
**IP Address:** 147.93.112.223
**Domain:** insta.tiblings.com
**OS:** Linux (Ubuntu 20.04 LTS)
**User:** root

### 2.2 Application Directory

```
/root/insta-connect-demo/
├── server.js                 # Express entry point
├── package.json              # Dependencies
├── .env                       # Environment variables (not in repo)
├── public/                    # Static assets
├── src/
│   ├── routes/               # Express routes
│   ├── models/               # Database models
│   ├── middleware/           # Express middleware
│   ├── jobs/                 # Background jobs
│   └── utils/                # Utility functions
├── logs/                      # Application logs
├── tests/                     # Test files
└── docs/                      # Documentation
```

## 3. Services & Processes

### 3.1 Main Application Service

**Service Name:** insta-connect-demo
**Type:** systemd service
**Port:** 3000
**User:** nodejs
**Status:** `systemctl status insta-connect-demo`

**Start/Stop:**
```bash
systemctl start insta-connect-demo
systemctl stop insta-connect-demo
systemctl restart insta-connect-demo
```

### 3.2 Token Refresh Service

**Service Name:** insta-connect-demo-token-refresh
**Type:** systemd timer + service
**Schedule:** Daily at 2 AM UTC
**Script:** `/root/insta-connect-demo/src/jobs/refresh-tokens.js`

**Status:**
```bash
systemctl status insta-connect-demo-token-refresh.timer
systemctl status insta-connect-demo-token-refresh.service
```

### 3.3 Webhook Processor Service

**Service Name:** insta-connect-demo-webhook-processor
**Type:** systemd timer + service
**Schedule:** Every 5 minutes
**Script:** `/root/insta-connect-demo/src/jobs/webhook-processor.js`

**Status:**
```bash
systemctl status insta-connect-demo-webhook-processor.timer
systemctl status insta-connect-demo-webhook-processor.service
```

## 4. Database

### 4.1 PostgreSQL Configuration

**Host:** localhost
**Port:** 5432
**Database:** insta_connect_demo
**User:** insta_user
**Version:** 16

**Connection String:**
```
postgresql://insta_user:PASSWORD@localhost:5432/insta_connect_demo
```

### 4.2 Database Tables

- `users` - User accounts
- `instagram_accounts` - Connected Instagram accounts
- `instagram_pages` - Instagram pages
- `access_tokens` - OAuth tokens
- `token_refresh_log` - Token refresh history
- `webhook_events` - Webhook event queue
- `webhook_event_log` - Webhook processing history

### 4.3 Backups

**Backup Location:** `/root/backups/`
**Backup Schedule:** Daily at 1 AM UTC
**Retention:** 30 days

**Manual Backup:**
```bash
pg_dump -U insta_user insta_connect_demo > backup-$(date +%Y%m%d).sql
```

**Restore:**
```bash
psql -U insta_user insta_connect_demo < backup-YYYYMMDD.sql
```

## 5. Reverse Proxy (Nginx)

### 5.1 Configuration

**Config File:** `/etc/nginx/sites-available/insta-connect-demo`
**Enabled:** `/etc/nginx/sites-enabled/insta-connect-demo`

**Key Settings:**
- SSL Certificate: `/etc/letsencrypt/live/insta.tiblings.com/`
- HTTP → HTTPS redirect
- Proxy to localhost:3000
- Gzip compression enabled
- Security headers configured

### 5.2 SSL Certificate

**Provider:** Let's Encrypt
**Domain:** insta.tiblings.com
**Renewal:** Automatic (certbot)
**Expiration:** Check with `certbot certificates`

**Manual Renewal:**
```bash
certbot renew --dry-run
certbot renew
```

## 6. Environment Variables

**Location:** `/root/insta-connect-demo/.env`

**Key Variables:**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
APP_ID=<Meta App ID>
APP_SECRET=<Meta App Secret>
OAUTH_REDIRECT_URI=https://insta.tiblings.com/oauth/callback
VERIFY_TOKEN=<Webhook Verify Token>
OAUTH_STATE_SECRET=<State Secret>
SESSION_SECRET=<Session Secret>
LOG_LEVEL=info
```

**Secret Management:** Doppler
**Project:** insta-connect-demo
**Config:** dev_insta

## 7. Monitoring & Health Checks

### 7.1 Health Check Endpoint

**URL:** `https://insta.tiblings.com/health`
**Method:** GET
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "uptime": 3600000,
  "environment": "production"
}
```

### 7.2 Metrics Endpoint

**URL:** `https://insta.tiblings.com/metrics`
**Method:** GET
**Response:** Current metrics snapshot

### 7.3 Monitoring Commands

```bash
# Check application status
curl https://insta.tiblings.com/health

# Check metrics
curl https://insta.tiblings.com/metrics

# Check alerts
curl https://insta.tiblings.com/alerts

# View logs
tail -f /root/insta-connect-demo/logs/combined-*.log
```

## 8. Scaling & Performance

### 8.1 Horizontal Scaling

To scale horizontally:
1. Deploy additional instances
2. Use load balancer (AWS ELB, Nginx)
3. Share database connection
4. Use Redis for session storage

### 8.2 Vertical Scaling

To scale vertically:
1. Increase VPS resources (CPU, RAM)
2. Optimize database queries
3. Enable caching
4. Use CDN for static assets

### 8.3 Performance Optimization

- Enable gzip compression
- Use Redis for caching
- Optimize database indexes
- Implement rate limiting
- Use CDN for static assets

## 9. Disaster Recovery

### 9.1 Backup Strategy

- Daily database backups
- 30-day retention
- Stored on VPS
- Encrypted backups

### 9.2 Recovery Procedures

**Database Recovery:**
```bash
# Stop application
systemctl stop insta-connect-demo

# Restore database
psql -U insta_user insta_connect_demo < backup-YYYYMMDD.sql

# Start application
systemctl start insta-connect-demo
```

**Application Recovery:**
```bash
# Pull latest code
cd /root/insta-connect-demo
git pull origin main

# Install dependencies
npm install

# Restart service
systemctl restart insta-connect-demo
```

## 10. Security

### 10.1 Firewall Rules

- Port 22 (SSH): Restricted to admin IPs
- Port 80 (HTTP): Open (redirects to HTTPS)
- Port 443 (HTTPS): Open
- Port 5432 (PostgreSQL): Closed (localhost only)

### 10.2 Security Practices

- SSH key-based authentication only
- Regular security updates
- Secrets in Doppler
- HTTPS enforced
- CSRF protection enabled
- Rate limiting enabled

## 11. Onboarding New Team Members

### 11.1 Access Setup

1. Create SSH key pair
2. Add public key to `/root/.ssh/authorized_keys`
3. Configure SSH config locally
4. Test SSH connection

### 11.2 Development Setup

1. Clone repository
2. Install Node.js (v18+)
3. Install PostgreSQL locally
4. Copy `.env.example` to `.env`
5. Run `npm install`
6. Run `npm test`
7. Run `npm run dev`

### 11.3 Production Access

1. Request Doppler access
2. Request VPS SSH access
3. Review documentation
4. Shadow deployment process
5. Perform first deployment

## 12. Troubleshooting

### 12.1 Application Not Responding

```bash
# Check service status
systemctl status insta-connect-demo

# Check logs
tail -f /root/insta-connect-demo/logs/error-*.log

# Restart service
systemctl restart insta-connect-demo
```

### 12.2 Database Connection Issues

```bash
# Test connection
psql -U insta_user -h localhost insta_connect_demo

# Check PostgreSQL status
systemctl status postgresql

# View database logs
tail -f /var/log/postgresql/postgresql.log
```

### 12.3 SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate
certbot renew

# Check Nginx config
nginx -t
```

## 13. Contact & Support

**Infrastructure Owner:** [Name]
**Email:** infrastructure@insta-connect-demo.com
**On-Call:** [Rotation Schedule]

---

**Version:** 1.0
**Last Updated:** November 1, 2025

