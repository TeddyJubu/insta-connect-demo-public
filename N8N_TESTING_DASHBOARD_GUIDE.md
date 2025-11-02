# N8N Testing Dashboard Guide

## 📊 Overview

The N8N Testing Dashboard is a real-time monitoring tool that displays all N8N webhook callbacks and message processing events. It helps you verify that:

- ✅ N8N workflow is correctly receiving messages from your backend
- ✅ N8N is processing messages with OpenAI
- ✅ N8N is sending callbacks back to your backend
- ✅ Messages are being sent to Instagram successfully

---

## 🚀 Accessing the Dashboard

### URL
```
https://insta.tiblings.com/dashboard/n8n-test
```

### Requirements
- ✅ Must be logged in to your Instagram Connect account
- ✅ Must have a page selected in your dashboard

---

## 📋 Dashboard Features

### 1. **Auto-Refresh Controls**

Located at the top of the page:

- **Auto-refresh Toggle**: Enable/disable automatic updates
- **Refresh Interval**: Choose how often to refresh:
  - Every 2 seconds (fastest)
  - Every 5 seconds (default)
  - Every 10 seconds
  - Every 30 seconds

### 2. **Manual Controls**

- **🔄 Refresh Now**: Manually fetch the latest events
- **🗑️ Clear**: Clear the display (doesn't delete data from database)

### 3. **Event Display**

Each callback event shows:

#### **Left Column**
- **Message ID**: Unique identifier for the message
- **Status**: Current processing status (color-coded)
- **Sender ID**: Instagram user who sent the message
- **Message Text**: The original message content

#### **Right Column**
- **N8N Execution ID**: Unique ID for the N8N workflow execution
- **Processing Time**: How long N8N took to process (in milliseconds)
- **Received from N8N**: Timestamp when callback was received
- **AI Response**: The generated AI response

#### **Additional Info**
- **Error Message**: If status is "error", shows the error details
- **Timestamps**: When message was sent to N8N, received from N8N, and sent to Instagram
- **Retry Count**: Number of retry attempts

---

## 🎨 Status Indicators

### Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| `ready_to_send` | 🟢 Green | Ready to send to Instagram |
| `sent` | 🟢 Green | Successfully sent to Instagram |
| `processing` | 🔵 Blue | Currently being processed by N8N |
| `pending` | 🟡 Yellow | Waiting to be sent to N8N |
| `failed` | 🔴 Red | Processing failed |
| `dead_letter` | 🔴 Red | Exceeded max retries |

---

## 🧪 Testing Workflow

### Step 1: Prepare Your Setup

1. **Ensure N8N workflow is active**
   - Go to your N8N instance
   - Verify the workflow is activated (toggle is ON)

2. **Verify backend configuration**
   - Check that `N8N_ENABLED=true` in Doppler
   - Verify `N8N_WEBHOOK_URL` is correct
   - Confirm `N8N_CALLBACK_SECRET` matches

3. **Open the testing dashboard**
   - Navigate to `/dashboard/n8n-test`
   - Enable auto-refresh (every 5 seconds recommended)

### Step 2: Send a Test Message

**Option A: Send via Instagram**
1. Open Instagram
2. Send a message to your Business Account from another account
3. Watch the dashboard for the event to appear

**Option B: Send via Curl (for testing)**
```bash
curl -X POST https://nuxsfkohif8zh2fqplp8hfnm.hooks.n8n.cloud/webhook-test/instagram-message \
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

### Step 3: Monitor the Event

Watch the dashboard as the event progresses through these stages:

1. **Event appears** with status `pending`
2. **Status changes to `processing`** (N8N is working)
3. **Status changes to `ready_to_send`** (AI response received)
4. **Status changes to `sent`** (message sent to Instagram)

---

## 📊 Understanding the Data

### Processing Time

The "Processing Time" shows how long N8N took to:
1. Receive the message
2. Extract and validate data
3. Call OpenAI API
4. Send the callback

**Expected times:**
- Fast: 1-2 seconds
- Normal: 2-4 seconds
- Slow: 4-10 seconds (check OpenAI API status)

### Timestamps

- **Sent to N8N**: When your backend forwarded the message
- **Received from N8N**: When N8N sent the callback
- **Sent to Instagram**: When the reply was sent to Instagram

### Retry Count

Shows how many times the message was retried:
- `0` = First attempt succeeded
- `1+` = Message was retried (check error message)

---

## 🔍 Troubleshooting

### ❌ No Events Appearing

**Possible causes:**
1. N8N workflow is not activated
2. N8N webhook URL is incorrect
3. Backend is not forwarding messages to N8N
4. No messages have been sent yet

**Solutions:**
1. Check N8N workflow status (should be "Active")
2. Verify `N8N_WEBHOOK_URL` in Doppler
3. Check backend logs: `journalctl -u insta-connect.service -f`
4. Send a test message and wait 5-10 seconds

### ❌ Status Stuck on "pending"

**Possible causes:**
1. N8N webhook is not receiving the message
2. N8N workflow has an error
3. Network connectivity issue

**Solutions:**
1. Check N8N execution logs
2. Verify webhook URL is correct
3. Test webhook with curl command
4. Check firewall/network settings

### ❌ Status Shows "failed" or "dead_letter"

**Possible causes:**
1. OpenAI API error
2. Invalid OpenAI API key
3. OpenAI account out of credits
4. N8N callback validation failed

**Solutions:**
1. Check error message in the dashboard
2. Verify OpenAI API key in N8N
3. Check OpenAI account credits
4. Verify callback secret matches

### ❌ Processing Time is Very High (>10s)

**Possible causes:**
1. OpenAI API is slow
2. Network latency
3. N8N instance is overloaded

**Solutions:**
1. Check OpenAI API status
2. Try a simpler message
3. Check N8N instance performance
4. Consider using a faster AI model (gpt-3.5-turbo)

---

## 💡 Pro Tips

### 1. **Monitor During Peak Hours**
- Watch the dashboard during times when you expect messages
- This helps identify performance issues early

### 2. **Test Different Message Types**
- Short messages: "Hi"
- Long messages: "I have a question about..."
- Special characters: "What's the price? 💰"

### 3. **Check Processing Times**
- Track average processing time
- Alert if it exceeds 5 seconds
- Investigate spikes

### 4. **Review Error Messages**
- Each error is logged with details
- Use error messages to debug issues
- Share errors with support if needed

### 5. **Use Auto-Refresh Wisely**
- Faster refresh = more API calls
- Use 5-10 second intervals for normal monitoring
- Use 2 second intervals only during active testing

---

## 📈 Performance Metrics

### Expected Performance

| Metric | Expected | Warning | Critical |
|--------|----------|---------|----------|
| Processing Time | 2-4s | >5s | >10s |
| Success Rate | >95% | <95% | <80% |
| Retry Count | 0 | 1-2 | >2 |

### Monitoring

Check these metrics regularly:
1. **Success Rate**: Percentage of messages processed successfully
2. **Average Processing Time**: How long messages take to process
3. **Error Rate**: Percentage of failed messages
4. **Retry Rate**: How often messages need to be retried

---

## 🔐 Security Notes

### Data Privacy

- The dashboard only shows data for your selected page
- Other users cannot see your callback events
- All data is encrypted in transit (HTTPS)

### Callback Secret

- The callback secret is used to validate N8N callbacks
- Never share your callback secret
- Rotate it periodically for security

---

## 📞 Support

If you encounter issues:

1. **Check the error message** in the dashboard
2. **Review N8N execution logs** in your N8N instance
3. **Check backend logs**: `journalctl -u insta-connect.service -f`
4. **Verify all configuration** matches between N8N and backend
5. **Test with curl** to isolate the issue

---

## 🎯 Next Steps

After verifying the N8N workflow is working:

1. ✅ **Customize the AI prompt** for your business
2. ✅ **Test with real messages** from customers
3. ✅ **Monitor performance** over time
4. ✅ **Set up alerts** for high failure rates
5. ✅ **Scale as needed** by adjusting rate limits

---

**Status**: 🎉 **Testing Dashboard Ready!**

The N8N Testing Dashboard is now available at `/dashboard/n8n-test` and ready to help you monitor and debug your N8N integration! 🚀

