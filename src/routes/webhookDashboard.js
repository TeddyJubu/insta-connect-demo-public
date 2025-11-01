const express = require('express');
const router = express.Router();
const db = require('../db');
const WebhookEvent = require('../models/WebhookEvent');
const Page = require('../models/Page');
const InstagramAccount = require('../models/InstagramAccount');
const MessageQueue = require('../models/MessageQueue');
const { requireAuth } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const n8nMetrics = require('../utils/n8nMetrics');
const {
  validateCallbackSecret,
  n8nCallbackLimiter,
  n8nQueueLimiter,
  n8nRetryLimiter,
  securityLogging,
} = require('../middleware/n8nSecurity');

const logger = createLogger('webhookDashboard');

/**
 * Transform webhook event from snake_case to camelCase
 */
function transformWebhookEvent(event) {
  return {
    id: event.id,
    pageId: event.page_id,
    eventType: event.event_type,
    payload: event.payload,
    status: event.status,
    retryCount: event.retry_count,
    lastError: event.last_error,
    receivedAt: event.received_at,
    processedAt: event.processed_at,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

/**
 * GET /api/webhook-events
 * Get webhook events with filtering and pagination
 */
router.get('/webhook-events', requireAuth, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    // Get user's selected page
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);

    if (!selectedPage) {
      return res.json({
        events: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    // Get events for this page
    const events = await WebhookEvent.findByPageId(selectedPage.id, {
      status: status || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get total count for pagination
    const allEvents = await WebhookEvent.findByPageId(selectedPage.id, {
      status: status || null,
      limit: 10000, // Large number to get all
      offset: 0,
    });

    // Transform events to camelCase
    const transformedEvents = events.map(transformWebhookEvent);

    res.json({
      events: transformedEvents,
      total: allEvents.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching webhook events:', error);
    res.status(500).json({ error: 'Failed to fetch webhook events' });
  }
});

/**
 * GET /api/webhook-events/stats
 * Get webhook event statistics
 */
router.get('/webhook-events/stats', requireAuth, async (req, res) => {
  try {
    const stats = await WebhookEvent.getStats();

    // Transform stats to camelCase
    const transformedStats = {
      total: stats.total || 0,
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      processed: stats.processed || 0,
      failed: stats.failed || 0,
      deadLetter: stats.dead_letter || 0,
      lastReceived: stats.last_received || null,
    };

    res.json(transformedStats);
  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({ error: 'Failed to fetch webhook statistics' });
  }
});

/**
 * GET /api/webhook-events/:id
 * Get a single webhook event by ID
 */
router.get('/webhook-events/:id', requireAuth, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await WebhookEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify the event belongs to user's page
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);

    if (!selectedPage || event.page_id !== selectedPage.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Transform to camelCase
    const transformedEvent = transformWebhookEvent(event);

    res.json(transformedEvent);
  } catch (error) {
    console.error('Error fetching webhook event:', error);
    res.status(500).json({ error: 'Failed to fetch webhook event' });
  }
});

/**
 * POST /api/webhook-events/:id/retry
 * Manually retry a failed webhook event
 */
router.post('/webhook-events/:id/retry', requireAuth, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await WebhookEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify the event belongs to user's page
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);

    if (!selectedPage || event.page_id !== selectedPage.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow retry for failed or dead_letter events
    if (event.status !== 'failed' && event.status !== 'dead_letter') {
      return res.status(400).json({
        error: `Cannot retry event with status: ${event.status}`,
      });
    }

    // Reset the event to pending
    const updatedEvent = await WebhookEvent.retry(eventId);

    console.log(`✅ Webhook event ${eventId} manually retried by user ${req.session.userId}`);

    res.json({
      message: 'Event queued for retry',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error retrying webhook event:', error);
    res.status(500).json({ error: 'Failed to retry webhook event' });
  }
});

/**
 * DELETE /api/webhook-events/:id
 * Delete a webhook event
 */
router.delete('/webhook-events/:id', requireAuth, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await WebhookEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify the event belongs to user's page
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);

    if (!selectedPage || event.page_id !== selectedPage.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the event
    await db.query('DELETE FROM webhook_events WHERE id = $1', [eventId]);

    console.log(`✅ Webhook event ${eventId} deleted by user ${req.session.userId}`);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook event:', error);
    res.status(500).json({ error: 'Failed to delete webhook event' });
  }
});

/**
 * GET /api/pages
 * Get all pages for the authenticated user
 */
router.get('/pages', requireAuth, async (req, res) => {
  try {
    const pages = await Page.findByUserId(req.session.userId);

    // Transform snake_case to camelCase for frontend
    const transformedPages = pages.map(page => ({
      id: page.id,
      userId: page.user_id,
      metaAccountId: page.meta_account_id,
      pageId: page.page_id,
      pageName: page.page_name,
      pageAccessToken: page.page_access_token,
      tokenExpiresAt: page.token_expires_at,
      isSelected: page.is_selected,
      createdAt: page.created_at,
      updatedAt: page.updated_at,
    }));

    res.json({ pages: transformedPages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

/**
 * POST /api/pages/select
 * Select a page as the active page
 */
router.post('/pages/select', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({ error: 'Page ID is required' });
    }

    // Verify the page belongs to the user
    const page = await Page.findByUserAndPageId(req.session.userId, pageId);

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Set as selected
    await Page.setSelected(req.session.userId, page.id);

    console.log(`✅ Page selected: ${page.page_name} by user ${req.session.userId}`);

    res.json({ message: 'Page selected successfully', page });
  } catch (error) {
    console.error('Error selecting page:', error);
    res.status(500).json({ error: 'Failed to select page' });
  }
});

/**
 * GET /api/instagram-accounts
 * Get Instagram accounts for the authenticated user
 */
router.get('/instagram-accounts', requireAuth, async (req, res) => {
  try {
    // Get user's selected page
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);

    if (!selectedPage) {
      return res.json({ accounts: [] });
    }

    // Get Instagram account for this page
    const instagram = await InstagramAccount.findByPageId(selectedPage.id);

    // Transform snake_case to camelCase for frontend
    const transformedAccounts = instagram ? [{
      id: instagram.id,
      pageId: instagram.page_id,
      instagramId: instagram.instagram_id,
      username: instagram.username,
      createdAt: instagram.created_at,
      updatedAt: instagram.updated_at,
    }] : [];

    res.json({
      accounts: transformedAccounts,
    });
  } catch (error) {
    console.error('Error fetching Instagram accounts:', error);
    res.status(500).json({ error: 'Failed to fetch Instagram accounts' });
  }
});

/**
 * POST /api/n8n/callback
 * Receive AI responses from N8N and send replies to Instagram
 * This endpoint is called by N8N after processing a message with AI
 */
router.post(
  '/n8n/callback',
  n8nCallbackLimiter,
  securityLogging,
  validateCallbackSecret,
  async (req, res) => {
  try {
    const { messageId, senderId, recipientId, aiResponse, status, n8nExecutionId } = req.body;

    if (!messageId || !senderId || !recipientId || !aiResponse) {
      logger.warn('Invalid N8N callback payload', { body: req.body });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the message in the queue
    const result = await db.query(
      `SELECT * FROM message_processing_queue WHERE message_id = $1`,
      [messageId],
    );

    if (result.rows.length === 0) {
      logger.warn('Message not found in queue', { messageId });
      return res.status(404).json({ error: 'Message not found' });
    }

    const queueItem = result.rows[0];

    // Update the queue item with N8N response
    await db.query(
      `UPDATE message_processing_queue
       SET ai_response = $1,
           status = $2,
           n8n_execution_id = $3,
           received_from_n8n_at = CURRENT_TIMESTAMP
       WHERE message_id = $4`,
      [aiResponse, status === 'success' ? 'ready_to_send' : 'failed', n8nExecutionId, messageId],
    );

    logger.info('N8N callback received', {
      messageId,
      senderId,
      status,
      n8nExecutionId,
    });

    res.json({ success: true, message: 'Callback processed' });
  } catch (error) {
    logger.error('Error processing N8N callback', { error: error.message });
    res.status(500).json({ error: 'Failed to process callback' });
  }
  },
);

/**
 * GET /api/n8n/status/:messageId
 * Check processing status of a specific message
 */
router.get('/n8n/status/:messageId', requireAuth, securityLogging, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await db.query(
      `SELECT * FROM message_processing_queue WHERE message_id = $1`,
      [messageId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const item = result.rows[0];

    // Transform to camelCase
    const transformed = {
      id: item.id,
      messageId: item.message_id,
      senderId: item.sender_id,
      recipientId: item.recipient_id,
      status: item.status,
      aiResponse: item.ai_response,
      retryCount: item.retry_count,
      lastError: item.last_error,
      sentToN8nAt: item.sent_to_n8n_at,
      receivedFromN8nAt: item.received_from_n8n_at,
      sentToInstagramAt: item.sent_to_instagram_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };

    res.json(transformed);
  } catch (error) {
    logger.error('Error fetching message status', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch message status' });
  }
});

/**
 * POST /api/n8n/retry/:messageId
 * Manually retry a failed message
 */
router.post('/n8n/retry/:messageId', requireAuth, n8nRetryLimiter, securityLogging, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await db.query(
      `SELECT * FROM message_processing_queue WHERE message_id = $1`,
      [messageId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const item = result.rows[0];

    // Only allow retry for failed messages
    if (item.status !== 'failed' && item.status !== 'dead_letter') {
      return res.status(400).json({
        error: `Cannot retry message with status: ${item.status}`,
      });
    }

    // Reset to pending for retry
    await db.query(
      `UPDATE message_processing_queue
       SET status = 'pending',
           retry_count = retry_count + 1,
           last_retry_at = CURRENT_TIMESTAMP,
           next_retry_at = CURRENT_TIMESTAMP
       WHERE message_id = $1`,
      [messageId],
    );

    logger.info('Message retry initiated', {
      messageId,
      userId: req.session.userId,
    });

    res.json({ success: true, message: 'Message queued for retry' });
  } catch (error) {
    logger.error('Error retrying message', { error: error.message });
    res.status(500).json({ error: 'Failed to retry message' });
  }
});

/**
 * GET /api/n8n/queue
 * View the message processing queue
 */
router.get('/n8n/queue', requireAuth, n8nQueueLimiter, securityLogging, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    // Get user's selected page
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);

    if (!selectedPage) {
      return res.json({
        queue: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    // Build query
    let query = 'SELECT * FROM message_processing_queue WHERE page_id = $1';
    const params = [selectedPage.id];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM message_processing_queue WHERE page_id = $1${status ? ` AND status = $2` : ''}`,
      status ? [selectedPage.id, status] : [selectedPage.id],
    );

    // Get paginated results
    const result = await db.query(
      `${query} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)],
    );

    // Transform to camelCase
    const transformed = result.rows.map(item => ({
      id: item.id,
      messageId: item.message_id,
      senderId: item.sender_id,
      recipientId: item.recipient_id,
      messageText: item.message_text,
      status: item.status,
      aiResponse: item.ai_response,
      retryCount: item.retry_count,
      lastError: item.last_error,
      sentToN8nAt: item.sent_to_n8n_at,
      receivedFromN8nAt: item.received_from_n8n_at,
      sentToInstagramAt: item.sent_to_instagram_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    res.json({
      queue: transformed,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Error fetching message queue', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch message queue' });
  }
});

/**
 * GET /api/n8n/metrics
 * Get N8N integration metrics
 */
router.get('/n8n/metrics', requireAuth, securityLogging, async (req, res) => {
  try {
    const metrics = n8nMetrics.getMetrics();
    const queueStats = await MessageQueue.getStats();

    res.json({
      metrics,
      queueStats: {
        total: queueStats.total || 0,
        pending: queueStats.pending || 0,
        processing: queueStats.processing || 0,
        readyToSend: queueStats.ready_to_send || 0,
        sent: queueStats.sent || 0,
        failed: queueStats.failed || 0,
        deadLetter: queueStats.dead_letter || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching N8N metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/n8n/metrics/summary
 * Get N8N metrics summary
 */
router.get('/n8n/metrics/summary', requireAuth, securityLogging, async (req, res) => {
  try {
    const summary = n8nMetrics.getSummary();
    const alerts = n8nMetrics.checkAlerts();

    res.json({
      summary,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching N8N metrics summary', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch metrics summary' });
  }
});

/**
 * GET /api/n8n/metrics/alerts
 * Get N8N alerts
 */
router.get('/api/n8n/metrics/alerts', requireAuth, securityLogging, async (req, res) => {
  try {
    const alerts = n8nMetrics.checkAlerts();

    res.json({
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching N8N alerts', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/n8n/metrics/reset
 * Reset N8N metrics (admin only)
 */
router.post('/n8n/metrics/reset', requireAuth, securityLogging, async (req, res) => {
  try {
    // In production, you might want to check for admin role here
    n8nMetrics.reset();

    logger.info('N8N metrics reset by user', { userId: req.session.userId });

    res.json({ success: true, message: 'Metrics reset successfully' });
  } catch (error) {
    logger.error('Error resetting N8N metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

module.exports = router;
