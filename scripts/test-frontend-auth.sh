#!/bin/bash

# Test Frontend Authentication Flow
# Tests the Next.js frontend authentication pages

set -e

echo "🧪 Testing Frontend Authentication Flow"
echo "========================================"
echo ""

BASE_URL="http://localhost:3001"
BACKEND_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
        ((FAILED++))
    fi
}

echo "1. Testing Next.js Frontend Pages"
echo "-----------------------------------"

# Test home page (should redirect)
test_endpoint "Home page" "$BASE_URL/" 200

# Test login page
test_endpoint "Login page" "$BASE_URL/login" 200

# Test register page
test_endpoint "Register page" "$BASE_URL/register" 200

echo ""
echo "2. Testing Backend API (via proxy)"
echo "-----------------------------------"

# Test auth status endpoint
test_endpoint "Auth status endpoint" "$BASE_URL/auth/status" 200

# Test direct backend
test_endpoint "Backend health check" "$BACKEND_URL/auth/status" 200

echo ""
echo "3. Testing Static Assets"
echo "------------------------"

# Test if Next.js is serving properly
response=$(curl -s "$BASE_URL/login" | grep -o "Sign in" | head -1)
if [ "$response" = "Sign in" ]; then
    echo -e "Login page content: ${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "Login page content: ${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

response=$(curl -s "$BASE_URL/register" | grep -o "Create your account" | head -1)
if [ "$response" = "Create your account" ]; then
    echo -e "Register page content: ${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "Register page content: ${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "========================================"
echo "📊 Test Results"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🌐 Frontend is running at: http://localhost:3001"
    echo "🔧 Backend is running at: http://localhost:3000"
    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:3001 in your browser"
    echo "2. Try registering a new account"
    echo "3. Try logging in"
    echo "4. Check that redirects work properly"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

