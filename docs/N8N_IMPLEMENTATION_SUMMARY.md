# N8N Integration Implementation Summary

## Overview

This document summarizes the complete N8N integration implementation for Instagram AI message processing.

## What Was Implemented

### 1. Database Schema (✅ Complete)

**File**: `src/db/schema.sql`

Created `message_processing_queue` table with:
- Message tracking fields (sender_id, recipient_id, message_text)
- N8N integration fields (n8n_workflow_id, n8n_execution_id)
- Status tracking (pending, processing, ready_to_send, sent, failed, dead_letter)
- Retry logic fields (retry_count, max_retries, last_error, next_retry_at)
- Timestamps for audit trail

### 2. Environment Variables (✅ Complete)

**File**: `.env`

Added N8N configuration:
- `N8N_ENABLED`: Enable/disable N8N integration
- `N8N_WEBHOOK_URL`: N8N webhook endpoint
- `N8N_CALLBACK_SECRET`: Secret for callback validation
- `N8N_TIMEOUT_MS`: Request timeout (30 seconds)

### 3. API Endpoints (✅ Complete)

**File**: `src/routes/webhookDashboard.js`

Implemented 7 new endpoints:
- `POST /api/n8n/callback`: Receive AI responses from N8N
- `GET /api/n8n/status/:messageId`: Check message processing status
- `POST /api/n8n/retry/:messageId`: Manually retry failed messages
- `GET /api/n8n/queue`: View message processing queue
- `GET /api/n8n/metrics`: Get detailed metrics
- `GET /api/n8n/metrics/summary`: Get metrics summary
- `GET /api/n8n/metrics/alerts`: Get active alerts

### 4. MessageQueue Model (✅ Complete)

**File**: `src/models/MessageQueue.js`

Implemented CRUD operations:
- `create()`: Create new queue entry
- `findById()`: Find by ID
- `findByMessageId()`: Find by Instagram message ID
- `findByStatus()`: Find by processing status
- `findByPageId()`: Find by page
- `updateStatus()`: Update message status
- `incrementRetry()`: Increment retry count with exponential backoff
- `getReadyForRetry()`: Get messages ready for retry
- `getStats()`: Get queue statistics
- `deleteOlderThan()`: Clean up old messages

### 5. N8N Integration Service (✅ Complete)

**File**: `src/services/n8nIntegration.js`

Implemented core functions:
- `extractMessageData()`: Parse Instagram webhook payload
- `forwardToN8N()`: Send message to N8N with timeout handling
- `sendInstagramReply()`: Send AI response back to Instagram
- `processQueueItem()`: Process queue item (forward or send reply)

### 6. Webhook Handler Modification (✅ Complete)

**File**: `server.js`

Updated webhook handler to:
- Extract message data asynchronously
- Create queue entry
- Forward to N8N if enabled
- Maintain immediate 200 response to Meta

### 7. Error Handling & Retry Logic (✅ Complete)

**File**: `src/jobs/process-message-queue.js`

Implemented:
- Batch processing with configurable batch size
- Exponential backoff retry strategy
- Dead letter queue for failed messages
- Automatic cleanup of old messages
- Queue statistics logging

### 8. Security Measures (✅ Complete)

**File**: `src/middleware/n8nSecurity.js`

Implemented:
- Callback secret validation with constant-time comparison
- Rate limiting for N8N endpoints (100 req/15min for callback, 50 req/15min for queue)
- Security logging for suspicious requests
- Timing attack prevention

### 9. Tests (✅ Complete)

**Files**: 
- `tests/n8n-integration.spec.js`: Unit tests for service functions
- `tests/n8n-endpoints.spec.js`: Integration tests for API endpoints

Covers:
- Message data extraction
- N8N forwarding
- Callback validation
- Rate limiting
- Queue operations
- Error handling

### 10. Monitoring & Logging (✅ Complete)

**File**: `src/utils/n8nMetrics.js`

Implemented metrics tracking:
- Messages received/processed/failed/retried
- Response times (average, N8N-specific)
- Success/error rates
- Dead letter count
- Alert generation for high error rates
- Metrics reset capability

### 11. N8N Workflow Setup (✅ Complete)

**File**: `docs/N8N_WORKFLOW_SETUP.md`

Comprehensive guide for:
- Creating N8N workflow
- Configuring webhook trigger
- Adding code node for data extraction
- Integrating OpenAI Chat Model
- Setting up HTTP callback
- Error handling
- Testing and troubleshooting

### 12. Deployment Guide (✅ Complete)

**File**: `docs/DEPLOYMENT_GUIDE.md`

Covers:
- Pre-deployment checklist
- Step-by-step deployment process
- Environment variable configuration
- Service restart procedures
- Verification steps
- End-to-end testing
- Rollback procedures
- Troubleshooting guide
- Performance monitoring

## Architecture

```
Instagram Message
    ↓
Webhook Handler (server.js)
    ↓
MessageQueue.create() [async]
    ↓
forwardToN8N() [if enabled]
    ↓
N8N Workflow
    ├─ Extract Data
    ├─ OpenAI Processing
    └─ HTTP Callback
    ↓
/api/n8n/callback
    ↓
MessageQueue.updateStatus()
    ↓
Background Job (process-message-queue.js)
    ├─ Check for ready messages
    ├─ Send to Instagram
    └─ Update status
    ↓
Instagram Reply
```

## Key Features

### ✅ Bidirectional Communication
- Instagram → N8N → Instagram reply flow
- Callback validation with secret header
- Asynchronous processing

### ✅ Robust Error Handling
- Exponential backoff retry strategy
- Dead letter queue for failed messages
- Timeout handling (30 seconds for N8N, 60 seconds for processing)
- Comprehensive error logging

### ✅ Security
- Callback secret validation
- Rate limiting on all N8N endpoints
- Security logging for suspicious requests
- Constant-time string comparison for secrets

### ✅ Monitoring & Observability
- Real-time metrics tracking
- Success/error rate calculation
- Response time monitoring
- Alert generation for high failure rates
- Structured logging for all events

### ✅ Production Ready
- Database migrations
- Cron job scheduling
- Batch processing
- Automatic cleanup
- Comprehensive testing
- Deployment guides

## Database Schema

```sql
CREATE TABLE message_processing_queue (
  id SERIAL PRIMARY KEY,
  webhook_event_id INTEGER REFERENCES webhook_events(id),
  page_id INTEGER REFERENCES pages(id),
  instagram_id VARCHAR(255),
  sender_id VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(255) NOT NULL,
  message_text TEXT,
  message_id VARCHAR(255),
  n8n_workflow_id VARCHAR(255),
  n8n_execution_id VARCHAR(255),
  ai_response TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  sent_to_n8n_at TIMESTAMP WITH TIME ZONE,
  received_from_n8n_at TIMESTAMP WITH TIME ZONE,
  sent_to_instagram_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

```bash
# N8N Integration Configuration
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/instagram-message
N8N_CALLBACK_SECRET=your-secure-callback-secret
N8N_TIMEOUT_MS=30000
```

## Cron Jobs

- **Message Queue Processing**: Every 30 seconds
- **Dead Letter Check**: Every 5 minutes
- **Queue Statistics**: Every 10 minutes
- **Message Cleanup**: Daily at 3:00 AM UTC

## Testing

Run tests with:
```bash
npm test
```

Tests cover:
- Message data extraction
- N8N webhook forwarding
- Callback validation
- Rate limiting
- Queue operations
- Error handling
- End-to-end flows

## Deployment

1. Run database migrations
2. Update environment variables in Doppler
3. Restart backend service
4. Create N8N workflow
5. Test end-to-end flow
6. Monitor metrics and logs

See `docs/DEPLOYMENT_GUIDE.md` for detailed steps.

## Monitoring

Access metrics at:
- `GET /api/n8n/metrics`: Detailed metrics
- `GET /api/n8n/metrics/summary`: Summary with alerts
- `GET /api/n8n/metrics/alerts`: Active alerts only

## Files Modified/Created

### Modified Files
- `server.js`: Added N8N integration to webhook handler
- `src/routes/webhookDashboard.js`: Added N8N endpoints and security middleware
- `src/jobs/scheduler.js`: Added N8N processing cron jobs
- `.env`: Added N8N configuration variables
- `src/db/schema.sql`: Added message_processing_queue table
- `src/db/migrate.js`: Added migration for new table
- `package.json`: Added express-rate-limit dependency

### New Files
- `src/models/MessageQueue.js`: Queue model
- `src/services/n8nIntegration.js`: N8N integration service
- `src/middleware/n8nSecurity.js`: Security middleware
- `src/jobs/process-message-queue.js`: Background job processor
- `src/utils/n8nMetrics.js`: Metrics tracking
- `tests/n8n-integration.spec.js`: Unit tests
- `tests/n8n-endpoints.spec.js`: Integration tests
- `docs/N8N_WORKFLOW_SETUP.md`: Workflow setup guide
- `docs/DEPLOYMENT_GUIDE.md`: Deployment guide
- `docs/N8N_IMPLEMENTATION_SUMMARY.md`: This file

## Next Steps

1. ✅ Review all code changes
2. ✅ Run tests locally
3. ⏳ Create N8N workflow (manual step)
4. ⏳ Deploy to production
5. ⏳ Test end-to-end flow
6. ⏳ Monitor metrics and logs
7. ⏳ Optimize based on performance data

## Support

For questions or issues:
1. Review the relevant documentation file
2. Check logs: `journalctl -u insta-connect.service`
3. Check N8N logs: N8N dashboard → Settings → Logs
4. Review test files for usage examples
5. Contact team for assistance

