const crypto = require('crypto');

/**
 * Middleware to validate Meta webhook signatures
 * 
 * Meta sends webhooks with an X-Hub-Signature-256 header containing
 * an HMAC SHA256 signature of the request body using the APP_SECRET.
 * 
 * This middleware:
 * 1. Extracts the signature from the X-Hub-Signature-256 header
 * 2. Computes the expected signature using the raw request body
 * 3. Compares the signatures using a timing-safe comparison
 * 4. Rejects requests with invalid signatures
 * 
 * @param {string} appSecret - The Meta app secret from environment
 * @returns {Function} Express middleware function
 */
function validateWebhookSignature(appSecret) {
  return (req, res, next) => {
    // Skip validation for GET requests (verification handshake)
    if (req.method === 'GET') {
      return next();
    }

    // Get the signature from the header
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature) {
      console.error('❌ Webhook signature missing');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // The signature format is "sha256=<signature>"
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      console.error('❌ Invalid signature format');
      return res.status(401).json({ error: 'Invalid signature format' });
    }

    const receivedSignature = signatureParts[1];

    // Get the raw body (must be a string or Buffer)
    // Note: We need to use raw body, not parsed JSON
    const rawBody = req.rawBody;
    
    if (!rawBody) {
      console.error('❌ Raw body not available for signature validation');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Compute the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      console.error('❌ Webhook signature validation failed');
      console.error('  Received:', receivedSignature);
      console.error('  Expected:', expectedSignature);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Signature is valid, proceed
    console.log('✅ Webhook signature validated');
    next();
  };
}

/**
 * Middleware to capture raw body for signature validation
 * 
 * This must be applied BEFORE body-parser middleware.
 * It captures the raw request body and attaches it to req.rawBody
 * so it can be used for signature validation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function captureRawBody(req, res, next) {
  // Only capture for POST requests to /webhook
  if (req.method === 'POST' && req.path === '/webhook') {
    let data = '';
    req.setEncoding('utf8');
    
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
}

module.exports = {
  validateWebhookSignature,
  captureRawBody,
};

