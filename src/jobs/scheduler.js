#!/usr/bin/env node

/**
 * Job Scheduler
 * 
 * This script runs scheduled jobs using node-cron.
 * It should be started with the main application or as a separate process.
 * 
 * Jobs:
 * - Token Refresh: Runs daily at 2:00 AM to refresh expiring Meta tokens
 * 
 * Usage:
 *   node src/jobs/scheduler.js
 */

require('dotenv').config();
const cron = require('node-cron');
const { main: refreshTokens } = require('./refresh-tokens');

console.log('═══════════════════════════════════════════════════════════');
console.log('⏰ Job Scheduler Started');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Started at: ${new Date().toISOString()}`);
console.log('');

/**
 * Token Refresh Job
 * Runs daily at 2:00 AM
 */
const tokenRefreshJob = cron.schedule('0 2 * * *', async () => {
  console.log('\n🔄 Starting scheduled token refresh job...');
  try {
    await refreshTokens();
  } catch (error) {
    console.error('❌ Token refresh job failed:', error);
  }
}, {
  scheduled: true,
  timezone: 'UTC'
});

console.log('📅 Scheduled Jobs:');
console.log('  - Token Refresh: Daily at 2:00 AM UTC');
console.log('');
console.log('✅ Scheduler is running. Press Ctrl+C to stop.');
console.log('═══════════════════════════════════════════════════════════');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Stopping scheduler...');
  tokenRefreshJob.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Stopping scheduler...');
  tokenRefreshJob.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

