require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const helmet = require('helmet');

// Import database and models
const db = require('./src/db');
const MetaAccount = require('./src/models/MetaAccount');
const Page = require('./src/models/Page');
const InstagramAccount = require('./src/models/InstagramAccount');
const WebhookSubscription = require('./src/models/WebhookSubscription');
const WebhookEvent = require('./src/models/WebhookEvent');

// Import routes and middleware
const authRoutes = require('./src/routes/auth');
const webhookDashboardRoutes = require('./src/routes/webhookDashboard');
const { requireAuth, optionalAuth } = require('./src/middleware/auth');
const { validateWebhookSignature } = require('./src/middleware/webhookValidation');

const fetch =
  global.fetch ||
  ((...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args)));

const app = express();
const {
  PORT = 3000,
  APP_ID,
  APP_SECRET,
  OAUTH_REDIRECT_URI,
  SCOPES,
  OAUTH_STATE_SECRET,
  VERIFY_TOKEN,
  COOKIE_DOMAIN,
  NODE_ENV,
  ENFORCE_HTTPS,
  OAUTH_STATE_TTL_MS,
  SESSION_SECRET,
} = process.env;

const isProduction = NODE_ENV === 'production';
const shouldEnforceHttps = ENFORCE_HTTPS === 'true';
const DEFAULT_STATE_TTL = 10 * 60 * 1000;
const parsedStateTtl = Number(OAUTH_STATE_TTL_MS);
const STATE_TTL =
  Number.isFinite(parsedStateTtl) && parsedStateTtl > 0 ? parsedStateTtl : DEFAULT_STATE_TTL;
const stateStore = new Map();

if (
  !APP_ID ||
  !APP_SECRET ||
  !OAUTH_REDIRECT_URI ||
  !SCOPES ||
  !OAUTH_STATE_SECRET ||
  !VERIFY_TOKEN
) {
  console.warn('⚠️  Missing required OAuth environment variables; check your .env file.');
}

if (!SESSION_SECRET) {
  console.warn('⚠️  Missing SESSION_SECRET; using insecure default for development only.');
}

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// Capture raw body for webhook signature validation
// This must come BEFORE express.json()
app.use(
  '/webhook',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form submissions
app.use(cookieParser());

// Session configuration
app.use(
  session({
    store: new pgSession({
      pool: db.pool,
      tableName: 'sessions',
      createTableIfMissing: false, // We create it in migration
    }),
    secret: SESSION_SECRET || 'insecure-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    },
    name: 'insta_connect_sid',
  }),
);

if (shouldEnforceHttps) {
  app.use((req, res, next) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    if (req.secure || forwardedProto === 'https') {
      return next();
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return res.status(403).send('HTTPS is required.');
  });
}

// Mount authentication routes
app.use('/auth', authRoutes);

// Mount webhook dashboard API routes
app.use('/api', webhookDashboardRoutes);

const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  maxAge: STATE_TTL,
};

if (COOKIE_DOMAIN) {
  oauthCookieOptions.domain = COOKIE_DOMAIN;
}

function trimExpiredStates() {
  const now = Date.now();
  for (const [value, issuedAt] of stateStore.entries()) {
    if (now - issuedAt > STATE_TTL) {
      stateStore.delete(value);
    }
  }
}

setInterval(trimExpiredStates, STATE_TTL).unref?.();

const OAUTH_BASE = 'https://www.facebook.com/v20.0/dialog/oauth';
const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

function buildAuthUrl(state) {
  const url = new URL(OAUTH_BASE);
  url.searchParams.set('client_id', APP_ID);
  url.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

function makeState() {
  const randomSeed = crypto.randomBytes(32).toString('hex');
  const state = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(randomSeed).digest('hex');
  stateStore.set(state, Date.now());
  return state;
}

app.get('/', optionalAuth, async (req, res) => {
  // If not authenticated, show login/register page
  if (!req.session.userId) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Instagram Connect Demo</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          h1 { color: #333; }
          p { color: #666; line-height: 1.6; }
          .buttons { display: flex; gap: 15px; justify-content: center; margin-top: 30px; }
          .btn {
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
          }
          .btn-primary {
            background: #0095f6;
            color: white;
          }
          .btn-secondary {
            background: white;
            color: #0095f6;
            border: 1px solid #0095f6;
          }
          .btn:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <h1>📸 Instagram Connect Demo</h1>
        <p>Connect your Instagram Business account to receive and respond to messages.</p>
        <div class="buttons">
          <a href="/auth/login" class="btn btn-primary">Log In</a>
          <a href="/auth/register" class="btn btn-secondary">Sign Up</a>
        </div>
      </body>
      </html>
    `);
  }

  // User is authenticated, show the main app
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files AFTER the home route to prevent index.html from being served automatically
app.use(express.static('public'));

// Instagram OAuth login (requires user to be authenticated first)
app.get('/login', requireAuth, (req, res) => {
  try {
    const state = makeState();
    res.cookie('oauth_state', state, oauthCookieOptions);
    res.redirect(buildAuthUrl(state));
  } catch (err) {
    res.status(500).send(String(err));
  }
});

app.get('/oauth/callback', requireAuth, async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies.oauth_state;
    const issuedAt = state ? stateStore.get(state) : undefined;
    const stateExpired = typeof issuedAt === 'number' ? Date.now() - issuedAt > STATE_TTL : true;

    if (!code || !state || state !== cookieState || !issuedAt || stateExpired) {
      const errorMessage = encodeURIComponent('Invalid OAuth state or authorization code');
      const errorDetails = encodeURIComponent(
        'The OAuth flow may have expired or been tampered with. Please try again.',
      );
      return res.redirect(`/oauth/error?error=${errorMessage}&details=${errorDetails}`);
    }

    stateStore.delete(state);
    res.clearCookie('oauth_state', { ...oauthCookieOptions, maxAge: undefined });

    const userId = req.session.userId;

    // Exchange code for short-lived token
    const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', APP_ID);
    tokenUrl.searchParams.set('client_secret', APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenResp = await fetch(tokenUrl);
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) {
      throw new Error(`OAuth exchange failed: ${JSON.stringify(tokenJson)}`);
    }

    const shortLived = tokenJson.access_token;

    // Exchange for long-lived token
    const longUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', APP_ID);
    longUrl.searchParams.set('client_secret', APP_SECRET);
    longUrl.searchParams.set('fb_exchange_token', shortLived);

    const longResp = await fetch(longUrl);
    const longJson = await longResp.json();
    if (!longResp.ok) {
      throw new Error(`Upgrade token failed: ${JSON.stringify(longJson)}`);
    }

    const userToken = longJson.access_token;
    const expiresIn = longJson.expires_in; // seconds
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // Get Meta user ID
    const meResp = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const meJson = await meResp.json();
    if (!meResp.ok) {
      throw new Error(`Fetching user info failed: ${JSON.stringify(meJson)}`);
    }

    // Save Meta account to database
    const metaAccount = await MetaAccount.upsert({
      userId,
      metaUserId: meJson.id,
      accessToken: userToken,
      tokenType: 'long_lived',
      expiresAt,
      scopes: SCOPES,
    });

    console.log('✅ Meta account saved:', metaAccount.meta_user_id);

    // Fetch user's pages
    const pagesResp = await fetch(`${GRAPH_BASE}/me/accounts?fields=name,id,access_token`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const pagesJson = await pagesResp.json();
    if (!pagesResp.ok) {
      throw new Error(`Fetching pages failed: ${JSON.stringify(pagesJson)}`);
    }
    if (!Array.isArray(pagesJson.data) || pagesJson.data.length === 0) {
      throw new Error('No managed pages found');
    }

    // Save all pages to database
    for (const pageData of pagesJson.data) {
      await Page.upsert({
        userId,
        metaAccountId: metaAccount.id,
        pageId: pageData.id,
        pageName: pageData.name,
        pageAccessToken: pageData.access_token,
        tokenExpiresAt: null, // Page tokens don't expire
      });
    }

    // Select the first page
    const firstPage = pagesJson.data[0];
    const savedPage = await Page.findByUserAndPageId(userId, firstPage.id);
    await Page.setSelected(userId, savedPage.id);

    console.log('✅ Page selected:', savedPage.page_name);

    // Get Instagram Business Account for the selected page
    const pageFieldsResp = await fetch(
      `${GRAPH_BASE}/${firstPage.id}?fields=instagram_business_account{id,username}`,
      {
        headers: { Authorization: `Bearer ${firstPage.access_token}` },
      },
    );
    const pageFieldsJson = await pageFieldsResp.json();
    if (!pageFieldsResp.ok) {
      throw new Error(`Page fields failed: ${JSON.stringify(pageFieldsJson)}`);
    }

    // Save Instagram account if exists
    if (pageFieldsJson.instagram_business_account) {
      const igAccount = await InstagramAccount.upsert({
        pageId: savedPage.id,
        instagramId: pageFieldsJson.instagram_business_account.id,
        username: pageFieldsJson.instagram_business_account.username,
      });
      console.log('✅ Instagram account saved:', igAccount.username);
    }

    // Subscribe to webhooks
    const subUrl = new URL(`${GRAPH_BASE}/${firstPage.id}/subscribed_apps`);
    subUrl.searchParams.set('subscribed_fields', 'messages');
    const subResp = await fetch(subUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${firstPage.access_token}` },
    });
    const subJson = await subResp.json();
    if (!subResp.ok) {
      throw new Error(`Subscribing app failed: ${JSON.stringify(subJson)}`);
    }

    // Save webhook subscription
    await WebhookSubscription.create(savedPage.id, 'messages');
    console.log('✅ Webhook subscription saved: messages');

    res.redirect('/oauth/success');
  } catch (err) {
    console.error('❌ OAuth callback error:', err);
    const errorMessage = encodeURIComponent(err.message || 'OAuth connection failed');
    const errorDetails = encodeURIComponent(String(err));
    res.redirect(`/oauth/error?error=${errorMessage}&details=${errorDetails}`);
  }
});

async function serializeStatus(userId) {
  if (!userId) {
    return {
      connected: false,
      page: null,
      instagram: null,
      webhooks: [],
    };
  }

  const selectedPage = await Page.findSelectedByUserId(userId);
  if (!selectedPage) {
    return {
      connected: false,
      page: null,
      instagram: null,
      webhooks: [],
    };
  }

  const instagram = await InstagramAccount.findByPageId(selectedPage.id);
  const webhookSubs = await WebhookSubscription.findByPageId(selectedPage.id);

  return {
    connected: true,
    page: {
      id: selectedPage.page_id,
      name: selectedPage.page_name,
      access_token: selectedPage.page_access_token,
    },
    instagram: instagram
      ? {
          id: instagram.instagram_id,
          username: instagram.username,
        }
      : null,
    webhooks: webhookSubs.map((sub) => sub.field),
  };
}

app.get('/whoami', optionalAuth, async (req, res) => {
  const status = await serializeStatus(req.session.userId);
  res.json(status);
});

app.get('/api/status', optionalAuth, async (req, res) => {
  const status = await serializeStatus(req.session.userId);
  res.json(status);
});

async function mutateWebhookSubscription(userId, method, field) {
  const selectedPage = await Page.findSelectedByUserId(userId);
  if (!selectedPage || !selectedPage.page_access_token) {
    throw new Error('Connect a page with a valid access token before managing webhooks.');
  }

  const url = new URL(`${GRAPH_BASE}/${selectedPage.page_id}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', field);

  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${selectedPage.page_access_token}` },
  });

  let payload = null;
  try {
    payload = await response.json();
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // Some Graph responses are empty on success; ignore JSON parse errors then.
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || JSON.stringify(payload) || 'Unknown error';
    throw new Error(message);
  }

  return { payload, pageId: selectedPage.id };
}

app.get('/api/webhooks', requireAuth, async (req, res) => {
  try {
    const selectedPage = await Page.findSelectedByUserId(req.session.userId);
    if (!selectedPage) {
      return res.json({ webhooks: [] });
    }

    const webhookSubs = await WebhookSubscription.findByPageId(selectedPage.id);
    res.json({ webhooks: webhookSubs.map((sub) => sub.field) });
  } catch (err) {
    console.error('Failed to fetch webhooks', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/api/webhooks', requireAuth, async (req, res) => {
  const field = (req.body?.field || '').trim();
  if (!field) {
    return res.status(400).json({ error: 'Webhook field is required.' });
  }

  try {
    const { pageId } = await mutateWebhookSubscription(req.session.userId, 'POST', field);
    await WebhookSubscription.create(pageId, field);
    console.log('✅ Webhook subscribed:', field);
    res.json({ field, status: 'subscribed' });
  } catch (err) {
    console.error('❌ Failed to subscribe to webhook', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.delete('/api/webhooks/:field', requireAuth, async (req, res) => {
  const field = (req.params.field || '').trim();
  if (!field) {
    return res.status(400).json({ error: 'Webhook field is required.' });
  }

  try {
    const { pageId } = await mutateWebhookSubscription(req.session.userId, 'DELETE', field);
    await WebhookSubscription.delete(pageId, field);
    console.log('✅ Webhook unsubscribed:', field);
    res.json({ field, status: 'unsubscribed' });
  } catch (err) {
    console.error('❌ Failed to unsubscribe from webhook', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get('/privacy-policy', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge || '');
  }

  res.sendStatus(403);
});

app.post('/webhook', validateWebhookSignature(APP_SECRET), async (req, res) => {
  // Immediately respond with 200 to acknowledge receipt
  // Meta requires a 200 response within 20 seconds
  res.sendStatus(200);

  // Queue the event for processing
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('⚠️  Received empty webhook payload');
      return;
    }

    console.log('📨 Received webhook payload:', JSON.stringify(req.body, null, 2));

    // Extract event type and page ID from payload
    const payload = req.body;
    const eventType = payload.object || 'unknown';
    let pageId = null;

    // Try to find the page ID from the payload
    // Instagram webhooks have entry.id which is the Instagram account ID
    // We need to look up the page_id from our database
    if (payload.entry && payload.entry.length > 0) {
      const instagramId = payload.entry[0].id;

      // Look up the page by Instagram account ID
      const result = await db.query(
        `SELECT page_id FROM instagram_accounts WHERE instagram_id = $1`,
        [instagramId],
      );

      if (result.rows.length > 0) {
        pageId = result.rows[0].page_id;
      }
    }

    // Create webhook event in database
    const event = await WebhookEvent.create({
      pageId,
      eventType,
      payload,
      status: 'pending',
    });

    console.log(`✅ Webhook event queued: ID ${event.id}, Type: ${eventType}`);
  } catch (error) {
    console.error('❌ Error queueing webhook event:', error);
    // Don't throw - we already sent 200 response
  }
});

app.listen(Number(PORT), () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
