# N8N Workflow Setup Guide

This guide provides step-by-step instructions to create the N8N workflow for Instagram AI message processing.

## Prerequisites

- N8N instance running (cloud or self-hosted)
- OpenAI API key (for ChatGPT/Claude integration)
- Instagram Connect Demo server running
- N8N callback secret configured

## Workflow Overview

```
Webhook Trigger
    ↓
Extract Message Data
    ↓
OpenAI Chat Model (AI Processing)
    ↓
HTTP Request (Send Callback)
    ↓
Error Handler (Optional)
```

## Step-by-Step Setup

### 1. Create a New Workflow

1. Log in to your N8N instance
2. Click "New" → "New Workflow"
3. Name it: `Instagram AI Message Processor`
4. Click "Create"

### 2. Add Webhook Trigger Node

1. Click the "+" button to add a node
2. Search for "Webhook"
3. Select "Webhook" node
4. Configure:
   - **HTTP Method**: `POST`
   - **Path**: `instagram-message`
   - **Authentication**: `None`
   - **Respond**: `Immediately`
   - **Response Code**: `200`

5. Copy the **Production Webhook URL** (you'll need this later)
   - Example: `https://your-n8n-instance.com/webhook/instagram-message`

### 3. Add Code Node (Extract Data)

1. Click "+" to add another node
2. Search for "Code"
3. Select "Code" node
4. Set **Language** to `JavaScript`
5. Add this code:

```javascript
// Extract webhook data
const webhookData = $input.item.json.body;

// Validate that this is an Instagram message webhook
if (!webhookData || !webhookData.entry) {
  throw new Error('Invalid Instagram webhook payload');
}

// Extract message data
const entry = webhookData.entry[0];
const messaging = entry.messaging?.[0];

if (!messaging || !messaging.message) {
  throw new Error('No message found in webhook payload');
}

// Extract relevant fields
const senderId = messaging.sender.id;
const recipientId = messaging.recipient.id;
const messageText = messaging.message.text || '';
const messageId = messaging.message.mid;
const timestamp = messaging.timestamp;

// Prepare data for AI processing
return {
  json: {
    senderId,
    recipientId,
    messageText,
    messageId,
    timestamp,
    originalWebhook: webhookData
  }
};
```

6. Click "Execute Node" to test

### 4. Add OpenAI Chat Model Node

1. Click "+" to add another node
2. Search for "OpenAI"
3. Select "OpenAI Chat Model" node
4. Configure:
   - **Authentication**: Add your OpenAI API key
   - **Model**: `gpt-4` or `gpt-3.5-turbo`
   - **Messages**: Click the expression editor (fx) and enter:
     ```
     {{ $('Extract Message Data').item.json.messageText }}
     ```
   - **System Message** (optional):
     ```
     You are a helpful Instagram business assistant. Respond to customer inquiries professionally and concisely. Keep responses under 500 characters.
     ```

5. Click "Execute Node" to test

### 5. Add HTTP Request Node (Callback)

1. Click "+" to add another node
2. Search for "HTTP Request"
3. Select "HTTP Request" node
4. Configure:
   - **Method**: `POST`
   - **URL**: `https://insta.tiblings.com/api/n8n/callback`
   - **Authentication**: `Header Auth`
   - **Headers**:
     - **Name**: `X-Callback-Secret`
     - **Value**: Your N8N_CALLBACK_SECRET (from .env)
   - **Body** (JSON):
     ```json
     {
       "messageId": "{{ $('Extract Message Data').item.json.messageId }}",
       "senderId": "{{ $('Extract Message Data').item.json.senderId }}",
       "recipientId": "{{ $('Extract Message Data').item.json.recipientId }}",
       "aiResponse": "{{ $('OpenAI Chat Model').item.json.output }}",
       "status": "success",
       "timestamp": "{{ $now.toISO() }}"
     }
     ```

5. Click "Execute Node" to test

### 6. Add Error Handler (Optional but Recommended)

1. Click "+" to add another node
2. Search for "Error Trigger"
3. Select "Error Trigger" node
4. Add another HTTP Request node after it
5. Configure to send error notifications:
   - **Method**: `POST`
   - **URL**: `https://insta.tiblings.com/api/n8n/callback`
   - **Headers**: Same as above
   - **Body**:
     ```json
     {
       "messageId": "{{ $('Extract Message Data').item.json.messageId }}",
       "status": "error",
       "error": "{{ $json.error.message }}",
       "timestamp": "{{ $now.toISO() }}"
     }
     ```

### 7. Connect Nodes

1. Connect "Webhook" → "Extract Message Data"
2. Connect "Extract Message Data" → "OpenAI Chat Model"
3. Connect "OpenAI Chat Model" → "HTTP Request"
4. Connect "Error Trigger" → "Error HTTP Request" (if using error handler)

### 8. Activate Workflow

1. Click the "Activate" button (top right)
2. Confirm activation
3. The workflow is now live!

## Configuration in Express App

### 1. Update Environment Variables

Add to `.env`:
```
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/instagram-message
N8N_CALLBACK_SECRET=your-secure-callback-secret
N8N_TIMEOUT_MS=30000
```

### 2. Update Doppler (Production)

In Doppler, add the same environment variables to your `dev_insta` config.

### 3. Restart Services

```bash
# Local development
npm install
node server.js

# Production
systemctl restart insta-connect.service
```

## Testing the Workflow

### 1. Send a Test Message

Send a message to your Instagram Business Account from another account.

### 2. Check N8N Execution

1. Go to your N8N workflow
2. Click "Executions" tab
3. You should see a new execution
4. Click on it to see the details

### 3. Check Message Queue

Visit: `https://insta.tiblings.com/dashboard/webhooks`

You should see:
- The webhook event received
- The message in the processing queue
- The AI response

### 4. Check Metrics

Visit: `https://insta.tiblings.com/api/n8n/metrics`

You should see metrics for:
- Messages received
- Messages processed
- Success rate
- Average response time

## Troubleshooting

### Webhook Not Triggering

1. Check N8N workflow is activated
2. Verify webhook URL is correct in `.env`
3. Check N8N logs for errors
4. Verify Instagram webhook subscription is active

### AI Response Not Received

1. Check OpenAI API key is valid
2. Check OpenAI account has credits
3. Check N8N execution logs for errors
4. Verify callback URL is correct

### Callback Not Received

1. Check N8N_CALLBACK_SECRET matches in both places
2. Check Express app is running
3. Check firewall/network allows N8N to reach your server
4. Check Express logs for errors

### Rate Limiting Issues

1. Check rate limit headers in response
2. Wait for rate limit window to reset
3. Adjust rate limits in `src/middleware/n8nSecurity.js` if needed

## Advanced Configuration

### Custom AI Instructions

Modify the System Message in the OpenAI node to customize AI behavior:

```
You are a customer service representative for [Company Name].
Your role is to:
1. Answer common questions about our products
2. Help with order inquiries
3. Provide support for technical issues
4. Escalate complex issues to a human agent

Keep responses professional, friendly, and under 500 characters.
```

### Multiple Workflows

Create separate workflows for different message types:
- Support inquiries → Support workflow
- Sales inquiries → Sales workflow
- General questions → General workflow

Route messages based on keywords in the Code node.

### Fallback Responses

Add a fallback response if AI processing fails:

```javascript
// In the Error Handler
return {
  json: {
    aiResponse: "Thank you for your message. We'll get back to you shortly.",
    status: "fallback"
  }
};
```

## Monitoring and Alerts

### View Metrics

```bash
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://insta.tiblings.com/api/n8n/metrics
```

### View Alerts

```bash
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://insta.tiblings.com/api/n8n/metrics/alerts
```

### Check Queue Status

```bash
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://insta.tiblings.com/api/n8n/queue
```

## Support

For issues or questions:
1. Check N8N logs: `Settings` → `Logs`
2. Check Express logs: `journalctl -u insta-connect.service`
3. Check database: `psql insta_connect_demo`
4. Review this guide and troubleshooting section

