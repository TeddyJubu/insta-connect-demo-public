const express = require('express');
const router = express.Router();
const db = require('../db');
const WebhookEvent = require('../models/WebhookEvent');
const Page = require('../models/Page');
const InstagramAccount = require('../models/InstagramAccount');
const { requireAuth } = require('../middleware/auth');

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

    res.json({
      events,
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
    res.json(stats);
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

    res.json(event);
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
    res.json({ pages });
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

    res.json({
      accounts: instagram ? [instagram] : [],
    });
  } catch (error) {
    console.error('Error fetching Instagram accounts:', error);
    res.status(500).json({ error: 'Failed to fetch Instagram accounts' });
  }
});

module.exports = router;
