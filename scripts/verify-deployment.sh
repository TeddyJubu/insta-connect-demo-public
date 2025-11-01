#!/bin/bash

# Verify Frontend Deployment
# Checks if the frontend is deployed and running correctly

set -e

echo "🔍 Verifying Frontend Deployment..."
echo ""

PROD_SERVER="root@147.93.112.223"
DOMAIN="https://insta.tiblings.com"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if frontend service is running
echo "1️⃣  Checking frontend service status..."
if ssh $PROD_SERVER 'systemctl is-active --quiet insta-connect-frontend'; then
    echo -e "   ${GREEN}✅ Frontend service is running${NC}"
else
    echo -e "   ${RED}❌ Frontend service is not running${NC}"
    echo "   Run: ssh $PROD_SERVER 'systemctl status insta-connect-frontend'"
fi
echo ""

# Test 2: Check if backend service is running
echo "2️⃣  Checking backend service status..."
if ssh $PROD_SERVER 'systemctl is-active --quiet insta-connect'; then
    echo -e "   ${GREEN}✅ Backend service is running${NC}"
else
    echo -e "   ${RED}❌ Backend service is not running${NC}"
    echo "   Run: ssh $PROD_SERVER 'systemctl status insta-connect'"
fi
echo ""

# Test 3: Check if ports are listening
echo "3️⃣  Checking if services are listening on ports..."
FRONTEND_PORT=$(ssh $PROD_SERVER 'lsof -ti:3001 | wc -l')
BACKEND_PORT=$(ssh $PROD_SERVER 'lsof -ti:3000 | wc -l')

if [ "$FRONTEND_PORT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Frontend listening on port 3001${NC}"
else
    echo -e "   ${RED}❌ Nothing listening on port 3001${NC}"
fi

if [ "$BACKEND_PORT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Backend listening on port 3000${NC}"
else
    echo -e "   ${RED}❌ Nothing listening on port 3000${NC}"
fi
echo ""

# Test 4: Check Nginx configuration
echo "4️⃣  Checking Nginx configuration..."
if ssh $PROD_SERVER 'nginx -t 2>&1' | grep -q 'successful'; then
    echo -e "   ${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "   ${RED}❌ Nginx configuration has errors${NC}"
fi
echo ""

# Test 5: Test HTTPS endpoint
echo "5️⃣  Testing HTTPS endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Site is accessible (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo -e "   ${YELLOW}⚠️  Site redirecting (HTTP $HTTP_CODE)${NC}"
else
    echo -e "   ${RED}❌ Site returned HTTP $HTTP_CODE${NC}"
fi
echo ""

# Test 6: Test health endpoint
echo "6️⃣  Testing health endpoint..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/health)
if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Health check passed (HTTP $HEALTH_CODE)${NC}"
else
    echo -e "   ${RED}❌ Health check failed (HTTP $HEALTH_CODE)${NC}"
fi
echo ""

# Test 7: Check recent logs for errors
echo "7️⃣  Checking recent logs for errors..."
FRONTEND_ERRORS=$(ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -n 50 --no-pager | grep -i error | wc -l')
BACKEND_ERRORS=$(ssh $PROD_SERVER 'journalctl -u insta-connect -n 50 --no-pager | grep -i error | wc -l')

if [ "$FRONTEND_ERRORS" -eq 0 ]; then
    echo -e "   ${GREEN}✅ No frontend errors in recent logs${NC}"
else
    echo -e "   ${YELLOW}⚠️  Found $FRONTEND_ERRORS frontend errors in recent logs${NC}"
    echo "   Run: ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -n 50'"
fi

if [ "$BACKEND_ERRORS" -eq 0 ]; then
    echo -e "   ${GREEN}✅ No backend errors in recent logs${NC}"
else
    echo -e "   ${YELLOW}⚠️  Found $BACKEND_ERRORS backend errors in recent logs${NC}"
    echo "   Run: ssh $PROD_SERVER 'journalctl -u insta-connect -n 50'"
fi
echo ""

# Test 8: Test API endpoints
echo "8️⃣  Testing API endpoints..."

# Test auth status
AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/auth/status)
if [ "$AUTH_CODE" = "200" ] || [ "$AUTH_CODE" = "401" ]; then
    echo -e "   ${GREEN}✅ Auth endpoint responding (HTTP $AUTH_CODE)${NC}"
else
    echo -e "   ${RED}❌ Auth endpoint failed (HTTP $AUTH_CODE)${NC}"
fi

# Test webhook stats
WEBHOOK_CODE=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/api/webhook-events/stats)
if [ "$WEBHOOK_CODE" = "200" ] || [ "$WEBHOOK_CODE" = "401" ]; then
    echo -e "   ${GREEN}✅ Webhook API responding (HTTP $WEBHOOK_CODE)${NC}"
else
    echo -e "   ${RED}❌ Webhook API failed (HTTP $WEBHOOK_CODE)${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Application URL: $DOMAIN"
echo ""
echo "📝 Quick Commands:"
echo "   View frontend logs: ssh $PROD_SERVER 'journalctl -u insta-connect-frontend -f'"
echo "   View backend logs:  ssh $PROD_SERVER 'journalctl -u insta-connect -f'"
echo "   Restart frontend:   ssh $PROD_SERVER 'systemctl restart insta-connect-frontend'"
echo "   Restart backend:    ssh $PROD_SERVER 'systemctl restart insta-connect'"
echo ""

