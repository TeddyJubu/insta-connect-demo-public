#!/bin/bash

# Test Webhook Dashboard
# Tests the webhook dashboard API endpoints with authentication

set -e

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/webhook-test-cookie.txt"

echo "🧪 Testing Webhook Dashboard..."
echo ""

# Clean up old cookie file
rm -f "$COOKIE_FILE"

# Test 1: Register a test user
echo "1️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/register" \
  -d "email=webhook-test@example.com" \
  -d "password=TestPass123!" \
  -d "confirmPassword=TestPass123!" \
  2>&1 || true)

if echo "$REGISTER_RESPONSE" | grep -q "email already exists"; then
  echo "   ✅ User already exists, logging in..."
  
  # Login instead
  curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/login" \
    -d "email=webhook-test@example.com" \
    -d "password=TestPass123!" \
    > /dev/null
else
  echo "   ✅ User registered successfully"
fi

# Test 2: Get webhook stats
echo ""
echo "2️⃣  Getting webhook stats..."
STATS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/webhook-events/stats")
echo "   Response: $STATS"

if echo "$STATS" | grep -q "total"; then
  echo "   ✅ Webhook stats endpoint working"
else
  echo "   ❌ Webhook stats endpoint failed"
  exit 1
fi

# Test 3: Get webhook events
echo ""
echo "3️⃣  Getting webhook events..."
EVENTS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/webhook-events?limit=10")
echo "   Response: $EVENTS"

if echo "$EVENTS" | grep -q "events"; then
  echo "   ✅ Webhook events endpoint working"
else
  echo "   ❌ Webhook events endpoint failed"
  exit 1
fi

# Test 4: Get webhook events with status filter
echo ""
echo "4️⃣  Getting pending webhook events..."
PENDING=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/webhook-events?status=pending&limit=10")

if echo "$PENDING" | grep -q "events"; then
  echo "   ✅ Webhook events filtering working"
else
  echo "   ❌ Webhook events filtering failed"
  exit 1
fi

# Clean up
rm -f "$COOKIE_FILE"

echo ""
echo "✅ All webhook dashboard tests passed!"
echo ""

