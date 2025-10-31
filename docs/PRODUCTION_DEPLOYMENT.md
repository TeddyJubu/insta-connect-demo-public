# Production Deployment Guide - Stage 2

This guide walks through deploying Stage 2 (Persistence & Sessions) to the production VPS at **insta.tiblings.com** (147.93.112.223).

## Prerequisites

- SSH access to VPS: `root@147.93.112.223`
- Doppler CLI configured for project `insta-connect-demo`, config `dev_insta`
- Git repository access

## Deployment Steps

### Step 1: Install PostgreSQL on VPS

SSH into the VPS and install PostgreSQL:

```bash
# SSH into VPS
ssh root@147.93.112.223

# Update package list
apt update

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Check PostgreSQL status
systemctl status postgresql

# Enable PostgreSQL to start on boot
systemctl enable postgresql
```

### Step 2: Create Database and User

Create the production database:

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE insta_connect_demo;
CREATE USER insta_app WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE insta_connect_demo TO insta_app;

# Grant schema permissions
\c insta_connect_demo
GRANT ALL ON SCHEMA public TO insta_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insta_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO insta_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO insta_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO insta_app;

# Exit PostgreSQL
\q
```

**Important:** Replace `CHANGE_THIS_SECURE_PASSWORD` with a strong password. Save this password for the next step.

### Step 3: Add Database Credentials to Doppler

Add the database configuration to Doppler:

```bash
# On your local machine
doppler secrets set DB_HOST localhost --project insta-connect-demo --config dev_insta
doppler secrets set DB_PORT 5432 --project insta-connect-demo --config dev_insta
doppler secrets set DB_NAME insta_connect_demo --project insta-connect-demo --config dev_insta
doppler secrets set DB_USER insta_app --project insta-connect-demo --config dev_insta
doppler secrets set DB_PASSWORD 'YOUR_SECURE_PASSWORD' --project insta-connect-demo --config dev_insta
doppler secrets set DB_SSL false --project insta-connect-demo --config dev_insta
doppler secrets set SESSION_SECRET 'GENERATE_RANDOM_32_CHAR_STRING' --project insta-connect-demo --config dev_insta
```

**Generate secure passwords:**
```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Use the password you created in Step 2 for DB_PASSWORD
```

### Step 4: Run Database Migrations

On the VPS, navigate to the project directory and run migrations:

```bash
# SSH into VPS
ssh root@147.93.112.223

# Navigate to project directory
cd /root/insta-connect-demo

# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Run migrations
doppler run -- node src/db/migrate.js
```

**Expected output:**
```
🗄️  Running database migrations...
✅ Database schema created successfully!
```

### Step 5: Verify Database Setup

Check that all tables were created:

```bash
# On VPS
sudo -u postgres psql -d insta_connect_demo -c "\dt"
```

**Expected output:**
```
                    List of relations
 Schema |         Name          | Type  |   Owner   
--------+-----------------------+-------+-----------
 public | instagram_accounts    | table | insta_app
 public | meta_accounts         | table | insta_app
 public | pages                 | table | insta_app
 public | sessions              | table | insta_app
 public | token_refresh_log     | table | insta_app
 public | users                 | table | insta_app
 public | webhook_events        | table | insta_app
 public | webhook_subscriptions | table | insta_app
```

### Step 6: Update Application Service

Restart the main application to use the new database:

```bash
# On VPS
systemctl restart insta-connect-demo.service

# Check status
systemctl status insta-connect-demo.service

# View logs
journalctl -u insta-connect-demo.service -f
```

### Step 7: Deploy Token Refresh Service

Set up the token refresh scheduler:

```bash
# On VPS
cd /root/insta-connect-demo

# Copy systemd service file
cp deployment/token-refresh.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable and start the service
systemctl enable token-refresh.service
systemctl start token-refresh.service

# Check status
systemctl status token-refresh.service

# View logs
journalctl -u token-refresh.service -f
```

**Expected output:**
```
● token-refresh.service - Instagram Connect Demo - Token Refresh Job Scheduler
   Loaded: loaded (/etc/systemd/system/token-refresh.service; enabled)
   Active: active (running)
```

### Step 8: Test Production Deployment

#### 8.1 Test Authentication

1. Visit https://insta.tiblings.com
2. You should see the login/register page
3. Click "Sign Up" and create a test account
4. Verify you're redirected to the main app after registration
5. Test logout and login again

#### 8.2 Test Database Persistence

```bash
# On VPS, check that user was created
sudo -u postgres psql -d insta_connect_demo -c "SELECT id, email, created_at FROM users;"
```

#### 8.3 Test OAuth Flow

1. Log in to the app
2. Click "Connect Instagram"
3. Complete the OAuth flow
4. Verify the connection shows in the app

```bash
# On VPS, check that data was saved
sudo -u postgres psql -d insta_connect_demo -c "SELECT * FROM meta_accounts;"
sudo -u postgres psql -d insta_connect_demo -c "SELECT * FROM pages;"
sudo -u postgres psql -d insta_connect_demo -c "SELECT * FROM instagram_accounts;"
```

#### 8.4 Test Token Refresh

```bash
# On VPS, run token refresh in dry-run mode
cd /root/insta-connect-demo
doppler run -- node src/jobs/refresh-tokens.js --dry-run
```

**Expected output:**
```
═══════════════════════════════════════════════════════════
🔐 Meta Token Refresh Job
═══════════════════════════════════════════════════════════
Started: 2025-10-31T23:00:00.000Z
Refresh threshold: 7 days
Mode: DRY RUN (no changes)

🔄 Refreshing Meta account tokens...
Found 0 Meta account(s) with tokens expiring within 7 days

✅ Meta accounts: 0 refreshed, 0 failed
...
```

### Step 9: Monitor Services

Set up monitoring for both services:

```bash
# Check application service
systemctl status insta-connect-demo.service

# Check token refresh service
systemctl status token-refresh.service

# View application logs
journalctl -u insta-connect-demo.service -f

# View token refresh logs
journalctl -u token-refresh.service -f

# Check database connections
sudo -u postgres psql -d insta_connect_demo -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'insta_connect_demo';"
```

## Troubleshooting

### PostgreSQL Not Starting

```bash
# Check PostgreSQL status
systemctl status postgresql

# View PostgreSQL logs
journalctl -u postgresql -f

# Restart PostgreSQL
systemctl restart postgresql
```

### Database Connection Errors

```bash
# Check PostgreSQL is listening
sudo -u postgres psql -c "SHOW listen_addresses;"

# Check database exists
sudo -u postgres psql -l | grep insta_connect_demo

# Test connection
sudo -u postgres psql -d insta_connect_demo -c "SELECT 1;"
```

### Migration Errors

```bash
# Check if tables already exist
sudo -u postgres psql -d insta_connect_demo -c "\dt"

# Drop and recreate database (WARNING: destroys all data)
sudo -u postgres psql -c "DROP DATABASE insta_connect_demo;"
sudo -u postgres psql -c "CREATE DATABASE insta_connect_demo;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE insta_connect_demo TO insta_app;"

# Run migrations again
cd /root/insta-connect-demo
doppler run -- node src/db/migrate.js
```

### Token Refresh Service Not Running

```bash
# Check service status
systemctl status token-refresh.service

# View logs
journalctl -u token-refresh.service -n 50

# Restart service
systemctl restart token-refresh.service

# Check if node-cron is installed
cd /root/insta-connect-demo
npm list node-cron
```

### Application Can't Connect to Database

```bash
# Check Doppler secrets are loaded
cd /root/insta-connect-demo
doppler secrets --project insta-connect-demo --config dev_insta | grep DB_

# Test database connection manually
doppler run -- node -e "const db = require('./src/db'); db.query('SELECT 1').then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e));"
```

## Rollback Plan

If deployment fails, rollback to previous version:

```bash
# On VPS
cd /root/insta-connect-demo

# Stop services
systemctl stop token-refresh.service
systemctl stop insta-connect-demo.service

# Checkout previous version
git log --oneline -10  # Find previous commit
git checkout <previous-commit-hash>

# Reinstall dependencies
npm install

# Restart services
systemctl start insta-connect-demo.service
# Don't start token-refresh if database isn't set up
```

## Post-Deployment Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created with correct permissions
- [ ] Database credentials added to Doppler
- [ ] Migrations run successfully
- [ ] All 8 tables created
- [ ] Application service restarted
- [ ] Token refresh service running
- [ ] Authentication works (register/login/logout)
- [ ] OAuth flow saves data to database
- [ ] Token refresh dry-run works
- [ ] Services monitored and logging correctly

## Next Steps

After successful deployment:

1. **Set up database backups**:
   ```bash
   # Create backup script
   sudo -u postgres pg_dump insta_connect_demo > /root/backups/insta_connect_demo_$(date +%Y%m%d).sql
   ```

2. **Set up monitoring alerts** for:
   - Database connection failures
   - Token refresh failures
   - Service downtime

3. **Proceed to Stage 3**: Webhook Handling

