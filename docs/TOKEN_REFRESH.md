# Token Refresh System

This document explains the token refresh system for Meta (Facebook/Instagram) access tokens.

## Overview

Meta access tokens are long-lived (60 days) but need to be refreshed periodically to maintain access to user data. This system automatically refreshes tokens before they expire.

## How It Works

### Token Lifecycle

1. **Initial Token**: When a user connects their Instagram account via OAuth, we receive a short-lived token
2. **Exchange for Long-Lived**: We immediately exchange it for a long-lived token (60 days)
3. **Automatic Refresh**: The refresh job runs daily and refreshes tokens expiring within 7 days
4. **New Expiration**: Refreshed tokens are valid for another 60 days from the refresh date

### Refresh Logic

The system refreshes two types of tokens:

1. **Meta Account Tokens** (User Access Tokens)
   - Used to access the user's Facebook/Instagram data
   - Refreshed using the `fb_exchange_token` grant type
   - Endpoint: `https://graph.facebook.com/v20.0/oauth/access_token`

2. **Page Tokens** (Page Access Tokens)
   - Used to access specific Facebook Pages
   - Refreshed by fetching the user's pages with the refreshed user token
   - Endpoint: `https://graph.facebook.com/v20.0/{user-id}/accounts`

## Components

### 1. Refresh Script (`src/jobs/refresh-tokens.js`)

The main script that performs token refresh:

```bash
# Run manually
node src/jobs/refresh-tokens.js

# Dry run (test without making changes)
node src/jobs/refresh-tokens.js --dry-run
```

**Features:**
- Finds tokens expiring within 7 days
- Refreshes Meta account tokens using Graph API
- Refreshes Page tokens by re-fetching user's pages
- Logs all refresh attempts to `token_refresh_log` table
- Exits with error code if any refresh fails

### 2. Scheduler (`src/jobs/scheduler.js`)

A Node.js process that runs the refresh job daily at 2:00 AM UTC:

```bash
# Start the scheduler
node src/jobs/scheduler.js
```

**Features:**
- Uses `node-cron` for scheduling
- Runs daily at 2:00 AM UTC
- Handles graceful shutdown (SIGINT, SIGTERM)
- Logs all job executions

### 3. Test Script (`src/jobs/test-refresh.js`)

A test script that simulates token refresh without calling the Meta API:

```bash
# Run the test
node src/jobs/test-refresh.js
```

**Features:**
- Finds expiring tokens
- Simulates refresh by updating expiration dates
- Logs refresh attempts
- Verifies database updates

## Deployment Options

### Option 1: Node.js Scheduler (Recommended for Development)

Run the scheduler as a separate process:

```bash
# Start the scheduler
node src/jobs/scheduler.js

# Or use PM2 for process management
pm2 start src/jobs/scheduler.js --name token-refresh-scheduler
```

### Option 2: Systemd Service (Recommended for Production)

Run the scheduler as a systemd service:

```bash
# Copy the service file
sudo cp deployment/token-refresh.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable token-refresh.service
sudo systemctl start token-refresh.service

# Check status
sudo systemctl status token-refresh.service

# View logs
sudo journalctl -u token-refresh.service -f
```

### Option 3: Systemd Timer (Alternative for Production)

Run the refresh job as a one-shot systemd timer:

```bash
# Copy the service and timer files
sudo cp deployment/token-refresh-oneshot.service /etc/systemd/system/
sudo cp deployment/token-refresh.timer /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable token-refresh.timer
sudo systemctl start token-refresh.timer

# Check timer status
sudo systemctl list-timers token-refresh.timer

# View logs
sudo journalctl -u token-refresh-oneshot.service -f
```

### Option 4: Cron (Traditional Approach)

Add a cron job to run the refresh script daily:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2:00 AM
0 2 * * * cd /root/insta-connect-demo && /usr/bin/node src/jobs/refresh-tokens.js >> /var/log/token-refresh.log 2>&1
```

## Database Schema

The system uses the `token_refresh_log` table to track all refresh attempts:

```sql
CREATE TABLE token_refresh_log (
  id SERIAL PRIMARY KEY,
  meta_account_id INTEGER REFERENCES meta_accounts(id) ON DELETE CASCADE,
  page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  refresh_type VARCHAR(50) NOT NULL,  -- 'scheduled', 'manual', 'test'
  success BOOLEAN NOT NULL,
  error_message TEXT,
  old_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring

### Check Refresh Logs

```sql
-- Recent refresh attempts
SELECT * FROM token_refresh_log 
ORDER BY refreshed_at DESC 
LIMIT 10;

-- Failed refresh attempts
SELECT * FROM token_refresh_log 
WHERE success = false 
ORDER BY refreshed_at DESC;

-- Refresh success rate
SELECT 
  refresh_type,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM token_refresh_log
GROUP BY refresh_type;
```

### Check Expiring Tokens

```sql
-- Meta accounts expiring within 7 days
SELECT id, meta_user_id, expires_at,
  EXTRACT(DAY FROM expires_at - CURRENT_TIMESTAMP) as days_until_expiry
FROM meta_accounts
WHERE expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days'
  AND expires_at > CURRENT_TIMESTAMP
ORDER BY expires_at ASC;

-- Pages expiring within 7 days
SELECT id, page_name, token_expires_at,
  EXTRACT(DAY FROM token_expires_at - CURRENT_TIMESTAMP) as days_until_expiry
FROM pages
WHERE token_expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days'
  AND token_expires_at > CURRENT_TIMESTAMP
ORDER BY token_expires_at ASC;
```

## Troubleshooting

### Token Refresh Fails

1. **Check Meta App Credentials**: Ensure `APP_ID` and `APP_SECRET` are correct in Doppler
2. **Check Token Validity**: Verify the token hasn't been revoked by the user
3. **Check API Permissions**: Ensure the app has the required permissions
4. **Check Rate Limits**: Meta has rate limits on API calls
5. **Check Logs**: Review the `token_refresh_log` table for error messages

### Scheduler Not Running

1. **Check Process**: `ps aux | grep scheduler` or `systemctl status token-refresh.service`
2. **Check Logs**: `journalctl -u token-refresh.service -f` or check application logs
3. **Check Cron**: `crontab -l` to verify cron job is configured
4. **Check Permissions**: Ensure the script has execute permissions

### Manual Refresh

If you need to manually refresh tokens:

```bash
# Refresh all expiring tokens
node src/jobs/refresh-tokens.js

# Test without making changes
node src/jobs/refresh-tokens.js --dry-run
```

## Configuration

### Refresh Threshold

By default, tokens are refreshed when they expire within 7 days. To change this, edit `src/jobs/refresh-tokens.js`:

```javascript
const REFRESH_THRESHOLD_DAYS = 7; // Change this value
```

### Schedule

To change the refresh schedule, edit `src/jobs/scheduler.js`:

```javascript
// Current: Daily at 2:00 AM UTC
const tokenRefreshJob = cron.schedule('0 2 * * *', async () => {
  // ...
});

// Examples:
// Every 6 hours: '0 */6 * * *'
// Twice daily (2 AM and 2 PM): '0 2,14 * * *'
// Weekly on Sunday at 2 AM: '0 2 * * 0'
```

## Best Practices

1. **Monitor Refresh Logs**: Regularly check the `token_refresh_log` table for failures
2. **Set Up Alerts**: Configure alerts for failed refresh attempts
3. **Test Before Deploying**: Always test with `--dry-run` before deploying changes
4. **Keep Credentials Secure**: Never commit `APP_SECRET` to version control
5. **Handle Revoked Tokens**: Implement logic to notify users when tokens are revoked
6. **Log Everything**: The system logs all refresh attempts for audit purposes

## Security Considerations

1. **Secrets Management**: Use Doppler or environment variables for `APP_ID` and `APP_SECRET`
2. **Database Access**: Ensure only authorized processes can access the database
3. **Log Sanitization**: Never log access tokens in plain text
4. **Error Handling**: Don't expose sensitive error details to users
5. **Rate Limiting**: Respect Meta's API rate limits to avoid being blocked

