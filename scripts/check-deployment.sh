#!/bin/bash

# Quick deployment check without SSH password

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking Deployment Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Testing HTTPS endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com)
echo "   Status: HTTP $HTTP_CODE"

echo ""
echo "2. Checking page content..."
CONTENT=$(curl -s https://insta.tiblings.com | head -5)
if echo "$CONTENT" | grep -q "<!DOCTYPE html>"; then
    echo "   ✅ HTML page is being served"
    if echo "$CONTENT" | grep -q "Next.js"; then
        echo "   ✅ Next.js app detected"
    else
        echo "   ⚠️  Static HTML detected (not Next.js)"
    fi
else
    echo "   ❌ No HTML content"
fi

echo ""
echo "3. Testing backend health (direct)..."
HEALTH=$(curl -s http://147.93.112.223:3000/health 2>&1)
if echo "$HEALTH" | grep -q "ok"; then
    echo "   ✅ Backend is responding"
else
    echo "   ⚠️  Backend not responding on port 3000"
fi

echo ""
echo "4. Testing frontend (direct)..."
FRONTEND=$(curl -s -I http://147.93.112.223:3001 2>&1 | head -1)
if echo "$FRONTEND" | grep -q "200"; then
    echo "   ✅ Frontend is responding on port 3001"
elif echo "$FRONTEND" | grep -q "Connection refused"; then
    echo "   ❌ Frontend not running on port 3001"
else
    echo "   ⚠️  Frontend status: $FRONTEND"
fi

echo ""
echo "5. Testing API endpoints..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com/api/auth/status)
echo "   /api/auth/status: HTTP $API_CODE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Site is accessible"
else
    echo "❌ Site is not accessible properly"
fi

echo ""
echo "To check service status on server, run:"
echo "  ssh root@147.93.112.223 'systemctl status insta-connect-frontend'"
echo ""
echo "To view logs:"
echo "  ssh root@147.93.112.223 'journalctl -u insta-connect-frontend -n 50'"
echo ""

