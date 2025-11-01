// Use built-in fetch in Node.js 18+
// const fetch = require('node-fetch'); // Not needed in Node.js 18+
const MessageQueue = require('../models/MessageQueue');
const { createLogger } = require('../utils/logger');
const { graphApi } = require('../utils/graphApi');

const logger = createLogger('n8nIntegration');

const {
  N8N_ENABLED = 'false',
  N8N_WEBHOOK_URL,
  N8N_CALLBACK_SECRET,
  N8N_TIMEOUT_MS = 30000,
} = process.env;

/**
 * Extract message data from Instagram webhook payload
 * @param {Object} payload - Instagram webhook payload
 * @returns {Object|null} Extracted message data or null
 */
function extractMessageData(payload) {
  try {
    if (!payload || !payload.entry || payload.entry.length === 0) {
      logger.warn('Invalid webhook payload structure');
      return null;
    }

    const entry = payload.entry[0];
    const instagramId = entry.id;

    if (!entry.messaging || entry.messaging.length === 0) {
      logger.debug('No messaging data in webhook entry');
      return null;
    }

    const messaging = entry.messaging[0];

    // Only process messages (not delivery confirmations, etc.)
    if (!messaging.message) {
      logger.debug('Webhook entry is not a message', { type: Object.keys(messaging) });
      return null;
    }

    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id;
    const messageText = messaging.message.text || '';
    const messageId = messaging.message.mid;
    const timestamp = messaging.timestamp;

    return {
      instagramId,
      senderId,
      recipientId,
      messageText,
      messageId,
      timestamp,
    };
  } catch (error) {
    logger.error('Error extracting message data', { error: error.message });
    return null;
  }
}

/**
 * Forward message to N8N for AI processing
 * @param {Object} messageData - Message data
 * @param {number} queueItemId - Queue item ID
 * @returns {Promise<boolean>} Success status
 */
async function forwardToN8N(messageData, queueItemId) {
  try {
    if (N8N_ENABLED !== 'true') {
      logger.debug('N8N integration is disabled');
      return false;
    }

    if (!N8N_WEBHOOK_URL) {
      logger.error('N8N_WEBHOOK_URL is not configured');
      return false;
    }

    const payload = {
      messageId: messageData.messageId,
      senderId: messageData.senderId,
      recipientId: messageData.recipientId,
      messageText: messageData.messageText,
      timestamp: messageData.timestamp,
      callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/n8n/callback`,
      callbackSecret: N8N_CALLBACK_SECRET,
    };

    logger.info('Forwarding message to N8N', {
      messageId: messageData.messageId,
      senderId: messageData.senderId,
    });

    const response = await Promise.race([
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('N8N request timeout')), parseInt(N8N_TIMEOUT_MS)),
      ),
    ]);

    if (!response.ok) {
      logger.error('N8N webhook returned error', {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    // Update queue item with N8N sent timestamp
    await MessageQueue.updateStatus(queueItemId, 'processing', {
      sentToN8nAt: new Date().toISOString(),
    });

    logger.info('Message forwarded to N8N successfully', {
      messageId: messageData.messageId,
    });

    return true;
  } catch (error) {
    logger.error('Error forwarding message to N8N', {
      error: error.message,
      messageId: messageData.messageId,
    });
    return false;
  }
}

/**
 * Send AI-generated response back to Instagram
 * @param {Object} messageData - Original message data
 * @param {string} aiResponse - AI-generated response text
 * @param {Object} pageData - Page data with access token
 * @returns {Promise<boolean>} Success status
 */
async function sendInstagramReply(messageData, aiResponse, pageData) {
  try {
    if (!aiResponse || !pageData || !pageData.page_access_token) {
      logger.error('Missing required data for sending reply', {
        hasResponse: !!aiResponse,
        hasPageData: !!pageData,
      });
      return false;
    }

    logger.info('Sending Instagram reply', {
      senderId: messageData.senderId,
      messageId: messageData.messageId,
    });

    // Use Graph API to send message
    const result = await graphApi.sendMessage(
      messageData.senderId,
      aiResponse,
      pageData.page_access_token,
    );

    if (!result || !result.message_id) {
      logger.error('Failed to send Instagram message', { result });
      return false;
    }

    logger.info('Instagram reply sent successfully', {
      messageId: messageData.messageId,
      instagramMessageId: result.message_id,
    });

    return true;
  } catch (error) {
    logger.error('Error sending Instagram reply', {
      error: error.message,
      senderId: messageData.senderId,
    });
    return false;
  }
}

/**
 * Process a message from the queue
 * @param {Object} queueItem - Queue item from database
 * @param {Object} pageData - Page data with access token
 * @returns {Promise<Object>} Processing result
 */
async function processQueueItem(queueItem, pageData) {
  try {
    const messageData = {
      messageId: queueItem.message_id,
      senderId: queueItem.sender_id,
      recipientId: queueItem.recipient_id,
      messageText: queueItem.message_text,
      instagramId: queueItem.instagram_id,
    };

    // If AI response is already available, send it
    if (queueItem.ai_response && queueItem.status === 'ready_to_send') {
      const success = await sendInstagramReply(messageData, queueItem.ai_response, pageData);

      if (success) {
        await MessageQueue.updateStatus(queueItem.id, 'sent', {
          sentToInstagramAt: new Date().toISOString(),
        });
        return { success: true, status: 'sent' };
      } else {
        await MessageQueue.incrementRetry(queueItem.id, 'Failed to send Instagram reply');
        return { success: false, status: 'failed', error: 'Failed to send reply' };
      }
    }

    // Otherwise, forward to N8N
    const forwarded = await forwardToN8N(messageData, queueItem.id);

    if (!forwarded) {
      await MessageQueue.incrementRetry(queueItem.id, 'Failed to forward to N8N');
      return { success: false, status: 'failed', error: 'Failed to forward to N8N' };
    }

    return { success: true, status: 'processing' };
  } catch (error) {
    logger.error('Error processing queue item', {
      error: error.message,
      queueItemId: queueItem.id,
    });

    await MessageQueue.incrementRetry(queueItem.id, error.message);
    return { success: false, status: 'failed', error: error.message };
  }
}

module.exports = {
  extractMessageData,
  forwardToN8N,
  sendInstagramReply,
  processQueueItem,
};

