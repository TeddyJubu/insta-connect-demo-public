require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const helmet = require('helmet');

const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args)));

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
} = process.env;

const isProduction = NODE_ENV === 'production';
const shouldEnforceHttps = ENFORCE_HTTPS === 'true';
const DEFAULT_STATE_TTL = 10 * 60 * 1000;
const parsedStateTtl = Number(OAUTH_STATE_TTL_MS);
const STATE_TTL = Number.isFinite(parsedStateTtl) && parsedStateTtl > 0 ? parsedStateTtl : DEFAULT_STATE_TTL;
const stateStore = new Map();

if (!APP_ID || !APP_SECRET || !OAUTH_REDIRECT_URI || !SCOPES || !OAUTH_STATE_SECRET || !VERIFY_TOKEN) {
  console.warn('⚠️  Missing required OAuth environment variables; check your .env file.');
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

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

app.use(express.static('public'));

// Keep demo state in memory; use persistent storage in production.
const store = {
  userToken: null,
  selectedPage: null,
  instagram: null,
  webhookFields: new Set(),
};

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

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  try {
    const state = makeState();
    res.cookie('oauth_state', state, oauthCookieOptions);
    res.redirect(buildAuthUrl(state));
  } catch (err) {
    res.status(500).send(String(err));
  }
});

app.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies.oauth_state;
    const issuedAt = state ? stateStore.get(state) : undefined;
    const stateExpired = typeof issuedAt === 'number' ? Date.now() - issuedAt > STATE_TTL : true;

    if (!code || !state || state !== cookieState || !issuedAt || stateExpired) {
      return res.status(400).send('Invalid state or missing code');
    }

    stateStore.delete(state);
    res.clearCookie('oauth_state', { ...oauthCookieOptions, maxAge: undefined });

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

    store.userToken = longJson.access_token;

    const pagesResp = await fetch(`${GRAPH_BASE}/me/accounts?fields=name,id,access_token`, {
      headers: { Authorization: `Bearer ${store.userToken}` },
    });
    const pagesJson = await pagesResp.json();
    if (!pagesResp.ok) {
      throw new Error(`Fetching pages failed: ${JSON.stringify(pagesJson)}`);
    }
    if (!Array.isArray(pagesJson.data) || pagesJson.data.length === 0) {
      throw new Error('No managed pages found');
    }

    const page = pagesJson.data[0];
    store.selectedPage = page;

    const pageFieldsResp = await fetch(`${GRAPH_BASE}/${page.id}?fields=instagram_business_account{id,username}`, {
      headers: { Authorization: `Bearer ${page.access_token}` },
    });
    const pageFieldsJson = await pageFieldsResp.json();
    if (!pageFieldsResp.ok) {
      throw new Error(`Page fields failed: ${JSON.stringify(pageFieldsJson)}`);
    }

    store.instagram = pageFieldsJson.instagram_business_account || null;

    const subUrl = new URL(`${GRAPH_BASE}/${page.id}/subscribed_apps`);
    subUrl.searchParams.set('subscribed_fields', 'messages');
    const subResp = await fetch(subUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${page.access_token}` },
    });
    const subJson = await subResp.json();
    if (!subResp.ok) {
      throw new Error(`Subscribing app failed: ${JSON.stringify(subJson)}`);
    }

    store.webhookFields.add('messages');

    res.redirect('/?status=ok');
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

function serializeStatus() {
  return {
    connected: Boolean(store.selectedPage),
    page: store.selectedPage,
    instagram: store.instagram,
    webhooks: Array.from(store.webhookFields),
  };
}

app.get('/whoami', (_req, res) => {
  res.json(serializeStatus());
});

app.get('/api/status', (_req, res) => {
  res.json(serializeStatus());
});

async function mutateWebhookSubscription(method, field) {
  const page = store.selectedPage;
  if (!page || !page.access_token) {
    throw new Error('Connect a page with a valid access token before managing webhooks.');
  }

  const url = new URL(`${GRAPH_BASE}/${page.id}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', field);

  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${page.access_token}` },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    // Some Graph responses are empty on success; ignore JSON parse errors then.
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || JSON.stringify(payload) || 'Unknown error';
    throw new Error(message);
  }

  return payload;
}

app.get('/api/webhooks', (_req, res) => {
  res.json({ webhooks: Array.from(store.webhookFields) });
});

app.post('/api/webhooks', async (req, res) => {
  const field = (req.body?.field || '').trim();
  if (!field) {
    return res.status(400).json({ error: 'Webhook field is required.' });
  }

  try {
    await mutateWebhookSubscription('POST', field);
    store.webhookFields.add(field);
    res.json({ field, status: 'subscribed' });
  } catch (err) {
    console.error('Failed to subscribe to webhook', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.delete('/api/webhooks/:field', async (req, res) => {
  const field = (req.params.field || '').trim();
  if (!field) {
    return res.status(400).json({ error: 'Webhook field is required.' });
  }

  try {
    await mutateWebhookSubscription('DELETE', field);
    store.webhookFields.delete(field);
    res.json({ field, status: 'unsubscribed' });
  } catch (err) {
    console.error('Failed to unsubscribe from webhook', err);
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

app.post('/webhook', (req, res) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Received webhook payload:', JSON.stringify(req.body));
  }

  res.sendStatus(200);
});

app.listen(Number(PORT), () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
