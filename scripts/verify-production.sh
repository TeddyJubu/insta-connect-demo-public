#!/bin/bash

# Production Verification Script
# Verifies Stage 2 and Stage 3 deployment on production VPS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "$1"
    echo "═══════════════════════════════════════════════════════════"
}

# Configuration
VPS_HOST="root@147.93.112.223"
VPS_PASS="WMz84eLJcEHqA8S#"
PROJECT_DIR="/root/insta-connect-demo"

# SSH command wrapper
ssh_exec() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" "$@"
}

section "🚀 Production Verification - Stage 2 & 3"

# ============================================================================
# Stage 2 Verification: Persistence & Sessions
# ============================================================================

section "📊 Stage 2: Persistence & Sessions"

# 1. Check PostgreSQL
info "Checking PostgreSQL status..."
if ssh_exec "systemctl is-active postgresql" | grep -q "active"; then
    pass "PostgreSQL is running"
else
    fail "PostgreSQL is not running"
fi

# 2. Check database exists
info "Checking database exists..."
if ssh_exec "sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw insta_connect_demo"; then
    pass "Database 'insta_connect_demo' exists"
else
    fail "Database 'insta_connect_demo' not found"
fi

# 3. Check tables
info "Checking database tables..."
TABLE_COUNT=$(ssh_exec "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';\"" | tr -d ' ')
if [ "$TABLE_COUNT" -ge 8 ]; then
    pass "Found $TABLE_COUNT tables (expected 8+)"
else
    fail "Found only $TABLE_COUNT tables (expected 8+)"
fi

# List tables
info "Tables found:"
ssh_exec "sudo -u postgres psql -d insta_connect_demo -c '\dt'" | grep -E "users|meta_accounts|pages|instagram_accounts|webhook_subscriptions|webhook_events|token_refresh_log|sessions" || true

# 4. Check application service
info "Checking application service..."
if ssh_exec "systemctl is-active insta-connect-demo" | grep -q "active"; then
    pass "Application service is running"
else
    fail "Application service is not running"
fi

# 5. Check application logs for errors
info "Checking application logs for recent errors..."
ERROR_COUNT=$(ssh_exec "journalctl -u insta-connect-demo -n 100 --no-pager | grep -i 'error' | wc -l" | tr -d ' ')
if [ "$ERROR_COUNT" -eq 0 ]; then
    pass "No errors in recent application logs"
else
    warn "Found $ERROR_COUNT error messages in recent logs"
fi

# 6. Check token refresh service
info "Checking token refresh service..."
if ssh_exec "systemctl is-active token-refresh.service 2>/dev/null" | grep -q "active"; then
    pass "Token refresh service is running"
elif ssh_exec "systemctl is-active token-refresh.timer 2>/dev/null" | grep -q "active"; then
    pass "Token refresh timer is active"
else
    warn "Token refresh service/timer not found (may not be deployed yet)"
fi

# 7. Check if Node.js dependencies are installed
info "Checking Node.js dependencies..."
if ssh_exec "test -d $PROJECT_DIR/node_modules && echo 'exists'" | grep -q "exists"; then
    pass "Node.js dependencies installed"
else
    fail "Node.js dependencies not found"
fi

# 8. Check if database models exist
info "Checking database models..."
if ssh_exec "test -f $PROJECT_DIR/src/models/User.js && echo 'exists'" | grep -q "exists"; then
    pass "Database models found"
else
    fail "Database models not found"
fi

# ============================================================================
# Stage 3 Verification: Webhook Handling
# ============================================================================

section "📨 Stage 3: Webhook Handling"

# 1. Check webhook validation middleware
info "Checking webhook validation middleware..."
if ssh_exec "test -f $PROJECT_DIR/src/middleware/webhookValidation.js && echo 'exists'" | grep -q "exists"; then
    pass "Webhook validation middleware found"
else
    fail "Webhook validation middleware not found"
fi

# 2. Check webhook event model
info "Checking webhook event model..."
if ssh_exec "test -f $PROJECT_DIR/src/models/WebhookEvent.js && echo 'exists'" | grep -q "exists"; then
    pass "WebhookEvent model found"
else
    fail "WebhookEvent model not found"
fi

# 3. Check webhook processor
info "Checking webhook processor..."
if ssh_exec "test -f $PROJECT_DIR/src/jobs/process-webhooks.js && echo 'exists'" | grep -q "exists"; then
    pass "Webhook processor found"
else
    fail "Webhook processor not found"
fi

# 4. Check webhook events table
info "Checking webhook_events table..."
if ssh_exec "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT COUNT(*) FROM webhook_events;\"" &>/dev/null; then
    EVENT_COUNT=$(ssh_exec "sudo -u postgres psql -d insta_connect_demo -t -c \"SELECT COUNT(*) FROM webhook_events;\"" | tr -d ' ')
    pass "webhook_events table exists ($EVENT_COUNT events)"
else
    fail "webhook_events table not found"
fi

# 5. Check webhook processor service
info "Checking webhook processor service..."
if ssh_exec "systemctl is-active webhook-processor.service 2>/dev/null" | grep -q "active"; then
    pass "Webhook processor service is running"
elif ssh_exec "pm2 list 2>/dev/null | grep -q webhook-processor"; then
    pass "Webhook processor running via PM2"
else
    warn "Webhook processor service not found (may not be deployed yet)"
fi

# 6. Check webhook dashboard routes
info "Checking webhook dashboard routes..."
if ssh_exec "test -f $PROJECT_DIR/src/routes/webhookDashboard.js && echo 'exists'" | grep -q "exists"; then
    pass "Webhook dashboard routes found"
else
    fail "Webhook dashboard routes not found"
fi

# ============================================================================
# Application Health Checks
# ============================================================================

section "🏥 Application Health Checks"

# 1. Check if server is listening on port 3000
info "Checking if server is listening on port 3000..."
if ssh_exec "netstat -tlnp 2>/dev/null | grep -q ':3000'" || ssh_exec "ss -tlnp 2>/dev/null | grep -q ':3000'"; then
    pass "Server is listening on port 3000"
else
    fail "Server is not listening on port 3000"
fi

# 2. Check Nginx status
info "Checking Nginx status..."
if ssh_exec "systemctl is-active nginx 2>/dev/null" | grep -q "active"; then
    pass "Nginx is running"
else
    warn "Nginx is not running"
fi

# 3. Check SSL certificate
info "Checking SSL certificate..."
if ssh_exec "test -f /etc/letsencrypt/live/insta.tiblings.com/fullchain.pem && echo 'exists'" | grep -q "exists"; then
    pass "SSL certificate found"
else
    warn "SSL certificate not found"
fi

# 4. Check Doppler configuration
info "Checking Doppler configuration..."
if ssh_exec "test -f /etc/insta-connect-demo/doppler.env && echo 'exists'" | grep -q "exists"; then
    pass "Doppler service token found"
else
    warn "Doppler service token not found"
fi

# ============================================================================
# Summary
# ============================================================================

section "📊 Verification Summary"

echo ""
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test authentication at https://insta.tiblings.com"
    echo "2. Deploy webhook processor service if not running"
    echo "3. Test webhook validation with test script"
    echo "4. Proceed to Stage 4: Frontend & User Experience"
    exit 0
else
    echo -e "${YELLOW}⚠ Some checks failed. Review the output above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Run database migration: cd $PROJECT_DIR && doppler run -- node src/db/migrate.js"
    echo "2. Install dependencies: cd $PROJECT_DIR && npm install"
    echo "3. Restart services: systemctl restart insta-connect-demo"
    exit 1
fi

