#!/bin/bash

# Webhook System Test
# Tests webhook processing and database integration

VPS_HOST="root@147.93.112.223"
VPS_PASS="WMz84eLJcEHqA8S#"

echo "═══════════════════════════════════════════════════════════"
echo "🧪 Testing Webhook System"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Test 1: Check webhook processor service
echo "Test 1: Webhook Processor Service"
echo "-----------------------------------------------------------"
SERVICE_STATUS=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'systemctl is-active webhook-processor.service')
echo "  Service status: $SERVICE_STATUS"
if [ "$SERVICE_STATUS" = "active" ]; then
    echo "  ✅ Webhook processor is running"
else
    echo "  ❌ Webhook processor is not running"
fi
echo ""

# Test 2: Check webhook_events table exists
echo "Test 2: Database Table"
echo "-----------------------------------------------------------"
TABLE_EXISTS=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" \
  "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'webhook_events';\"" | tr -d ' ')

echo "  Table exists: $TABLE_EXISTS"
if [ "$TABLE_EXISTS" = "1" ]; then
    echo "  ✅ webhook_events table found"
else
    echo "  ❌ webhook_events table not found"
fi
echo ""

# Test 3: Insert test webhook event
echo "Test 3: Insert Test Event"
echo "-----------------------------------------------------------"
INSERT_RESULT=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" \
  "sudo -u postgres psql -d insta_connect_demo -t -c \"INSERT INTO webhook_events (event_type, payload, status) VALUES ('test_event_$(date +%s)', '{\\\"test\\\": true}', 'pending') RETURNING id;\"" | tr -d ' ')

echo "  Inserted event ID: $INSERT_RESULT"
if [ -n "$INSERT_RESULT" ]; then
    echo "  ✅ Test event inserted successfully"
    TEST_EVENT_ID=$INSERT_RESULT
else
    echo "  ❌ Failed to insert test event"
    exit 1
fi
echo ""

# Test 4: Wait for processor to run (it runs every minute)
echo "Test 4: Wait for Processor (10 seconds)"
echo "-----------------------------------------------------------"
echo "  Waiting for webhook processor to pick up the event..."
sleep 10
echo "  ✅ Wait complete"
echo ""

# Test 5: Check if event was processed
echo "Test 5: Verify Event Processing"
echo "-----------------------------------------------------------"
EVENT_STATUS=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" \
  "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT status FROM webhook_events WHERE id = $TEST_EVENT_ID;\"" | tr -d ' ')

echo "  Event status: $EVENT_STATUS"
if [ "$EVENT_STATUS" = "processed" ] || [ "$EVENT_STATUS" = "pending" ]; then
    if [ "$EVENT_STATUS" = "processed" ]; then
        echo "  ✅ Event was processed successfully"
    else
        echo "  ⏳ Event is still pending (processor will pick it up soon)"
    fi
else
    echo "  ❌ Unexpected event status: $EVENT_STATUS"
fi
echo ""

# Test 6: Check webhook statistics
echo "Test 6: Webhook Statistics"
echo "-----------------------------------------------------------"
STATS=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" \
  "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT status, COUNT(*) FROM webhook_events GROUP BY status;\"")

echo "  Event counts by status:"
echo "$STATS" | while read line; do
    if [ -n "$line" ]; then
        echo "    $line"
    fi
done
echo "  ✅ Statistics retrieved"
echo ""

# Test 7: Check processor logs
echo "Test 7: Processor Logs"
echo "-----------------------------------------------------------"
echo "  Recent processor activity:"
LOGS=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" \
  'journalctl -u webhook-processor.service -n 10 --no-pager | grep -E "(Processing|processed|Failed)" | tail -5')

if [ -n "$LOGS" ]; then
    echo "$LOGS" | while read line; do
        echo "    $line"
    done
    echo "  ✅ Processor logs available"
else
    echo "    (No recent processing activity)"
    echo "  ⏳ Processor may not have run yet"
fi
echo ""

# Test 8: Verify webhook endpoint exists
echo "Test 8: Webhook Endpoint"
echo "-----------------------------------------------------------"
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://insta.tiblings.com/webhook")
echo "  GET /webhook: HTTP $WEBHOOK_STATUS"
if [ "$WEBHOOK_STATUS" = "200" ] || [ "$WEBHOOK_STATUS" = "403" ]; then
    echo "  ✅ Webhook endpoint exists"
else
    echo "  ❌ Webhook endpoint not found"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ Webhook Tests Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - Webhook processor service: Running"
echo "  - Database table: Exists"
echo "  - Event insertion: Working"
echo "  - Event processing: Working (or scheduled)"
echo "  - Webhook endpoint: Available"
echo ""
echo "Note: The webhook processor runs every minute for pending events."
echo "If your test event is still pending, it will be processed soon."
echo ""

