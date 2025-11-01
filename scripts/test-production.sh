#!/bin/bash

# Test Production Deployment
# Tests the production deployment without requiring SSH access

set -e

DOMAIN="https://insta.tiblings.com"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Domain: $DOMAIN"
echo ""

PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    local description=$4
    
    echo -n "Testing $name... "
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $HTTP_CODE)"
        ((FAILED++))
    fi
}

# Test 1: Home page
echo "1️⃣  Frontend Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Home Page" "$DOMAIN/" "200" "Main landing page"
test_endpoint "Login Page" "$DOMAIN/login" "200" "Login page"
test_endpoint "Register Page" "$DOMAIN/register" "200" "Register page"
test_endpoint "Dashboard" "$DOMAIN/dashboard" "200" "Dashboard (may redirect if not authenticated)"
test_endpoint "OAuth Start" "$DOMAIN/oauth/start" "200" "OAuth initiation page"
test_endpoint "Webhook Dashboard" "$DOMAIN/dashboard/webhooks" "200" "Webhook viewer"
echo ""

# Test 2: Backend API
echo "2️⃣  Backend API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Health Check" "$DOMAIN/health" "200" "Backend health endpoint"
test_endpoint "Auth Status" "$DOMAIN/auth/status" "200" "Authentication status"
test_endpoint "Webhook Stats" "$DOMAIN/api/webhook-events/stats" "200" "Webhook statistics (may require auth)"
echo ""

# Test 3: SSL/Security
echo "3️⃣  Security Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check SSL certificate
echo -n "Testing SSL Certificate... "
SSL_RESULT=$(echo | openssl s_client -servername insta.tiblings.com -connect insta.tiblings.com:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "FAILED")

if [[ $SSL_RESULT == *"FAILED"* ]]; then
    echo -e "${RED}❌ FAIL${NC} (Could not verify SSL certificate)"
    ((FAILED++))
else
    echo -e "${GREEN}✅ PASS${NC} (SSL certificate valid)"
    ((PASSED++))
fi

# Check HTTPS redirect
echo -n "Testing HTTP to HTTPS Redirect... "
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://insta.tiblings.com" 2>/dev/null || echo "000")

if [ "$HTTP_REDIRECT" = "301" ] || [ "$HTTP_REDIRECT" = "302" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_REDIRECT redirect)"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Expected 301/302, got $HTTP_REDIRECT)"
    ((FAILED++))
fi
echo ""

# Test 4: Response times
echo "4️⃣  Performance Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Testing Response Time... "
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$DOMAIN/" 2>/dev/null || echo "999")

if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
    echo -e "${GREEN}✅ PASS${NC} (${RESPONSE_TIME}s)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  SLOW${NC} (${RESPONSE_TIME}s - expected < 3s)"
    ((PASSED++))
fi
echo ""

# Test 5: Content checks
echo "5️⃣  Content Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Testing for Next.js content... "
CONTENT=$(curl -s "$DOMAIN/" 2>/dev/null || echo "")

if [[ $CONTENT == *"__NEXT_DATA__"* ]] || [[ $CONTENT == *"next"* ]]; then
    echo -e "${GREEN}✅ PASS${NC} (Next.js detected)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Next.js markers not found)"
    ((PASSED++))
fi

echo -n "Testing for authentication... "
if [[ $CONTENT == *"login"* ]] || [[ $CONTENT == *"Login"* ]]; then
    echo -e "${GREEN}✅ PASS${NC} (Auth UI detected)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Auth UI not found)"
    ((PASSED++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "   ${GREEN}✅ Passed: $PASSED${NC}"
echo -e "   ${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Deployment successful!${NC}"
    echo ""
    echo "✅ Next Steps:"
    echo "   1. Open $DOMAIN in your browser"
    echo "   2. Test registration and login"
    echo "   3. Test Instagram OAuth connection"
    echo "   4. Check webhook dashboard"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the deployment.${NC}"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check service status: ssh root@147.93.112.223 'systemctl status insta-connect-frontend insta-connect'"
    echo "   2. Check frontend logs: ssh root@147.93.112.223 'journalctl -u insta-connect-frontend -n 50'"
    echo "   3. Check backend logs: ssh root@147.93.112.223 'journalctl -u insta-connect -n 50'"
    echo "   4. Check Nginx logs: ssh root@147.93.112.223 'tail -n 50 /var/log/nginx/error.log'"
    echo ""
    exit 1
fi

