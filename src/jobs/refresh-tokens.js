#!/usr/bin/env node

/**
 * Token Refresh Job
 * 
 * This script refreshes Meta (Facebook/Instagram) access tokens before they expire.
 * It should be run daily via cron or systemd timer.
 * 
 * Meta tokens are long-lived (60 days) but need to be refreshed periodically.
 * Tokens can be refreshed if they are:
 * - At least 24 hours old
 * - Not yet expired
 * - Refreshed tokens are valid for another 60 days from refresh date
 * 
 * Usage:
 *   node src/jobs/refresh-tokens.js
 *   node src/jobs/refresh-tokens.js --dry-run  # Test without making changes
 */

require('dotenv').config();
const db = require('../db');
const MetaAccount = require('../models/MetaAccount');
const Page = require('../models/Page');

// Configuration
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

// Refresh tokens that expire within this many days
const REFRESH_THRESHOLD_DAYS = 7;

// Dry run mode (don't actually refresh, just log what would happen)
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Refresh a Meta user access token
 * @param {string} currentToken - Current access token
 * @returns {Promise<Object>} New token data { access_token, expires_in }
 */
async function refreshMetaToken(currentToken) {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', APP_ID);
  url.searchParams.set('client_secret', APP_SECRET);
  url.searchParams.set('fb_exchange_token', currentToken);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Refresh a Page access token
 * @param {string} metaUserId - Meta user ID
 * @param {string} userAccessToken - User access token
 * @param {string} pageId - Page ID
 * @returns {Promise<string>} New page access token
 */
async function refreshPageToken(metaUserId, userAccessToken, pageId) {
  const url = new URL(`${GRAPH_BASE}/${metaUserId}/accounts`);
  url.searchParams.set('access_token', userAccessToken);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Page token refresh failed: ${JSON.stringify(data)}`);
  }

  // Find the specific page in the response
  const page = data.data?.find(p => p.id === pageId);
  if (!page) {
    throw new Error(`Page ${pageId} not found in user's pages`);
  }

  return page.access_token;
}

/**
 * Log a Meta account token refresh attempt
 * @param {number} metaAccountId - Meta account ID
 * @param {string} refreshType - Type of refresh (e.g., 'scheduled', 'manual')
 * @param {boolean} success - Whether refresh succeeded
 * @param {Date|null} oldExpiresAt - Old expiration date
 * @param {Date|null} newExpiresAt - New expiration date
 * @param {string|null} errorMessage - Error message if failed
 */
async function logMetaAccountRefresh(metaAccountId, refreshType, success, oldExpiresAt, newExpiresAt, errorMessage = null) {
  await db.query(
    `INSERT INTO token_refresh_log (meta_account_id, refresh_type, success, old_expires_at, new_expires_at, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [metaAccountId, refreshType, success, oldExpiresAt, newExpiresAt, errorMessage]
  );
}

/**
 * Log a Page token refresh attempt
 * @param {number} pageId - Page ID
 * @param {string} refreshType - Type of refresh (e.g., 'scheduled', 'manual')
 * @param {boolean} success - Whether refresh succeeded
 * @param {Date|null} oldExpiresAt - Old expiration date
 * @param {Date|null} newExpiresAt - New expiration date
 * @param {string|null} errorMessage - Error message if failed
 */
async function logPageRefresh(pageId, refreshType, success, oldExpiresAt, newExpiresAt, errorMessage = null) {
  await db.query(
    `INSERT INTO token_refresh_log (page_id, refresh_type, success, old_expires_at, new_expires_at, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [pageId, refreshType, success, oldExpiresAt, newExpiresAt, errorMessage]
  );
}

/**
 * Refresh Meta account tokens
 */
async function refreshMetaAccounts() {
  console.log('\n🔄 Refreshing Meta account tokens...');
  
  const expiringAccounts = await MetaAccount.findExpiringTokens(REFRESH_THRESHOLD_DAYS);
  console.log(`Found ${expiringAccounts.length} Meta account(s) with tokens expiring within ${REFRESH_THRESHOLD_DAYS} days`);

  let successCount = 0;
  let failureCount = 0;

  for (const account of expiringAccounts) {
    const daysUntilExpiry = Math.ceil((new Date(account.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`\n  Meta Account ID ${account.id} (User: ${account.meta_user_id})`);
    console.log(`    Expires: ${account.expires_at} (${daysUntilExpiry} days)`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would refresh token`);
      continue;
    }

    try {
      const oldExpiresAt = new Date(account.expires_at);

      // Refresh the token
      const tokenData = await refreshMetaToken(account.access_token);

      // Calculate new expiration (60 days from now)
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

      // Update in database
      await MetaAccount.updateToken(account.id, tokenData.access_token, newExpiresAt);

      console.log(`    ✅ Token refreshed successfully`);
      console.log(`    New expiration: ${newExpiresAt.toISOString()}`);

      await logMetaAccountRefresh(account.id, 'scheduled', true, oldExpiresAt, newExpiresAt);
      successCount++;
    } catch (error) {
      console.error(`    ❌ Failed to refresh token: ${error.message}`);
      await logMetaAccountRefresh(account.id, 'scheduled', false, new Date(account.expires_at), null, error.message);
      failureCount++;
    }
  }

  console.log(`\n✅ Meta accounts: ${successCount} refreshed, ${failureCount} failed`);
  return { successCount, failureCount };
}

/**
 * Refresh Page tokens
 */
async function refreshPageTokens() {
  console.log('\n🔄 Refreshing Page tokens...');
  
  const expiringPages = await Page.findExpiringTokens(REFRESH_THRESHOLD_DAYS);
  console.log(`Found ${expiringPages.length} Page(s) with tokens expiring within ${REFRESH_THRESHOLD_DAYS} days`);

  let successCount = 0;
  let failureCount = 0;

  for (const page of expiringPages) {
    const daysUntilExpiry = Math.ceil((new Date(page.page_token_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`\n  Page ID ${page.id} (${page.page_name})`);
    console.log(`    Expires: ${page.page_token_expires_at} (${daysUntilExpiry} days)`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would refresh token`);
      continue;
    }

    try {
      const oldExpiresAt = page.page_token_expires_at ? new Date(page.page_token_expires_at) : null;

      // Get the Meta account for this page's user
      const metaAccount = await MetaAccount.findByUserId(page.user_id);
      if (!metaAccount) {
        throw new Error(`Meta account not found for user ${page.user_id}`);
      }

      // Refresh the page token
      const newPageToken = await refreshPageToken(
        metaAccount.meta_user_id,
        metaAccount.access_token,
        page.page_id
      );

      // Page tokens don't expire, but we'll set a far future date
      const newExpiresAt = new Date();
      newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 10); // 10 years

      // Update in database
      await Page.updateToken(page.id, newPageToken, newExpiresAt);

      console.log(`    ✅ Token refreshed successfully`);

      await logPageRefresh(page.id, 'scheduled', true, oldExpiresAt, newExpiresAt);
      successCount++;
    } catch (error) {
      console.error(`    ❌ Failed to refresh token: ${error.message}`);
      const oldExpiresAt = page.page_token_expires_at ? new Date(page.page_token_expires_at) : null;
      await logPageRefresh(page.id, 'scheduled', false, oldExpiresAt, null, error.message);
      failureCount++;
    }
  }

  console.log(`\n✅ Pages: ${successCount} refreshed, ${failureCount} failed`);
  return { successCount, failureCount };
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔐 Meta Token Refresh Job');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Refresh threshold: ${REFRESH_THRESHOLD_DAYS} days`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);

  try {
    // Refresh Meta account tokens
    const metaResults = await refreshMetaAccounts();

    // Refresh Page tokens
    const pageResults = await refreshPageTokens();

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Meta accounts: ${metaResults.successCount} ✅  ${metaResults.failureCount} ❌`);
    console.log(`Pages: ${pageResults.successCount} ✅  ${pageResults.failureCount} ❌`);
    console.log(`\nCompleted: ${new Date().toISOString()}`);

    // Exit with error code if any failures
    const totalFailures = metaResults.failureCount + pageResults.failureCount;
    if (totalFailures > 0) {
      console.error(`\n⚠️  ${totalFailures} token(s) failed to refresh`);
      process.exit(1);
    }

    console.log('\n✅ All tokens refreshed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { refreshMetaToken, refreshPageToken, main };

