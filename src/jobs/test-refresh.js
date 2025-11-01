#!/usr/bin/env node

/**
 * Test Token Refresh
 *
 * This script tests the token refresh logic without calling the actual Meta API.
 * It simulates successful token refresh by updating the database directly.
 */

require('dotenv').config();
const db = require('../db');
const MetaAccount = require('../models/MetaAccount');
const Page = require('../models/Page');

async function testRefresh() {
  console.log('🧪 Testing Token Refresh Logic\n');

  try {
    // 1. Find expiring Meta accounts
    console.log('1️⃣ Finding expiring Meta accounts...');
    const expiringAccounts = await MetaAccount.findExpiringTokens(7);
    console.log(`   Found ${expiringAccounts.length} account(s)\n`);

    if (expiringAccounts.length > 0) {
      const account = expiringAccounts[0];
      console.log(`   Account ID: ${account.id}`);
      console.log(`   Meta User ID: ${account.meta_user_id}`);
      console.log(`   Current expiration: ${account.expires_at}`);

      // Simulate token refresh
      console.log('\n2️⃣ Simulating token refresh...');
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 60); // 60 days from now

      await MetaAccount.updateToken(account.id, account.access_token, newExpiresAt);
      console.log(`   ✅ Token expiration updated to: ${newExpiresAt.toISOString()}`);

      // Log the refresh
      console.log('\n3️⃣ Logging refresh attempt...');
      const oldExpiresAt = new Date(account.expires_at);
      await db.query(
        `INSERT INTO token_refresh_log (meta_account_id, refresh_type, success, old_expires_at, new_expires_at, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [account.id, 'test', true, oldExpiresAt, newExpiresAt, null],
      );
      console.log('   ✅ Logged to token_refresh_log');

      // Verify the update
      console.log('\n4️⃣ Verifying update...');
      const updated = await MetaAccount.findById(account.id);
      console.log(`   Current expiration: ${updated.expires_at}`);
      console.log(
        `   Days until expiry: ${Math.ceil((new Date(updated.expires_at) - new Date()) / (1000 * 60 * 60 * 24))}`,
      );
    }

    // 2. Find expiring Pages
    console.log('\n5️⃣ Finding expiring Page tokens...');
    const expiringPages = await Page.findExpiringTokens(7);
    console.log(`   Found ${expiringPages.length} page(s)\n`);

    if (expiringPages.length > 0) {
      const page = expiringPages[0];
      console.log(`   Page ID: ${page.id}`);
      console.log(`   Page Name: ${page.page_name}`);
      console.log(`   Current expiration: ${page.page_token_expires_at}`);

      // Simulate token refresh
      console.log('\n6️⃣ Simulating page token refresh...');
      const newExpiresAt = new Date();
      newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 10); // 10 years

      await Page.updateToken(page.id, page.page_access_token, newExpiresAt);
      console.log(`   ✅ Token expiration updated to: ${newExpiresAt.toISOString()}`);

      // Log the refresh
      const oldExpiresAt = page.page_token_expires_at ? new Date(page.page_token_expires_at) : null;
      await db.query(
        `INSERT INTO token_refresh_log (page_id, refresh_type, success, old_expires_at, new_expires_at, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [page.id, 'test', true, oldExpiresAt, newExpiresAt, null],
      );
      console.log('   ✅ Logged to token_refresh_log');
    }

    // 3. Check refresh log
    console.log('\n7️⃣ Checking token_refresh_log...');
    const logResult = await db.query(
      `SELECT * FROM token_refresh_log ORDER BY refreshed_at DESC LIMIT 5`,
    );
    console.log(`   Recent refresh attempts: ${logResult.rows.length}`);
    logResult.rows.forEach((log, i) => {
      const entityType = log.meta_account_id ? 'meta_account' : 'page';
      const entityId = log.meta_account_id || log.page_id;
      console.log(
        `   ${i + 1}. ${entityType} #${entityId} (${log.refresh_type}) - ${log.success ? '✅ Success' : '❌ Failed'} at ${log.refreshed_at}`,
      );
      if (log.old_expires_at) {
        console.log(`      Old expiration: ${log.old_expires_at}`);
      }
      if (log.new_expires_at) {
        console.log(`      New expiration: ${log.new_expires_at}`);
      }
      if (log.error_message) {
        console.log(`      Error: ${log.error_message}`);
      }
    });

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testRefresh();
