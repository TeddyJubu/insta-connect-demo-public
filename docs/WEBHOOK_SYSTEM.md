# Webhook System Documentation

This document explains the production-ready webhook handling system for Instagram/Facebook webhooks.

## Overview

The webhook system implements:
- ✅ **Signature Validation**: Verifies X-Hub-Signature-256 headers using HMAC SHA256
- ✅ **Event Queueing**: Stores webhook events in database for asynchronous processing
- ✅ **Retry Logic**: Automatically retries failed events with exponential backoff
- ✅ **Dead Letter Queue**: Moves permanently failed events to dead letter queue
- ✅ **Dashboard**: Web UI to view, filter, and manually retry events

## Architecture

### 1. Webhook Receiver (`POST /webhook`)

When Meta sends a webhook:

1. **Signature Validation**: Validates X-Hub-Signature-256 header
2. **Immediate Response**: Returns HTTP 200 within 20 seconds (Meta requirement)
3. **Event Queueing**: Stores event in `webhook_events` table with status `pending`
4. **Async Processing**: Event is processed by background job

### 2. Event Processing (`src/jobs/process-webhooks.js`)

The processor:

1. **Fetches Pending Events**: Queries events with status `pending`
2. **Processes Each Event**: Extracts data, validates, stores in database
3. **Updates Status**: Marks as `processed` or `failed`
4. **Retry Logic**: Failed events are retried with exponential backoff
5. **Dead Letter**: After 3 failed attempts, moves to dead letter queue

### 3. Webhook Scheduler (`src/jobs/webhook-scheduler.js`)

Runs on a schedule:
- **Every minute**: Process pending events
- **Every 5 minutes**: Retry failed events

## Components

### Middleware

#### `src/middleware/webhookValidation.js`

**`validateWebhookSignature(appSecret)`**
- Validates X-Hub-Signature-256 header
- Uses timing-safe comparison to prevent timing attacks
- Requires raw request body for signature calculation

**How it works:**
```javascript
// Meta sends this header
X-Hub-Signature-256: sha256=<signature>

// We compute expected signature
const expectedSignature = crypto
  .createHmac('sha256', APP_SECRET)
  .update(rawBody)
  .digest('hex');

// Compare using timing-safe method
crypto.timingSafeEqual(receivedSignature, expectedSignature);
```

### Models

#### `src/models/WebhookEvent.js`

**Methods:**
- `create(eventData)` - Create new webhook event
- `findById(id)` - Find event by ID
- `findByPageId(pageId, options)` - Find events for a page
- `findPending(limit)` - Find pending events for processing
- `findRetryable(maxRetries, limit)` - Find failed events to retry
- `updateStatus(id, status, options)` - Update event status
- `markProcessing(id)` - Mark as processing
- `markProcessed(id)` - Mark as processed
- `markFailed(id, error, incrementRetry)` - Mark as failed
- `moveToDeadLetter(id, error)` - Move to dead letter queue
- `retry(id)` - Reset event to pending for manual retry
- `getStats()` - Get event statistics

**Event Statuses:**
- `pending` - Waiting to be processed
- `processing` - Currently being processed
- `processed` - Successfully processed
- `failed` - Processing failed, will be retried
- `dead_letter` - Permanently failed after max retries

### Jobs

#### `src/jobs/process-webhooks.js`

**Configuration:**
```javascript
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s
```

**Functions:**
- `processEvent(event)` - Process a single event
- `processPendingEvents()` - Process all pending events
- `processRetryableEvents()` - Retry failed events with backoff

**Usage:**
```bash
# Process events manually
node src/jobs/process-webhooks.js

# Run as scheduled job
node src/jobs/webhook-scheduler.js
```

#### `src/jobs/webhook-scheduler.js`

Runs the processor on a schedule using `node-cron`:
- Pending events: Every minute (`* * * * *`)
- Retry events: Every 5 minutes (`*/5 * * * *`)

### API Routes

#### `src/routes/webhookDashboard.js`

**Endpoints:**

**`GET /api/webhook-events`**
- Get webhook events with filtering and pagination
- Query params: `status`, `eventType`, `limit`, `offset`
- Returns: `{ events, total, limit, offset }`

**`GET /api/webhook-events/stats`**
- Get event statistics
- Returns: `{ total, pending, processing, processed, failed, dead_letter }`

**`GET /api/webhook-events/:id`**
- Get single event details
- Returns: Event object with full payload

**`POST /api/webhook-events/:id/retry`**
- Manually retry a failed event
- Resets status to `pending` and clears error
- Returns: `{ message, event }`

**`DELETE /api/webhook-events/:id`**
- Delete an event
- Returns: `{ message }`

### Dashboard UI

The webhook dashboard is integrated into `public/index.html`:

**Features:**
- **Statistics Cards**: Shows total, pending, processed, failed, dead letter counts
- **Event List**: Displays recent events with status badges
- **Status Filter**: Filter events by status
- **Event Details Modal**: View full event payload and error messages
- **Manual Retry**: Retry failed events with one click
- **Auto-Refresh**: Updates every 10 seconds

## Database Schema

```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX idx_webhook_events_page_id ON webhook_events(page_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);
```

## Testing

### Test Signature Validation

```bash
# Start the server
npm start

# In another terminal, run the test
node src/jobs/test-webhook-validation.js
```

**Expected output:**
```
Test 1: Sending webhook with VALID signature...
✅ Valid signature accepted (HTTP 200)

Test 2: Sending webhook with INVALID signature...
✅ Invalid signature rejected (HTTP 401)

Test 3: Sending webhook with NO signature...
✅ Missing signature rejected (HTTP 401)
```

### Test Event Processing

```bash
# Send a test webhook (with valid signature)
node src/jobs/test-webhook-validation.js

# Check database
psql -d insta_connect_demo -c "SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 5;"

# Process events
node src/jobs/process-webhooks.js

# Check updated status
psql -d insta_connect_demo -c "SELECT id, status, event_type, received_at FROM webhook_events ORDER BY received_at DESC LIMIT 5;"
```

## Deployment

### Option 1: Systemd Service (Recommended)

Create `/etc/systemd/system/webhook-processor.service`:

```ini
[Unit]
Description=Instagram Connect Demo - Webhook Processor
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/insta-connect-demo
ExecStart=/usr/bin/doppler run -- /usr/bin/node src/jobs/webhook-scheduler.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable webhook-processor.service
sudo systemctl start webhook-processor.service
sudo systemctl status webhook-processor.service
```

### Option 2: PM2

```bash
pm2 start src/jobs/webhook-scheduler.js --name webhook-processor
pm2 save
pm2 startup
```

### Option 3: Cron

```bash
# Edit crontab
crontab -e

# Add these lines
* * * * * cd /root/insta-connect-demo && /usr/bin/doppler run -- /usr/bin/node src/jobs/process-webhooks.js >> /var/log/webhook-processor.log 2>&1
```

## Monitoring

### Check Event Statistics

```sql
-- Overall stats
SELECT 
  status,
  COUNT(*) as count,
  MAX(received_at) as last_received
FROM webhook_events
GROUP BY status;

-- Recent events
SELECT id, status, event_type, received_at, retry_count
FROM webhook_events
ORDER BY received_at DESC
LIMIT 20;

-- Failed events
SELECT id, event_type, last_error, retry_count
FROM webhook_events
WHERE status = 'failed'
ORDER BY received_at DESC;

-- Dead letter events
SELECT id, event_type, last_error, retry_count
FROM webhook_events
WHERE status = 'dead_letter'
ORDER BY received_at DESC;
```

### Check Processor Logs

```bash
# Systemd service
sudo journalctl -u webhook-processor.service -f

# PM2
pm2 logs webhook-processor

# Cron
tail -f /var/log/webhook-processor.log
```

## Troubleshooting

### Signature Validation Fails

1. **Check APP_SECRET**: Ensure it matches Meta Developer Console
2. **Check Raw Body**: Signature must be computed on raw body, not parsed JSON
3. **Check Header**: Verify `X-Hub-Signature-256` header is present
4. **Test Locally**: Use `test-webhook-validation.js` to verify

### Events Not Processing

1. **Check Processor**: Ensure webhook-scheduler is running
2. **Check Database**: Verify events are being created
3. **Check Logs**: Look for errors in processor logs
4. **Manual Process**: Run `node src/jobs/process-webhooks.js` manually

### Events Stuck in Pending

1. **Check Processor**: Ensure it's running and not crashed
2. **Check Errors**: Look for errors in processor logs
3. **Manual Retry**: Use dashboard to manually retry
4. **Check Database**: Verify database connection is working

## Best Practices

1. **Monitor Dead Letter Queue**: Regularly check for events in dead letter queue
2. **Set Up Alerts**: Alert on high failure rates or dead letter events
3. **Clean Up Old Events**: Periodically delete old processed events
4. **Test Signature Validation**: Always test with real Meta webhooks
5. **Handle Duplicates**: Meta may send duplicate webhooks, handle idempotently
6. **Log Everything**: Keep detailed logs for debugging
7. **Scale Processing**: Increase BATCH_SIZE or run multiple processors for high volume

## Security Considerations

1. **Signature Validation**: Always validate signatures in production
2. **Timing-Safe Comparison**: Use `crypto.timingSafeEqual()` to prevent timing attacks
3. **Rate Limiting**: Consider rate limiting webhook endpoint
4. **Input Validation**: Validate payload structure before processing
5. **Error Handling**: Don't expose sensitive errors to webhook sender
6. **Access Control**: Dashboard requires authentication

