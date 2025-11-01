/**
 * Message Queue Processing Job
 * Processes messages from the queue, retries failed messages with exponential backoff
 */

const MessageQueue = require('../models/MessageQueue');
const Page = require('../models/Page');
const { processQueueItem } = require('../services/n8nIntegration');
const { createLogger } = require('../utils/logger');

const logger = createLogger('processMessageQueue');

const BATCH_SIZE = 10;
const PROCESSING_TIMEOUT = 60000; // 60 seconds

/**
 * Process a batch of messages from the queue
 */
async function processBatch() {
  try {
    logger.info('Starting message queue processing batch');

    // Get messages ready for retry
    const messages = await MessageQueue.getReadyForRetry();

    if (messages.length === 0) {
      logger.debug('No messages ready for processing');
      return { processed: 0, failed: 0 };
    }

    logger.info(`Processing ${messages.length} messages from queue`);

    let processed = 0;
    let failed = 0;

    // Process messages in batches
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      // Process batch in parallel with timeout
      const results = await Promise.allSettled(
        batch.map(async (message) => {
          try {
            // Get page data for access token
            const page = await Page.findById(message.page_id);

            if (!page) {
              logger.warn('Page not found for message', {
                messageId: message.message_id,
                pageId: message.page_id,
              });

              await MessageQueue.updateStatus(message.id, 'dead_letter', {
                lastError: 'Page not found',
              });

              return { success: false, error: 'Page not found' };
            }

            // Process the queue item
            const result = await Promise.race([
              processQueueItem(message, page),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Processing timeout')), PROCESSING_TIMEOUT),
              ),
            ]);

            return result;
          } catch (error) {
            logger.error('Error processing message', {
              error: error.message,
              messageId: message.message_id,
            });

            // Increment retry count
            await MessageQueue.incrementRetry(message.id, error.message);

            return { success: false, error: error.message };
          }
        }),
      );

      // Count results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            processed++;
          } else {
            failed++;
          }
        } else {
          failed++;
          logger.error('Promise rejected', { reason: result.reason });
        }
      });
    }

    logger.info('Message queue processing batch completed', {
      processed,
      failed,
      total: messages.length,
    });

    return { processed, failed };
  } catch (error) {
    logger.error('Error in message queue processing batch', {
      error: error.message,
    });

    return { processed: 0, failed: 0, error: error.message };
  }
}

/**
 * Check for dead letter messages and log them
 */
async function checkDeadLetterQueue() {
  try {
    const result = await MessageQueue.findByStatus('dead_letter', {
      limit: 100,
      offset: 0,
    });

    if (result.length > 0) {
      logger.warn('Dead letter queue has messages', {
        count: result.length,
        messages: result.map((m) => ({
          id: m.id,
          messageId: m.message_id,
          retryCount: m.retry_count,
          lastError: m.last_error,
        })),
      });
    }
  } catch (error) {
    logger.error('Error checking dead letter queue', {
      error: error.message,
    });
  }
}

/**
 * Cleanup old messages from the queue
 */
async function cleanupOldMessages() {
  try {
    const daysOld = parseInt(process.env.MESSAGE_QUEUE_RETENTION_DAYS || 30);
    const deleted = await MessageQueue.deleteOlderThan(daysOld);

    if (deleted > 0) {
      logger.info('Cleaned up old messages', {
        deleted,
        daysOld,
      });
    }
  } catch (error) {
    logger.error('Error cleaning up old messages', {
      error: error.message,
    });
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const stats = await MessageQueue.getStats();

    logger.info('Message queue statistics', {
      total: stats.total,
      pending: stats.pending,
      processing: stats.processing,
      readyToSend: stats.ready_to_send,
      sent: stats.sent,
      failed: stats.failed,
      deadLetter: stats.dead_letter,
    });

    return stats;
  } catch (error) {
    logger.error('Error getting queue statistics', {
      error: error.message,
    });

    return null;
  }
}

module.exports = {
  processBatch,
  checkDeadLetterQueue,
  cleanupOldMessages,
  getQueueStats,
};

