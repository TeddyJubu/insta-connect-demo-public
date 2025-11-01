#!/bin/bash

# Test Authentication System
# This script tests the complete authentication flow

BASE_URL="https://insta.tiblings.com"
COOKIE_FILE="/tmp/insta-test-cookies.txt"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo "═══════════════════════════════════════════════════════════"
echo "🧪 Testing Authentication System"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Clean up old cookies
rm -f "$COOKIE_FILE"

# Test 1: Check if auth endpoints exist
echo "Test 1: Check Auth Endpoints"
echo "-----------------------------------------------------------"

# Check register endpoint
REGISTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/register")
echo "  /auth/register: HTTP $REGISTER_STATUS"

# Check login endpoint
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/login")
echo "  /auth/login: HTTP $LOGIN_STATUS"

# Check status endpoint
STATUS_RESPONSE=$(curl -s "$BASE_URL/auth/status")
echo "  /auth/status: $STATUS_RESPONSE"
echo ""

# Test 2: Register new user
echo "Test 2: Register New User"
echo "-----------------------------------------------------------"

REGISTER_RESPONSE=$(curl -s -L -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/register" \
  -d "email=$TEST_EMAIL" \
  -d "password=$TEST_PASSWORD" \
  -d "confirmPassword=$TEST_PASSWORD")

# Check if registration was successful (redirects to home page)
if echo "$REGISTER_RESPONSE" | grep -q "Instagram Connect Demo"; then
    echo "  ✅ Registration successful (redirected to home)"
else
    echo "  Response preview: $(echo "$REGISTER_RESPONSE" | head -c 200)"
    echo "  ❌ Registration failed"
    echo ""
    echo "Stopping tests due to registration failure."
    exit 1
fi
echo ""

# Test 3: Check authentication status (should be logged in)
echo "Test 3: Check Auth Status After Registration"
echo "-----------------------------------------------------------"

STATUS_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/auth/status")
echo "  Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q "authenticated.*true"; then
    echo "  ✅ User is authenticated"
else
    echo "  ❌ User is not authenticated"
fi
echo ""

# Test 4: Logout
echo "Test 4: Logout"
echo "-----------------------------------------------------------"

LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/logout")
echo "  Response: $LOGOUT_RESPONSE"

if echo "$LOGOUT_RESPONSE" | grep -q "success"; then
    echo "  ✅ Logout successful"
else
    echo "  ❌ Logout failed"
fi
echo ""

# Test 5: Check auth status after logout (should not be authenticated)
echo "Test 5: Check Auth Status After Logout"
echo "-----------------------------------------------------------"

STATUS_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/auth/status")
echo "  Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q "authenticated.*false"; then
    echo "  ✅ User is not authenticated (correct)"
else
    echo "  ❌ User is still authenticated (incorrect)"
fi
echo ""

# Test 6: Login with credentials
echo "Test 6: Login with Credentials"
echo "-----------------------------------------------------------"

LOGIN_RESPONSE=$(curl -s -L -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/login" \
  -d "email=$TEST_EMAIL" \
  -d "password=$TEST_PASSWORD")

if echo "$LOGIN_RESPONSE" | grep -q "Instagram Connect Demo"; then
    echo "  ✅ Login successful (redirected to home)"
else
    echo "  Response preview: $(echo "$LOGIN_RESPONSE" | head -c 200)"
    echo "  ❌ Login failed"
fi
echo ""

# Test 7: Check auth status after login (should be authenticated)
echo "Test 7: Check Auth Status After Login"
echo "-----------------------------------------------------------"

STATUS_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/auth/status")
echo "  Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q "authenticated.*true"; then
    echo "  ✅ User is authenticated"
else
    echo "  ❌ User is not authenticated"
fi
echo ""

# Test 8: Test wrong password
echo "Test 8: Test Wrong Password"
echo "-----------------------------------------------------------"

# Logout first
curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/logout" > /dev/null

WRONG_LOGIN_RESPONSE=$(curl -s -L -X POST "$BASE_URL/auth/login" \
  -d "email=$TEST_EMAIL" \
  -d "password=WrongPassword123!")

if echo "$WRONG_LOGIN_RESPONSE" | grep -q "error="; then
    echo "  ✅ Wrong password rejected (correct)"
else
    echo "  Response preview: $(echo "$WRONG_LOGIN_RESPONSE" | head -c 200)"
    echo "  ❌ Wrong password accepted (incorrect)"
fi
echo ""

# Test 9: Test non-existent user
echo "Test 9: Test Non-Existent User"
echo "-----------------------------------------------------------"

NONEXIST_LOGIN_RESPONSE=$(curl -s -L -X POST "$BASE_URL/auth/login" \
  -d "email=nonexistent@example.com" \
  -d "password=Password123!")

if echo "$NONEXIST_LOGIN_RESPONSE" | grep -q "error="; then
    echo "  ✅ Non-existent user rejected (correct)"
else
    echo "  Response preview: $(echo "$NONEXIST_LOGIN_RESPONSE" | head -c 200)"
    echo "  ❌ Non-existent user accepted (incorrect)"
fi
echo ""

# Clean up
rm -f "$COOKIE_FILE"

echo "═══════════════════════════════════════════════════════════"
echo "✅ Authentication Tests Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Test user created: $TEST_EMAIL"
echo "You can use this account to test the OAuth flow manually."
echo ""

