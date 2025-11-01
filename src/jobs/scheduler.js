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
const {
  processBatch,
  checkDeadLetterQueue,
  cleanupOldMessages,
  getQueueStats,
} = require('./process-message-queue');

console.log('═══════════════════════════════════════════════════════════');
console.log('⏰ Job Scheduler Started');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Started at: ${new Date().toISOString()}`);
console.log('');

/**
 * Token Refresh Job
 * Runs daily at 2:00 AM
 */
const tokenRefreshJob = cron.schedule(
  '0 2 * * *',
  async () => {
    console.log('\n🔄 Starting scheduled token refresh job...');
    try {
      await refreshTokens();
    } catch (error) {
      console.error('❌ Token refresh job failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

/**
 * Message Queue Processing Job
 * Runs every 30 seconds to process pending messages
 */
const messageQueueJob = cron.schedule(
  '*/30 * * * * *',
  async () => {
    try {
      await processBatch();
    } catch (error) {
      console.error('❌ Message queue processing job failed:', error);
    }
  },
  {
    scheduled: true,
  },
);

/**
 * Dead Letter Queue Check Job
 * Runs every 5 minutes to check for dead letter messages
 */
const deadLetterCheckJob = cron.schedule(
  '*/5 * * * *',
  async () => {
    try {
      await checkDeadLetterQueue();
    } catch (error) {
      console.error('❌ Dead letter check job failed:', error);
    }
  },
  {
    scheduled: true,
  },
);

/**
 * Message Queue Cleanup Job
 * Runs daily at 3:00 AM to clean up old messages
 */
const cleanupJob = cron.schedule(
  '0 3 * * *',
  async () => {
    console.log('\n🧹 Starting message queue cleanup job...');
    try {
      await cleanupOldMessages();
    } catch (error) {
      console.error('❌ Cleanup job failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

/**
 * Queue Statistics Job
 * Runs every 10 minutes to log queue statistics
 */
const statsJob = cron.schedule(
  '*/10 * * * *',
  async () => {
    try {
      await getQueueStats();
    } catch (error) {
      console.error('❌ Stats job failed:', error);
    }
  },
  {
    scheduled: true,
  },
);

console.log('📅 Scheduled Jobs:');
console.log('  - Token Refresh: Daily at 2:00 AM UTC');
console.log('  - Message Queue Processing: Every 30 seconds');
console.log('  - Dead Letter Check: Every 5 minutes');
console.log('  - Message Queue Cleanup: Daily at 3:00 AM UTC');
console.log('  - Queue Statistics: Every 10 minutes');
console.log('');
console.log('✅ Scheduler is running. Press Ctrl+C to stop.');
console.log('═══════════════════════════════════════════════════════════');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Stopping scheduler...');
  tokenRefreshJob.stop();
  messageQueueJob.stop();
  deadLetterCheckJob.stop();
  cleanupJob.stop();
  statsJob.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Stopping scheduler...');
  tokenRefreshJob.stop();
  messageQueueJob.stop();
  deadLetterCheckJob.stop();
  cleanupJob.stop();
  statsJob.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});
