#!/bin/bash

# N8N Integration Deployment Script
# This script deploys the N8N integration to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_SERVER="root@147.93.112.223"
PROD_DIR="/root/insta-connect-demo"
PROD_PASSWORD="WMz84eLJcEHqA8S#"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}N8N Integration Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1: Pre-deployment Checks${NC}"
echo "Checking git status..."
if [ -n "$(git status --short)" ]; then
    echo -e "${RED}❌ Uncommitted changes detected. Please commit all changes first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git status clean${NC}"
echo ""

# Step 2: Run tests locally
echo -e "${YELLOW}Step 2: Running Tests Locally${NC}"
echo "Running npm test..."
if npm test 2>&1 | tail -20; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed. Please fix errors before deploying.${NC}"
    exit 1
fi
echo ""

# Step 3: SSH into production and deploy
echo -e "${YELLOW}Step 3: Deploying to Production${NC}"
echo "Connecting to production server..."

sshpass -p "$PROD_PASSWORD" ssh -o StrictHostKeyChecking=no "$PROD_SERVER" << 'DEPLOY_SCRIPT'
set -e

echo "📦 Pulling latest code..."
cd /root/insta-connect-demo
git stash
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "📦 Running database migrations..."
doppler run -- node src/db/migrate.js

echo "✅ Migration completed successfully"

echo "🔄 Restarting backend service..."
systemctl restart insta-connect.service

echo "⏳ Waiting for service to start..."
sleep 3

echo "✅ Service restarted"

echo "📊 Checking service status..."
systemctl status insta-connect.service --no-pager | head -10

echo "✅ Deployment completed successfully!"
DEPLOY_SCRIPT

echo -e "${GREEN}✅ Deployment to production completed${NC}"
echo ""

# Step 4: Verify deployment
echo -e "${YELLOW}Step 4: Verifying Deployment${NC}"

echo "Checking backend health..."
if sshpass -p "$PROD_PASSWORD" ssh -o StrictHostKeyChecking=no "$PROD_SERVER" "curl -s http://localhost:3000/health" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi

echo "Checking webhook events endpoint..."
if sshpass -p "$PROD_PASSWORD" ssh -o StrictHostKeyChecking=no "$PROD_SERVER" "curl -s http://localhost:3000/api/webhook-events?limit=1 -H 'Cookie: connect.sid=test'" | grep -q "webhook"; then
    echo -e "${GREEN}✅ Webhook events endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook events endpoint check inconclusive${NC}"
fi

echo "Checking N8N metrics endpoint..."
if sshpass -p "$PROD_PASSWORD" ssh -o StrictHostKeyChecking=no "$PROD_SERVER" "curl -s http://localhost:3000/api/n8n/metrics -H 'Cookie: connect.sid=test'" | grep -q "metrics"; then
    echo -e "${GREEN}✅ N8N metrics endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠️  N8N metrics endpoint check inconclusive${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Create N8N workflow (see docs/N8N_WORKFLOW_SETUP.md)"
echo "2. Configure N8N_WEBHOOK_URL in Doppler"
echo "3. Set N8N_ENABLED=true in Doppler"
echo "4. Test end-to-end flow"
echo "5. Monitor metrics at: https://insta.tiblings.com/api/n8n/metrics"
echo ""

