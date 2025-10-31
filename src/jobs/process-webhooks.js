require('dotenv').config();
const WebhookEvent = require('../models/WebhookEvent');

/**
 * Webhook Event Processor
 * 
 * This script processes pending webhook events from the database.
 * It implements retry logic with exponential backoff and dead-letter handling.
 * 
 * Processing flow:
 * 1. Fetch pending events from database
 * 2. Process each event (extract data, validate, etc.)
 * 3. Mark as processed or failed
 * 4. Retry failed events with backoff
 * 5. Move to dead-letter queue after max retries
 */

// Configuration
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;
const RETRY_DELAYS = [
  1000,   // 1 second
  5000,   // 5 seconds
  30000,  // 30 seconds
];

/**
 * Process a single webhook event
 * @param {Object} event - Webhook event from database
 * @returns {Promise<void>}
 */
async function processEvent(event) {
  console.log(`\n📨 Processing event ${event.id}...`);
  console.log(`  Type: ${event.event_type}`);
  console.log(`  Received: ${event.received_at}`);
  console.log(`  Retry count: ${event.retry_count}`);

  try {
    // Mark as processing
    await WebhookEvent.markProcessing(event.id);

    // Parse the payload
    const payload = typeof event.payload === 'string' 
      ? JSON.parse(event.payload) 
      : event.payload;

    // Process based on event type
    // In a real application, you would:
    // - Extract relevant data from the payload
    // - Store messages, comments, mentions in your database
    // - Trigger notifications or other business logic
    // - Call external APIs if needed

    console.log('  Payload:', JSON.stringify(payload, null, 2));

    // Example: Extract Instagram messaging events
    if (payload.object === 'instagram') {
      for (const entry of payload.entry || []) {
        console.log(`  Processing entry for Instagram ID: ${entry.id}`);
        
        // Process messaging events
        if (entry.messaging) {
          for (const message of entry.messaging) {
            console.log(`    Message from: ${message.sender?.id}`);
            console.log(`    Message text: ${message.message?.text || '(no text)'}`);
            
            // TODO: Store message in database
            // TODO: Trigger notification
            // TODO: Auto-reply if needed
          }
        }

        // Process changes (comments, mentions, etc.)
        if (entry.changes) {
          for (const change of entry.changes) {
            console.log(`    Change field: ${change.field}`);
            console.log(`    Change value:`, change.value);
            
            // TODO: Process based on field type
            // - comments: Store comment, notify user
            // - mentions: Store mention, notify user
            // - story_insights: Update analytics
          }
        }
      }
    }

    // Mark as processed
    await WebhookEvent.markProcessed(event.id);
    console.log(`✅ Event ${event.id} processed successfully`);

  } catch (error) {
    console.error(`❌ Error processing event ${event.id}:`, error.message);

    // Check if we should retry or move to dead letter
    if (event.retry_count >= MAX_RETRIES - 1) {
      // Max retries reached, move to dead letter
      await WebhookEvent.moveToDeadLetter(event.id, error.message);
      console.log(`💀 Event ${event.id} moved to dead letter queue`);
    } else {
      // Mark as failed and increment retry count
      await WebhookEvent.markFailed(event.id, error.message, true);
      console.log(`🔄 Event ${event.id} marked for retry (attempt ${event.retry_count + 1}/${MAX_RETRIES})`);
    }
  }
}

/**
 * Process pending events
 * @returns {Promise<Object>} Processing results
 */
async function processPendingEvents() {
  console.log('\n🔄 Fetching pending events...');
  
  const events = await WebhookEvent.findPending(BATCH_SIZE);
  
  if (events.length === 0) {
    console.log('No pending events to process');
    return { processed: 0, failed: 0 };
  }

  console.log(`Found ${events.length} pending event(s)`);

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await processEvent(event);
      processed++;
    } catch (error) {
      console.error(`Failed to process event ${event.id}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Process retryable failed events
 * @returns {Promise<Object>} Processing results
 */
async function processRetryableEvents() {
  console.log('\n🔄 Fetching retryable failed events...');
  
  const events = await WebhookEvent.findRetryable(MAX_RETRIES, BATCH_SIZE);
  
  if (events.length === 0) {
    console.log('No retryable events to process');
    return { processed: 0, failed: 0 };
  }

  console.log(`Found ${events.length} retryable event(s)`);

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    // Calculate delay based on retry count
    const delay = RETRY_DELAYS[event.retry_count] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    
    console.log(`⏳ Waiting ${delay}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await processEvent(event);
      processed++;
    } catch (error) {
      console.error(`Failed to retry event ${event.id}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Main processing function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📬 Webhook Event Processor');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Max retries: ${MAX_RETRIES}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  try {
    // Get current stats
    const statsBefore = await WebhookEvent.getStats();
    console.log('📊 Current Statistics:');
    console.log(`  Total events: ${statsBefore.total}`);
    console.log(`  Pending: ${statsBefore.pending}`);
    console.log(`  Processing: ${statsBefore.processing}`);
    console.log(`  Processed: ${statsBefore.processed}`);
    console.log(`  Failed: ${statsBefore.failed}`);
    console.log(`  Dead letter: ${statsBefore.dead_letter}`);

    // Process pending events
    const pendingResults = await processPendingEvents();

    // Process retryable failed events
    const retryResults = await processRetryableEvents();

    // Get updated stats
    const statsAfter = await WebhookEvent.getStats();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Processing Complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Results:');
    console.log(`  Pending processed: ${pendingResults.processed}`);
    console.log(`  Pending failed: ${pendingResults.failed}`);
    console.log(`  Retries processed: ${retryResults.processed}`);
    console.log(`  Retries failed: ${retryResults.failed}`);
    console.log('');
    console.log('Updated Statistics:');
    console.log(`  Total events: ${statsAfter.total}`);
    console.log(`  Pending: ${statsAfter.pending}`);
    console.log(`  Processing: ${statsAfter.processing}`);
    console.log(`  Processed: ${statsAfter.processed}`);
    console.log(`  Failed: ${statsAfter.failed}`);
    console.log(`  Dead letter: ${statsAfter.dead_letter}`);
    console.log('');

    // Exit with error if any processing failed
    if (pendingResults.failed > 0 || retryResults.failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  processEvent,
  processPendingEvents,
  processRetryableEvents,
};

