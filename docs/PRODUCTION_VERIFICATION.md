# Production Deployment Verification Checklist

This document provides step-by-step verification procedures for Stage 2 and Stage 3 deployments.

## Prerequisites

- SSH access to production VPS: `root@147.93.112.223`
- Production domain: `insta.tiblings.com`
- Doppler project: `insta-connect-demo` (config: `dev_insta`)

---

## Stage 2 Verification: Persistence & Sessions

### 1. Verify PostgreSQL Installation

```bash
# SSH into production server
ssh root@147.93.112.223

# Check PostgreSQL status
systemctl status postgresql

# Expected: Active (running)
```

**✅ Pass Criteria:** PostgreSQL service is active and running

---

### 2. Verify Database and Tables

```bash
# Connect to database
sudo -u postgres psql -d insta_connect_demo

# List all tables
\dt

# Expected output: 8 tables
# - users
# - meta_accounts
# - pages
# - instagram_accounts
# - webhook_subscriptions
# - webhook_events
# - token_refresh_log
# - sessions

# Check table schemas
\d users
\d meta_accounts
\d webhook_events

# Exit psql
\q
```

**✅ Pass Criteria:** All 8 tables exist with correct schemas

---

### 3. Verify Database Connection from Application

```bash
# Check application logs for database connection
journalctl -u insta-connect-demo -n 50 | grep -i "database\|postgres"

# Expected: No connection errors
```

**✅ Pass Criteria:** No database connection errors in logs

---

### 4. Test Authentication System

**Via Browser:**

1. Visit `https://insta.tiblings.com`
2. Click "Register" or navigate to `/auth/register`
3. Create a test account:
   - Email: `test@example.com`
   - Password: `testpassword123`
4. Verify successful registration and automatic login
5. Check user info bar shows email
6. Click "Logout"
7. Login again with same credentials
8. Verify successful login

**Via API:**

```bash
# Test registration endpoint
curl -X POST https://insta.tiblings.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"api-test@example.com","password":"testpass123","confirmPassword":"testpass123"}'

# Expected: 302 redirect or success response

# Test login endpoint
curl -X POST https://insta.tiblings.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"api-test@example.com","password":"testpass123"}' \
  -c cookies.txt

# Expected: 302 redirect with session cookie

# Test authenticated endpoint
curl https://insta.tiblings.com/auth/status \
  -b cookies.txt

# Expected: {"authenticated":true,"email":"api-test@example.com"}
```

**✅ Pass Criteria:** Registration, login, and logout work correctly

---

### 5. Verify Session Storage

```bash
# Check sessions table
sudo -u postgres psql -d insta_connect_demo -c "SELECT COUNT(*) FROM sessions;"

# Expected: At least 1 session (from your test login)

# View session details
sudo -u postgres psql -d insta_connect_demo -c "SELECT sid, expire FROM sessions LIMIT 5;"
```

**✅ Pass Criteria:** Sessions are being stored in PostgreSQL

---

### 6. Verify Token Refresh Service

```bash
# Check if token refresh service is running
systemctl status token-refresh.service

# OR check if timer is active
systemctl status token-refresh.timer

# Check token refresh logs
journalctl -u token-refresh.service -n 50

# OR for timer-based
journalctl -u token-refresh-oneshot.service -n 50
```

**✅ Pass Criteria:** Token refresh service/timer is active

---

### 7. Test Token Refresh Manually

```bash
# Run token refresh in dry-run mode
cd /root/insta-connect-demo
doppler run -- node src/jobs/refresh-tokens.js --dry-run

# Expected: Script runs without errors, shows tokens that would be refreshed

# Check token refresh log table
sudo -u postgres psql -d insta_connect_demo -c "SELECT * FROM token_refresh_log ORDER BY refreshed_at DESC LIMIT 5;"
```

**✅ Pass Criteria:** Token refresh script runs successfully

---

### 8. Verify Application Service

```bash
# Check application service status
systemctl status insta-connect-demo

# Expected: Active (running)

# Check recent logs
journalctl -u insta-connect-demo -n 100

# Expected: No critical errors, server started successfully

# Check if server is listening on port 3000
netstat -tlnp | grep 3000

# Expected: Node process listening on port 3000
```

**✅ Pass Criteria:** Application service is running without errors

---

## Stage 3 Verification: Webhook Handling

### 1. Verify Webhook Signature Validation

**Test with valid signature:**

```bash
# Generate test webhook with valid signature
cd /root/insta-connect-demo
doppler run -- node src/jobs/test-webhook-validation.js

# Expected output:
# Test 1: ✅ Valid signature accepted (HTTP 200)
# Test 2: ✅ Invalid signature rejected (HTTP 401)
# Test 3: ✅ Missing signature rejected (HTTP 401)
```

**✅ Pass Criteria:** All 3 signature validation tests pass

---

### 2. Verify Webhook Event Queueing

```bash
# After running test-webhook-validation.js, check database
sudo -u postgres psql -d insta_connect_demo -c "SELECT id, event_type, status, received_at FROM webhook_events ORDER BY received_at DESC LIMIT 5;"

# Expected: At least 1 event with status 'pending'
```

**✅ Pass Criteria:** Webhook events are being queued in database

---

### 3. Verify Webhook Processor Service

```bash
# Check if webhook processor is running
systemctl status webhook-processor.service

# OR check if running via PM2
pm2 list | grep webhook

# Check processor logs
journalctl -u webhook-processor.service -n 50

# OR for PM2
pm2 logs webhook-processor --lines 50
```

**✅ Pass Criteria:** Webhook processor service is running

---

### 4. Test Webhook Processing

```bash
# Process webhooks manually
cd /root/insta-connect-demo
doppler run -- node src/jobs/process-webhooks.js

# Expected: Processes pending events, shows statistics

# Check updated event statuses
sudo -u postgres psql -d insta_connect_demo -c "SELECT id, status, processed_at, retry_count FROM webhook_events ORDER BY received_at DESC LIMIT 5;"

# Expected: Events moved from 'pending' to 'processed'
```

**✅ Pass Criteria:** Webhook events are processed successfully

---

### 5. Verify Webhook Dashboard

**Via Browser:**

1. Visit `https://insta.tiblings.com`
2. Login with your test account
3. Scroll to "Webhook Events" section
4. Verify statistics cards show correct counts
5. Verify event list displays recent events
6. Click on an event to view details
7. Test status filter dropdown
8. Click "Refresh" button

**Via API:**

```bash
# Get webhook statistics
curl https://insta.tiblings.com/api/webhook-events/stats \
  -b cookies.txt

# Expected: {"total":X,"pending":X,"processed":X,"failed":X,"dead_letter":X}

# Get webhook events
curl https://insta.tiblings.com/api/webhook-events \
  -b cookies.txt

# Expected: {"events":[...],"total":X,"limit":50,"offset":0}
```

**✅ Pass Criteria:** Webhook dashboard displays events correctly

---

### 6. Test Webhook Retry Logic

```bash
# Create a failing event (manually update database)
sudo -u postgres psql -d insta_connect_demo -c "UPDATE webhook_events SET status = 'failed', retry_count = 1, last_error = 'Test error' WHERE id = 1;"

# Run processor to retry
doppler run -- node src/jobs/process-webhooks.js

# Check if event was retried
sudo -u postgres psql -d insta_connect_demo -c "SELECT id, status, retry_count, last_error FROM webhook_events WHERE id = 1;"
```

**✅ Pass Criteria:** Failed events are retried with incremented retry_count

---

### 7. Test Dead Letter Queue

```bash
# Create an event with max retries
sudo -u postgres psql -d insta_connect_demo -c "UPDATE webhook_events SET status = 'failed', retry_count = 3, last_error = 'Max retries test' WHERE id = 1;"

# Run processor
doppler run -- node src/jobs/process-webhooks.js

# Check if moved to dead letter
sudo -u postgres psql -d insta_connect_demo -c "SELECT id, status, retry_count FROM webhook_events WHERE id = 1;"

# Expected: status = 'dead_letter'
```

**✅ Pass Criteria:** Events with max retries move to dead_letter status

---

### 8. Test Manual Retry from Dashboard

**Via Browser:**

1. Visit webhook dashboard
2. Find a failed or dead_letter event
3. Click "Retry" button
4. Confirm retry
5. Verify event status changes to 'pending'
6. Wait for processor to run
7. Verify event is processed

**Via API:**

```bash
# Retry event via API
curl -X POST https://insta.tiblings.com/api/webhook-events/1/retry \
  -b cookies.txt

# Expected: {"message":"Event queued for retry","event":{...}}
```

**✅ Pass Criteria:** Manual retry resets event to pending

---

## Overall Verification Summary

### Stage 2 Checklist

- [ ] PostgreSQL is running
- [ ] All 8 database tables exist
- [ ] Application connects to database successfully
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Sessions are stored in PostgreSQL
- [ ] Token refresh service is running
- [ ] Token refresh script executes successfully
- [ ] Application service is running without errors

### Stage 3 Checklist

- [ ] Webhook signature validation works (all 3 tests pass)
- [ ] Webhook events are queued in database
- [ ] Webhook processor service is running
- [ ] Webhook events are processed successfully
- [ ] Webhook dashboard displays statistics
- [ ] Webhook dashboard displays event list
- [ ] Event details modal works
- [ ] Retry logic works (exponential backoff)
- [ ] Dead letter queue works (after max retries)
- [ ] Manual retry from dashboard works

---

## Troubleshooting

### PostgreSQL Not Running

```bash
# Start PostgreSQL
systemctl start postgresql

# Enable on boot
systemctl enable postgresql
```

### Database Tables Missing

```bash
# Run migration
cd /root/insta-connect-demo
doppler run -- node src/db/migrate.js
```

### Application Service Not Running

```bash
# Check logs for errors
journalctl -u insta-connect-demo -n 100

# Restart service
systemctl restart insta-connect-demo
```

### Token Refresh Service Not Running

```bash
# For systemd service
systemctl start token-refresh.service

# For systemd timer
systemctl start token-refresh.timer
```

### Webhook Processor Not Running

```bash
# For systemd service
systemctl start webhook-processor.service

# For PM2
pm2 start src/jobs/webhook-scheduler.js --name webhook-processor
```

---

## Next Steps After Verification

Once all verification steps pass:

1. Mark Stage 2 and Stage 3 as complete in `agent.md`
2. Update `task.md` with completion notes
3. Proceed to Stage 4: Frontend & User Experience

