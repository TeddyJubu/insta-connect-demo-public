# Operational Runbooks

## Overview

This document provides operational procedures for managing the insta-connect-demo application in production.

## Table of Contents

1. [Monitoring & Alerts](#monitoring--alerts)
2. [Incident Response](#incident-response)
3. [Backup & Recovery](#backup--recovery)
4. [Scaling & Performance](#scaling--performance)
5. [Troubleshooting](#troubleshooting)

## Monitoring & Alerts

### Health Check Endpoint

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

**Monitoring:**
- Check health endpoint every 30 seconds
- Alert if status is "unhealthy" for 2+ consecutive checks
- Alert if response time exceeds 5 seconds

### Metrics Endpoint

**Endpoint:** `GET /metrics`

**Metrics Collected:**
- HTTP requests (count, duration, status codes)
- API calls (success rate, latency, errors)
- Database queries (count, duration, errors)
- Token refresh (success rate, expiring tokens)
- Webhook events (received, processed, failed)

### Alert Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Token Refresh Failure | >10% failure rate | Check token refresh logs |
| Webhook Errors | >5% error rate | Check webhook processor |
| API Latency | >5 seconds avg | Check Graph API status |
| DB Latency | >1 second avg | Check database performance |
| Error Rate | >5% | Review error logs |

## Incident Response

### Token Refresh Failures

**Symptoms:**
- High token refresh failure rate
- Users unable to access Instagram data
- Alerts: "Token Refresh Failures"

**Investigation:**
```bash
# Check token refresh logs
tail -f logs/error-*.log | grep "token"

# Check database for expiring tokens
psql -U postgres -d insta_connect -c "SELECT * FROM meta_accounts WHERE expires_at < NOW() + INTERVAL '7 days';"

# Check Graph API status
curl -s https://graph.instagram.com/debug_token?input_token=<token>&access_token=<app_token>
```

**Resolution:**
1. Verify Graph API is accessible
2. Check token refresh service is running: `systemctl status token-refresh`
3. Restart service if needed: `systemctl restart token-refresh`
4. Monitor logs for recovery

### Webhook Processing Errors

**Symptoms:**
- Webhook events not being processed
- High error rate in webhook processor
- Alerts: "Webhook Processing Errors"

**Investigation:**
```bash
# Check webhook processor logs
tail -f logs/error-*.log | grep "webhook"

# Check webhook events in database
psql -U postgres -d insta_connect -c "SELECT * FROM webhook_events WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;"

# Check webhook processor service
systemctl status webhook-processor
```

**Resolution:**
1. Check webhook processor service: `systemctl status webhook-processor`
2. Restart if needed: `systemctl restart webhook-processor`
3. Review failed events and retry manually if needed
4. Monitor logs for recovery

### High API Latency

**Symptoms:**
- Slow response times
- Timeouts on Graph API calls
- Alerts: "High API Latency"

**Investigation:**
```bash
# Check API response times in logs
grep "API Response" logs/combined-*.log | tail -20

# Check network connectivity
ping graph.instagram.com
curl -w "@curl-format.txt" -o /dev/null -s https://graph.instagram.com/me

# Check server resources
top -b -n 1 | head -20
free -h
df -h
```

**Resolution:**
1. Check server resources (CPU, memory, disk)
2. Check network connectivity to Graph API
3. Scale up if resource-constrained
4. Check for rate limiting (429 responses)

### Database Connection Issues

**Symptoms:**
- Database query failures
- Connection pool exhausted
- Alerts: "High Database Latency"

**Investigation:**
```bash
# Check database connection
psql -U postgres -d insta_connect -c "SELECT 1;"

# Check active connections
psql -U postgres -d insta_connect -c "SELECT count(*) FROM pg_stat_activity;"

# Check database logs
tail -f /var/log/postgresql/postgresql.log
```

**Resolution:**
1. Verify database is running: `systemctl status postgresql`
2. Check connection pool settings
3. Restart database if needed: `systemctl restart postgresql`
4. Monitor connection count

## Backup & Recovery

### Database Backup

**Automated Backups:**
- Daily backups at 2 AM UTC
- Retention: 30 days
- Location: `/backups/postgresql/`

**Manual Backup:**
```bash
pg_dump -U postgres insta_connect > backup-$(date +%Y%m%d-%H%M%S).sql
```

**Backup Verification:**
```bash
# List backups
ls -lh /backups/postgresql/

# Verify backup integrity
pg_restore -l backup-*.sql | head -20
```

### Database Recovery

**Restore from Backup:**
```bash
# Stop application
systemctl stop insta-connect-app

# Restore database
psql -U postgres insta_connect < backup-*.sql

# Restart application
systemctl start insta-connect-app

# Verify recovery
curl http://localhost:3000/health
```

### Application Recovery

**Restart Application:**
```bash
systemctl restart insta-connect-app
systemctl restart token-refresh
systemctl restart webhook-processor
```

**Verify Services:**
```bash
systemctl status insta-connect-app
systemctl status token-refresh
systemctl status webhook-processor
```

## Scaling & Performance

### Horizontal Scaling

**Add New Instance:**
1. Provision new server
2. Install dependencies: `npm install --only=production`
3. Configure environment variables
4. Start application: `systemctl start insta-connect-app`
5. Add to load balancer

### Vertical Scaling

**Increase Resources:**
1. Stop application: `systemctl stop insta-connect-app`
2. Upgrade server resources (CPU, memory)
3. Restart application: `systemctl start insta-connect-app`
4. Monitor performance

### Database Optimization

**Query Performance:**
```bash
# Enable query logging
psql -U postgres -d insta_connect -c "SET log_min_duration_statement = 1000;"

# Check slow queries
tail -f /var/log/postgresql/postgresql.log | grep "duration:"
```

**Index Management:**
```bash
# Create indexes for common queries
psql -U postgres -d insta_connect -c "CREATE INDEX idx_webhook_events_status ON webhook_events(status);"
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | App not running | `systemctl restart insta-connect-app` |
| 503 Service Unavailable | Database down | `systemctl restart postgresql` |
| Slow responses | High load | Scale horizontally or vertically |
| Token errors | Expired tokens | Check token refresh service |
| Webhook failures | Processor down | `systemctl restart webhook-processor` |

### Log Analysis

**View Recent Errors:**
```bash
tail -f logs/error-*.log
```

**Search for Specific Error:**
```bash
grep "error message" logs/combined-*.log
```

**Count Errors by Type:**
```bash
grep "ERROR" logs/combined-*.log | cut -d' ' -f4 | sort | uniq -c | sort -rn
```

### Performance Profiling

**Monitor System Resources:**
```bash
# Real-time monitoring
top

# Memory usage
free -h

# Disk usage
df -h

# Network connections
netstat -an | grep ESTABLISHED | wc -l
```

## Contact & Escalation

- **On-Call Engineer:** Check PagerDuty
- **Database Admin:** database-team@company.com
- **Infrastructure Team:** infrastructure@company.com
- **Meta Support:** https://developers.facebook.com/support

