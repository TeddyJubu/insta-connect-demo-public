# N8N Integration Deployment Guide

This guide covers deploying the N8N integration to production.

## Pre-Deployment Checklist

- [ ] All code changes committed and pushed to main branch
- [ ] All tests passing locally
- [ ] N8N workflow created and tested
- [ ] Environment variables configured in Doppler
- [ ] Database backup created
- [ ] Deployment window scheduled
- [ ] Team notified of deployment

## Deployment Steps

### 1. Prepare Local Environment

```bash
# Navigate to project directory
cd /Users/teddyburtonburger/Desktop/Code-hub/insta-connect-demo

# Ensure all changes are committed
git status

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run tests locally
npm test

# Build frontend
cd frontend
npm run build
cd ..
```

### 2. Deploy to Production VPS

```bash
# SSH into production server
sshpass -p 'WMz84eLJcEHqA8S#' ssh -o StrictHostKeyChecking=no root@147.93.112.223

# Navigate to project directory
cd /root/insta-connect-demo

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run database migrations
doppler run -- node src/db/migrate.js

# Verify migration completed
doppler run -- psql insta_connect_demo -c "SELECT * FROM message_processing_queue LIMIT 1;"
```

### 3. Update Environment Variables in Doppler

```bash
# Access Doppler CLI (if not already installed)
# brew install doppler

# Login to Doppler
doppler login

# Select project
doppler projects

# Update dev_insta config with N8N variables
doppler secrets set N8N_ENABLED=true
doppler secrets set N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/instagram-message
doppler secrets set N8N_CALLBACK_SECRET=your-secure-callback-secret
doppler secrets set N8N_TIMEOUT_MS=30000

# Verify secrets are set
doppler secrets
```

### 4. Restart Backend Service

```bash
# SSH into production server
sshpass -p 'WMz84eLJcEHqA8S#' ssh -o StrictHostKeyChecking=no root@147.93.112.223

# Restart backend service
systemctl restart insta-connect.service

# Check service status
systemctl status insta-connect.service --no-pager | head -20

# Check logs for errors
journalctl -u insta-connect.service -n 50 --no-pager
```

### 5. Verify Deployment

```bash
# Check if service is running
curl -s http://localhost:3000/health

# Check webhook dashboard
curl -s http://localhost:3000/api/webhook-events?limit=5 \
  -H 'Cookie: connect.sid=test'

# Check N8N metrics endpoint
curl -s http://localhost:3000/api/n8n/metrics \
  -H 'Cookie: connect.sid=test'

# Check message queue
curl -s http://localhost:3000/api/n8n/queue \
  -H 'Cookie: connect.sid=test'
```

### 6. Test End-to-End Flow

1. **Send a test message** to your Instagram Business Account
2. **Check webhook received**:
   ```bash
   curl -s http://localhost:3000/api/webhook-events?limit=1 \
     -H 'Cookie: connect.sid=test'
   ```

3. **Check message in queue**:
   ```bash
   curl -s http://localhost:3000/api/n8n/queue \
     -H 'Cookie: connect.sid=test'
   ```

4. **Monitor N8N execution**:
   - Go to N8N dashboard
   - Check "Executions" tab
   - Verify message was processed

5. **Check metrics**:
   ```bash
   curl -s http://localhost:3000/api/n8n/metrics/summary \
     -H 'Cookie: connect.sid=test'
   ```

6. **Verify AI response** was sent back to Instagram

### 7. Monitor Logs

```bash
# Watch backend logs in real-time
journalctl -u insta-connect.service -f

# Watch frontend logs
journalctl -u insta-connect-frontend.service -f

# Check for errors
journalctl -u insta-connect.service -n 100 --no-pager | grep -i error
```

## Post-Deployment Verification

### 1. Check Service Health

```bash
# Backend service
systemctl status insta-connect.service

# Frontend service
systemctl status insta-connect-frontend.service

# Database connection
doppler run -- psql insta_connect_demo -c "SELECT COUNT(*) FROM message_processing_queue;"
```

### 2. Monitor Metrics

Visit: `https://insta.tiblings.com/api/n8n/metrics`

Expected metrics:
- `messagesReceived`: Should increase as messages arrive
- `messagesProcessed`: Should increase as N8N processes messages
- `successRate`: Should be > 90%
- `errorRate`: Should be < 10%

### 3. Check Alerts

Visit: `https://insta.tiblings.com/api/n8n/metrics/alerts`

No critical alerts should be present.

### 4. Review Logs

```bash
# Check for N8N-related errors
journalctl -u insta-connect.service -n 200 --no-pager | grep -i n8n

# Check for database errors
journalctl -u insta-connect.service -n 200 --no-pager | grep -i database

# Check for webhook errors
journalctl -u insta-connect.service -n 200 --no-pager | grep -i webhook
```

## Rollback Procedure

If issues occur after deployment:

### 1. Revert Code Changes

```bash
# SSH into production
sshpass -p 'WMz84eLJcEHqA8S#' ssh -o StrictHostKeyChecking=no root@147.93.112.223

# Navigate to project
cd /root/insta-connect-demo

# Revert to previous commit
git revert HEAD

# Or reset to specific commit
git reset --hard <commit-hash>

# Reinstall dependencies
npm install

# Restart service
systemctl restart insta-connect.service
```

### 2. Disable N8N Integration

```bash
# Update Doppler
doppler secrets set N8N_ENABLED=false

# Restart service
systemctl restart insta-connect.service
```

### 3. Restore Database

```bash
# If migrations caused issues
doppler run -- psql insta_connect_demo -c "DROP TABLE IF EXISTS message_processing_queue;"

# Restart service
systemctl restart insta-connect.service
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
journalctl -u insta-connect.service -n 50 --no-pager

# Check for syntax errors
node -c server.js

# Check environment variables
doppler secrets
```

### Database Migration Failed

```bash
# Check migration status
doppler run -- psql insta_connect_demo -c "\dt"

# Check for errors
doppler run -- node src/db/migrate.js

# Manually create table if needed
doppler run -- psql insta_connect_demo < src/db/schema.sql
```

### N8N Webhook Not Triggering

1. Verify N8N_WEBHOOK_URL is correct
2. Check N8N workflow is activated
3. Verify firewall allows outbound connections
4. Check N8N logs for errors

### Rate Limiting Issues

```bash
# Check rate limit headers
curl -v http://localhost:3000/api/n8n/queue \
  -H 'Cookie: connect.sid=test' 2>&1 | grep -i ratelimit

# Adjust rate limits in src/middleware/n8nSecurity.js if needed
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Message Processing Time**: Should be < 5 seconds
2. **N8N Response Time**: Should be < 3 seconds
3. **Success Rate**: Should be > 95%
4. **Queue Size**: Should stay < 100 messages
5. **Error Rate**: Should be < 5%

### Set Up Alerts

Configure alerts in your monitoring system for:
- High error rate (> 10%)
- High queue size (> 100)
- Slow response times (> 10 seconds)
- Service down
- Database connection errors

## Maintenance

### Daily Tasks

- Monitor metrics dashboard
- Check for alerts
- Review error logs
- Verify N8N workflow is running

### Weekly Tasks

- Review performance metrics
- Check database size
- Clean up old messages (automatic via cron job)
- Test manual retry functionality

### Monthly Tasks

- Review and optimize N8N workflow
- Update dependencies
- Audit security logs
- Performance optimization

## Support

For deployment issues:
1. Check logs: `journalctl -u insta-connect.service`
2. Check N8N logs: N8N dashboard → Settings → Logs
3. Check database: `doppler run -- psql insta_connect_demo`
4. Review this guide
5. Contact team for assistance

