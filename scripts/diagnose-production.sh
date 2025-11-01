#!/bin/bash

# Diagnose Production Server
# Checks the current state and identifies issues

PROD_SERVER="root@147.93.112.223"

echo "🔍 Diagnosing Production Server..."
echo ""

# Use sshpass if available, otherwise prompt for password
if command -v sshpass &> /dev/null; then
    SSH_CMD="sshpass -p 'WMz84eLJcEHqA8S#' ssh -o StrictHostKeyChecking=no"
else
    SSH_CMD="ssh"
    echo "Note: sshpass not installed. You'll be prompted for password."
    echo "Install with: brew install hudochenkov/sshpass/sshpass (macOS)"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking Git Repository"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$SSH_CMD $PROD_SERVER << 'ENDSSH'
if [ -d "/root/insta-connect-demo" ]; then
    echo "✅ Project directory exists"
    cd /root/insta-connect-demo
    
    echo ""
    echo "Current branch:"
    git branch --show-current
    
    echo ""
    echo "Git status:"
    git status --short
    
    echo ""
    echo "Last commit:"
    git log -1 --oneline
    
    echo ""
    echo "Remote URL:"
    git remote -v | head -1
else
    echo "❌ Project directory not found at /root/insta-connect-demo"
fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$SSH_CMD $PROD_SERVER << 'ENDSSH'
echo "Backend service (insta-connect):"
if systemctl is-active --quiet insta-connect; then
    echo "✅ Running"
    systemctl status insta-connect --no-pager | grep "Active:"
else
    echo "❌ Not running"
fi

echo ""
echo "Frontend service (insta-connect-frontend):"
if systemctl is-active --quiet insta-connect-frontend 2>/dev/null; then
    echo "✅ Running"
    systemctl status insta-connect-frontend --no-pager | grep "Active:"
else
    echo "⚠️  Not running (may not be created yet)"
fi

echo ""
echo "Nginx service:"
if systemctl is-active --quiet nginx; then
    echo "✅ Running"
    systemctl status nginx --no-pager | grep "Active:"
else
    echo "❌ Not running"
fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$SSH_CMD $PROD_SERVER << 'ENDSSH'
echo "Port 3000 (Backend):"
if lsof -i :3000 &>/dev/null; then
    echo "✅ In use"
    lsof -i :3000 | head -2
else
    echo "❌ Not in use"
fi

echo ""
echo "Port 3001 (Frontend):"
if lsof -i :3001 &>/dev/null; then
    echo "✅ In use"
    lsof -i :3001 | head -2
else
    echo "⚠️  Not in use (frontend not running)"
fi

echo ""
echo "Port 443 (HTTPS):"
if lsof -i :443 &>/dev/null; then
    echo "✅ In use"
    lsof -i :443 | head -2
else
    echo "❌ Not in use"
fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Frontend Directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$SSH_CMD $PROD_SERVER << 'ENDSSH'
if [ -d "/root/insta-connect-demo/frontend" ]; then
    echo "✅ Frontend directory exists"
    cd /root/insta-connect-demo/frontend
    
    echo ""
    echo "Node modules:"
    if [ -d "node_modules" ]; then
        echo "✅ Installed"
    else
        echo "❌ Not installed"
    fi
    
    echo ""
    echo "Build directory:"
    if [ -d ".next" ]; then
        echo "✅ Built"
        ls -lh .next/BUILD_ID 2>/dev/null || echo "Build ID not found"
    else
        echo "❌ Not built"
    fi
    
    echo ""
    echo "Environment file:"
    if [ -f ".env.production" ]; then
        echo "✅ Exists"
        cat .env.production
    else
        echo "⚠️  Not found"
    fi
else
    echo "❌ Frontend directory not found"
fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Checking Nginx Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$SSH_CMD $PROD_SERVER << 'ENDSSH'
if [ -f "/etc/nginx/sites-available/insta-connect" ]; then
    echo "✅ Config file exists"
    echo ""
    echo "Checking for Next.js proxy configuration:"
    if grep -q "proxy_pass.*3001" /etc/nginx/sites-available/insta-connect; then
        echo "✅ Next.js proxy configured (port 3001)"
    else
        echo "⚠️  Next.js proxy not configured"
    fi
    
    echo ""
    echo "Testing Nginx config:"
    nginx -t 2>&1 | tail -2
else
    echo "❌ Config file not found"
fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Testing Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Testing HTTPS endpoint:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    echo "✅ Site accessible (HTTP $HTTP_CODE)"
else
    echo "⚠️  Site returned HTTP $HTTP_CODE"
fi

echo ""
echo "Testing health endpoint:"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://insta.tiblings.com/health 2>/dev/null || echo "000")
if [ "$HEALTH_CODE" = "200" ]; then
    echo "✅ Health check passed (HTTP $HEALTH_CODE)"
else
    echo "⚠️  Health check returned HTTP $HEALTH_CODE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Diagnosis Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

