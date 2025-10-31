require('dotenv').config();
const crypto = require('crypto');

/**
 * Test script for webhook signature validation
 * 
 * This script demonstrates how to:
 * 1. Create a valid webhook signature
 * 2. Send a test webhook to the local server
 * 3. Verify the signature is validated correctly
 */

const APP_SECRET = process.env.APP_SECRET;
const WEBHOOK_URL = 'http://localhost:3000/webhook';

// Sample webhook payload (Instagram message)
const samplePayload = {
  object: 'instagram',
  entry: [
    {
      id: '123456789',
      time: Date.now(),
      messaging: [
        {
          sender: {
            id: '987654321'
          },
          recipient: {
            id: '123456789'
          },
          timestamp: Date.now(),
          message: {
            mid: 'mid.123456',
            text: 'Hello from test!'
          }
        }
      ]
    }
  ]
};

/**
 * Generate X-Hub-Signature-256 header
 * @param {string} payload - JSON string payload
 * @param {string} secret - App secret
 * @returns {string} Signature header value
 */
function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return `sha256=${signature}`;
}

/**
 * Send test webhook
 */
async function sendTestWebhook() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Webhook Signature Validation Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  if (!APP_SECRET) {
    console.error('❌ APP_SECRET not found in environment');
    process.exit(1);
  }

  // Convert payload to JSON string
  const payloadString = JSON.stringify(samplePayload);
  
  // Generate signature
  const signature = generateSignature(payloadString, APP_SECRET);
  
  console.log('📝 Test Payload:');
  console.log(JSON.stringify(samplePayload, null, 2));
  console.log('');
  console.log('🔐 Generated Signature:', signature);
  console.log('');

  // Test 1: Valid signature
  console.log('Test 1: Sending webhook with VALID signature...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
      },
      body: payloadString,
    });

    if (response.ok) {
      console.log('✅ Valid signature accepted (HTTP 200)');
    } else {
      console.error(`❌ Valid signature rejected (HTTP ${response.status})`);
      const text = await response.text();
      console.error('Response:', text);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }

  console.log('');

  // Test 2: Invalid signature
  console.log('Test 2: Sending webhook with INVALID signature...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=invalid_signature_12345',
      },
      body: payloadString,
    });

    if (response.status === 401) {
      console.log('✅ Invalid signature rejected (HTTP 401)');
    } else {
      console.error(`❌ Invalid signature accepted (HTTP ${response.status})`);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }

  console.log('');

  // Test 3: Missing signature
  console.log('Test 3: Sending webhook with NO signature...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payloadString,
    });

    if (response.status === 401) {
      console.log('✅ Missing signature rejected (HTTP 401)');
    } else {
      console.error(`❌ Missing signature accepted (HTTP ${response.status})`);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Tests Complete');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run tests
sendTestWebhook().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

