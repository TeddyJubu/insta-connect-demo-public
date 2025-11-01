require('dotenv').config();
const cron = require('node-cron');
const { processPendingEvents, processRetryableEvents } = require('./process-webhooks');

/**
 * Webhook Processing Scheduler
 *
 * This script runs the webhook processor on a schedule:
 * - Every minute: Process pending events
 * - Every 5 minutes: Retry failed events
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('⏰ Webhook Processing Scheduler Started');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Started at: ${new Date().toISOString()}`);
console.log('');
console.log('📅 Scheduled Jobs:');
console.log('  - Process Pending: Every minute');
console.log('  - Process Retries: Every 5 minutes');
console.log('');
console.log('✅ Scheduler is running. Press Ctrl+C to stop.');
console.log('═══════════════════════════════════════════════════════════');

// Process pending events every minute
const pendingJob = cron.schedule(
  '* * * * *',
  async () => {
    console.log('\n🔄 Running scheduled pending events processing...');
    try {
      await processPendingEvents();
    } catch (error) {
      console.error('❌ Pending events processing failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

// Process retryable events every 5 minutes
const retryJob = cron.schedule(
  '*/5 * * * *',
  async () => {
    console.log('\n🔄 Running scheduled retry processing...');
    try {
      await processRetryableEvents();
    } catch (error) {
      console.error('❌ Retry processing failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, stopping scheduler...');
  pendingJob.stop();
  retryJob.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, stopping scheduler...');
  pendingJob.stop();
  retryJob.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

// Keep the process running
process.stdin.resume();
