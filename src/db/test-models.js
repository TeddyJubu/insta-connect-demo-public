/**
 * Test script to verify database models are working correctly
 */

require('dotenv').config();
const User = require('../models/User');
const MetaAccount = require('../models/MetaAccount');
const Page = require('../models/Page');
const InstagramAccount = require('../models/InstagramAccount');
const WebhookSubscription = require('../models/WebhookSubscription');
const db = require('./index');

async function runTests() {
  console.log('🧪 Testing database models...\n');

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    const testEmail = `test-${Date.now()}@example.com`;

    // Test 1: Create a user
    console.log('\n1️⃣  Testing User model...');
    const user = await User.create(testEmail, 'password123');
    console.log('   ✅ User created:', user.email);

    // Test 2: Verify user password
    const verifiedUser = await User.verify(testEmail, 'password123');
    console.log('   ✅ User verified:', verifiedUser.email);

    // Test 3: Create a Meta account
    console.log('\n2️⃣  Testing MetaAccount model...');
    const metaAccount = await MetaAccount.upsert({
      userId: user.id,
      metaUserId: 'meta_user_123',
      accessToken: 'test_access_token',
      tokenType: 'long_lived',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      scopes: 'pages_show_list,instagram_basic',
    });
    console.log('   ✅ MetaAccount created:', metaAccount.meta_user_id);

    // Test 4: Create a Page
    console.log('\n3️⃣  Testing Page model...');
    const page = await Page.upsert({
      userId: user.id,
      metaAccountId: metaAccount.id,
      pageId: 'page_123',
      pageName: 'Test Page',
      pageAccessToken: 'page_access_token',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });
    console.log('   ✅ Page created:', page.page_name);

    // Test 5: Set page as selected
    await Page.setSelected(user.id, page.id);
    const selectedPage = await Page.findSelectedByUserId(user.id);
    console.log('   ✅ Page selected:', selectedPage.page_name);

    // Test 6: Create an Instagram account
    console.log('\n4️⃣  Testing InstagramAccount model...');
    const igAccount = await InstagramAccount.upsert({
      pageId: page.id,
      instagramId: 'ig_123',
      username: 'test_instagram_user',
    });
    console.log('   ✅ Instagram account created:', igAccount.username);

    // Test 7: Create webhook subscriptions
    console.log('\n5️⃣  Testing WebhookSubscription model...');
    await WebhookSubscription.create(page.id, 'messages');
    await WebhookSubscription.create(page.id, 'messaging_postbacks');
    const subscriptions = await WebhookSubscription.findByPageId(page.id);
    console.log('   ✅ Webhook subscriptions created:', subscriptions.length);

    // Test 8: Find expiring tokens
    console.log('\n6️⃣  Testing token expiry queries...');
    const expiringPages = await Page.findExpiringTokens(90); // 90 days
    console.log('   ✅ Found expiring page tokens:', expiringPages.length);

    const expiringMeta = await MetaAccount.findExpiringTokens(90);
    console.log('   ✅ Found expiring meta tokens:', expiringMeta.length);

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    // Clean up
    await db.end();
  }
}

runTests();
