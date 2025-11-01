# N8N Workflow Import Guide

## 📦 Quick Start: Import Pre-Built Workflow

This guide shows you how to import the pre-built N8N workflow JSON file into your N8N instance.

### Prerequisites

- ✅ N8N instance running (cloud or self-hosted)
- ✅ OpenAI API key
- ✅ Instagram Connect Demo backend deployed and running
- ✅ N8N callback secret configured

---

## 🚀 Step 1: Import the Workflow

### Option A: Import via N8N UI

1. **Open your N8N instance** in a browser
2. **Click on "Workflows"** in the left sidebar
3. **Click the "+" button** or "Add Workflow" dropdown
4. **Select "Import from File"**
5. **Choose the file**: `n8n-instagram-ai-workflow.json`
6. **Click "Import"**

The workflow will be imported with all nodes and connections pre-configured!

### Option B: Import via URL (if hosted on GitHub)

1. **Copy the raw URL** of the workflow JSON file
2. **In N8N**, click "Add Workflow" → "Import from URL"
3. **Paste the URL** and click "Import"

---

## ⚙️ Step 2: Configure OpenAI Credentials

The workflow uses OpenAI for AI-powered responses. You need to add your OpenAI API key:

1. **Click on the "OpenAI Chat Model" node**
2. **Click on "Credentials"** dropdown
3. **Click "Create New Credential"**
4. **Enter your OpenAI API Key**
   - Get your API key from: https://platform.openai.com/api-keys
5. **Click "Save"**

---

## 🔧 Step 3: Get Your Webhook URL

1. **Click on the "Webhook Trigger" node**
2. **Look for "Production URL"** in the node settings
3. **Copy the webhook URL**
   - Example: `https://your-n8n-instance.com/webhook/instagram-message`
4. **Save this URL** - you'll need it for the backend configuration

---

## 🔐 Step 4: Configure Backend Environment Variables

### Local Development (.env)

Add these variables to your `.env` file:

```bash
# N8N Integration Configuration
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/instagram-message
N8N_CALLBACK_SECRET=your-secure-random-secret-key-here
N8N_TIMEOUT_MS=30000
```

**Generate a secure callback secret:**
```bash
# On macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Production (Doppler)

Set the same variables in Doppler:

```bash
doppler secrets set N8N_ENABLED=true
doppler secrets set N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/instagram-message
doppler secrets set N8N_CALLBACK_SECRET=your-secure-random-secret-key-here
doppler secrets set N8N_TIMEOUT_MS=30000
```

---

## ✅ Step 5: Activate the Workflow

1. **In N8N**, click the **"Active" toggle** in the top-right corner
2. **Confirm activation**
3. The workflow is now live and ready to receive webhooks! 🎉

---

## 🧪 Step 6: Test the Workflow

### Test with N8N's Test Webhook

1. **Click on the "Webhook Trigger" node**
2. **Click "Listen for Test Event"**
3. **Send a test payload** using curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook-test/instagram-message \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "test-msg-123",
    "senderId": "test-sender-456",
    "recipientId": "test-recipient-789",
    "messageText": "Hello, I need help with my order",
    "timestamp": "2025-11-01T22:00:00.000Z",
    "callbackUrl": "https://insta.tiblings.com/api/n8n/callback",
    "callbackSecret": "your-callback-secret"
  }'
```

4. **Check the execution** in N8N to see if it processed successfully

### Test with Real Instagram Message

1. **Send a message** to your Instagram Business Account from another account
2. **Check N8N executions** to see the workflow run
3. **Check your backend logs** to verify the callback was received
4. **Check the message queue**: `https://insta.tiblings.com/api/n8n/queue`

---

## 📊 Workflow Overview

### Nodes Included

1. **Webhook Trigger** - Receives Instagram messages from your backend
2. **Extract Message Data** - Validates and extracts message information
3. **OpenAI Chat Model** - Processes the message with AI
4. **Send Success Callback** - Sends AI response back to your backend
5. **Error Trigger** - Catches any errors in the workflow
6. **Prepare Error Response** - Formats error information
7. **Send Error Callback** - Sends error notification to your backend

### Data Flow

```
Instagram Message
    ↓
Your Backend (receives webhook from Meta)
    ↓
Forward to N8N Webhook
    ↓
Extract & Validate Data
    ↓
Process with OpenAI
    ↓
Send AI Response to Backend Callback
    ↓
Backend Sends Reply to Instagram
```

---

## 🎨 Customization Options

### Change AI Model

In the "OpenAI Chat Model" node:
- **Model**: Change from `gpt-4o-mini` to `gpt-4`, `gpt-3.5-turbo`, etc.
- **System Message**: Customize the AI's behavior and personality

### Adjust Response Length

In the system message, change:
```
Keep responses under 500 characters
```
to your preferred length.

### Add Custom Logic

Add additional Code nodes to:
- Filter messages by keywords
- Route to different AI models based on message type
- Add custom validation or preprocessing
- Log to external services

### Use Different AI Provider

Replace the OpenAI node with:
- **Anthropic Claude** - Use the Anthropic node
- **Google Gemini** - Use the Google AI node
- **Local LLM** - Use the Ollama node

---

## 🔍 Monitoring & Debugging

### View Workflow Executions

1. **Click "Executions"** tab in N8N
2. **See all workflow runs** with timestamps
3. **Click on an execution** to see detailed logs
4. **Inspect each node's output** to debug issues

### Check Backend Metrics

```bash
# View N8N metrics
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://insta.tiblings.com/api/n8n/metrics

# View message queue
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://insta.tiblings.com/api/n8n/queue

# View alerts
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://insta.tiblings.com/api/n8n/metrics/alerts
```

### Common Issues

#### ❌ Webhook Not Triggering
- ✅ Check workflow is activated
- ✅ Verify N8N_WEBHOOK_URL is correct in backend
- ✅ Check N8N logs for errors
- ✅ Verify firewall allows traffic

#### ❌ OpenAI Error
- ✅ Check API key is valid
- ✅ Verify OpenAI account has credits
- ✅ Check rate limits
- ✅ Review OpenAI API status

#### ❌ Callback Failed
- ✅ Verify N8N_CALLBACK_SECRET matches
- ✅ Check backend is running
- ✅ Verify network connectivity
- ✅ Check backend logs for errors

---

## 📚 Additional Resources

- **N8N Documentation**: https://docs.n8n.io
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Workflow Setup Guide**: `docs/N8N_WORKFLOW_SETUP.md`
- **Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Implementation Summary**: `docs/N8N_IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Next Steps

After importing and configuring the workflow:

1. ✅ **Test with sample messages** to verify end-to-end flow
2. ✅ **Customize AI system prompt** for your business needs
3. ✅ **Monitor metrics** to track performance
4. ✅ **Set up alerts** for high failure rates
5. ✅ **Scale as needed** by adjusting rate limits and batch sizes

---

## 💡 Pro Tips

- **Save workflow versions** before making changes
- **Use N8N's built-in testing** to debug individual nodes
- **Monitor OpenAI costs** to avoid unexpected charges
- **Set up error notifications** to catch issues quickly
- **Keep the callback secret secure** and rotate it periodically

---

## 🆘 Support

If you encounter issues:

1. **Check N8N execution logs** for detailed error messages
2. **Review backend logs**: `journalctl -u insta-connect.service -f`
3. **Verify all environment variables** are set correctly
4. **Test each component** individually (webhook, AI, callback)
5. **Consult the troubleshooting section** in `docs/N8N_WORKFLOW_SETUP.md`

---

**Status**: 🎉 **Ready to Import and Use!**

The workflow is production-ready and includes:
- ✅ Complete error handling
- ✅ Proper data validation
- ✅ Secure callback authentication
- ✅ Detailed logging
- ✅ Fallback responses

Import the workflow and start processing Instagram messages with AI! 🚀

