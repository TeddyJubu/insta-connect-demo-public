#!/bin/bash

# Quick Production Verification Script

VPS_HOST="root@147.93.112.223"
VPS_PASS="WMz84eLJcEHqA8S#"

echo "═══════════════════════════════════════════════════════════"
echo "🚀 Quick Production Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Check PostgreSQL
echo "1. PostgreSQL Status:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'systemctl is-active postgresql' && echo "   ✓ Running" || echo "   ✗ Not running"
echo ""

# 2. Check database tables
echo "2. Database Tables:"
TABLE_COUNT=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';\"" | tr -d ' ')
echo "   Found $TABLE_COUNT tables (expected 8)"
echo ""

# 3. Check application service
echo "3. Application Service:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'systemctl is-active insta-connect-demo' && echo "   ✓ Running" || echo "   ✗ Not running"
echo ""

# 4. Check if server is listening
echo "4. Server Listening on Port 3000:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'ss -tlnp | grep -q ":3000"' && echo "   ✓ Yes" || echo "   ✗ No"
echo ""

# 5. Check Nginx
echo "5. Nginx Status:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'systemctl is-active nginx' && echo "   ✓ Running" || echo "   ✗ Not running"
echo ""

# 6. Check SSL certificate
echo "6. SSL Certificate:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'test -f /etc/letsencrypt/live/insta.tiblings.com/fullchain.pem && echo "exists"' | grep -q "exists" && echo "   ✓ Found" || echo "   ⚠ Not found"
echo ""

# 7. Check Stage 2 files
echo "7. Stage 2 Files:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'test -d /root/insta-connect-demo/src/db && echo "exists"' | grep -q "exists" && echo "   ✓ Database modules found" || echo "   ✗ Not found"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'test -f /root/insta-connect-demo/src/routes/auth.js && echo "exists"' | grep -q "exists" && echo "   ✓ Auth routes found" || echo "   ✗ Not found"
echo ""

# 8. Check Stage 3 files
echo "8. Stage 3 Files:"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'test -f /root/insta-connect-demo/src/middleware/webhookValidation.js && echo "exists"' | grep -q "exists" && echo "   ✓ Webhook validation found" || echo "   ✗ Not found"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" 'test -f /root/insta-connect-demo/src/models/WebhookEvent.js && echo "exists"' | grep -q "exists" && echo "   ✓ WebhookEvent model found" || echo "   ✗ Not found"
echo ""

# 9. Test HTTPS endpoint
echo "9. HTTPS Endpoint Test:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ HTTPS working (HTTP $HTTP_CODE)"
else
    echo "   ⚠ HTTPS returned HTTP $HTTP_CODE"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ Verification Complete"
echo "═══════════════════════════════════════════════════════════"

