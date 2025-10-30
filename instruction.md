# Goal
A tiny web app with a **“Connect Instagram”** button. When clicked, it walks your user through Meta’s login, asks for the right permissions, returns to your site, and collects:

- Their **Facebook Page(s)**
- The **Instagram account** connected to a chosen Page
- A **Page access token** you can later use in tools like n8n to send IG DMs.

We’ll do this with plain **Node.js + Express** and vanilla HTML—beginner-safe. You can swap to Next.js or any framework later.

---

## 0) Prerequisites (one-time setup you do as the developer)
1) **Meta developer account**: https://developers.facebook.com/
2) **Create a Meta App** (type: Business or None → add products later).
3) In **App → Settings → Basic** grab:
   - **App ID**
   - **App Secret**
   - Set an **App Domain** (e.g., `localhost` for dev; later your real domain).
   - Add a **Privacy Policy URL** (required for production/live). For dev, a placeholder page works.
4) In **Facebook Login** (product) → **Settings**:
   - **Valid OAuth Redirect URIs**: add your callback URL (e.g., `http://localhost:3000/oauth/callback`).
5) Make sure your Instagram **Professional** account is **linked to a Facebook Page** (your client’s IG must be connected to their Page). You only need this to test end‑to‑end.
6) For Dev Mode testing: add your own FB/IG accounts as **Roles → Developers/Testers** in the app dashboard.

> You do App Review later *once*, so new clients don’t need to. For development, Dev Mode is fine but events only work for app roles (admins/devs/testers).

---

## 1) Create the project
```bash
mkdir insta-connect-demo && cd insta-connect-demo
npm init -y
npm i express cookie-parser dotenv crypto
# Node 18+ has fetch built-in; if you’re on Node 16, also do: npm i node-fetch
```

Create a folder structure:
```
insta-connect-demo/
  .env
  server.js
  public/
    index.html
```

---

## 2) Configure environment variables (.env)
Create `.env` with your real values:
```ini
PORT=3000
APP_ID=YOUR_META_APP_ID
APP_SECRET=YOUR_META_APP_SECRET
# The URL that handles Facebook’s redirect back to you
OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback
# Comma-separated scopes. Keep it minimal but sufficient for IG DM flows.
SCOPES=pages_show_list,pages_manage_metadata,instagram_basic,instagram_manage_messages,pages_messaging
# A random string to help protect against CSRF during OAuth
OAUTH_STATE_SECRET=change_this_to_any_random_string
```

**Why these scopes?**
- `pages_show_list` → list user’s Pages
- `pages_manage_metadata` → manage page subscriptions
- `instagram_basic` → read basic IG account info
- `instagram_manage_messages` → read/reply to IG DMs
- `pages_messaging` → required to send messages via the Page endpoint

---

## 3) Frontend: the Connect button (public/index.html)
```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect Instagram Demo</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}
      button{font-size:16px;padding:12px 16px;border-radius:10px;border:1px solid #ddd;cursor:pointer}
      .card{border:1px solid #eee;border-radius:12px;padding:16px;margin:16px 0}
      code{background:#f6f6f6;padding:2px 6px;border-radius:6px}
    </style>
  </head>
  <body>
    <h1>Connect Instagram</h1>
    <p>Click the button below to connect your Facebook Page + Instagram account.</p>
    <button onclick="window.location.href='/login'">Connect Instagram</button>

    <div id="result" class="card" style="display:none"></div>
    <script>
      // After callback, the server may redirect to /?status=ok
      const params = new URLSearchParams(window.location.search);
      if (params.get('status') === 'ok') {
        fetch('/whoami').then(r=>r.json()).then(data=>{
          const box = document.getElementById('result');
          box.style.display='block';
          box.innerHTML = `<h3>Connected ✅</h3>
            <p><b>Page:</b> ${data.page?.name} (ID: <code>${data.page?.id}</code>)</p>
            <p><b>Instagram:</b> ${data.instagram?.username || 'not linked'} (ID: <code>${data.instagram?.id || '—'}</code>)</p>`;
        });
      }
    </script>
  </body>
</html>
```

---

## 4) Backend: Express server (server.js)
This server implements the three key pieces:
- **/login** → sends the user to Facebook’s OAuth dialog
- **/oauth/callback** → exchanges `code` → gets a long‑lived user token → fetches Pages → picks one
- **/connect-page** (done automatically) → gets Page token, reads linked IG account, and subscribes messaging webhooks

```js
// server.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

const {
  PORT = 3000,
  APP_ID,
  APP_SECRET,
  OAUTH_REDIRECT_URI,
  SCOPES,
  OAUTH_STATE_SECRET,
} = process.env;

// In-memory demo store (replace with a DB in production)
const store = {
  userToken: null,       // long-lived user access token
  selectedPage: null,    // { id, name, access_token }
  instagram: null,       // { id, username }
};

// Helper to build the OAuth URL
function buildAuthUrl(state) {
  const url = new URL(`https://www.facebook.com/v20.0/dialog/oauth`);
  url.searchParams.set('client_id', APP_ID);
  url.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

// Simple state/CSRF token
function makeState() {
  return crypto
    .createHmac('sha256', OAUTH_STATE_SECRET)
    .update(String(Date.now()))
    .digest('hex');
}

// GET /login: kick off OAuth
app.get('/login', (req, res) => {
  const state = makeState();
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax' });
  res.redirect(buildAuthUrl(state));
});

// GET /oauth/callback: exchange code → user token → list pages → connect first page (for demo)
app.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies['oauth_state'];
    if (!code || !state || state !== cookieState) {
      return res.status(400).send('Invalid state or missing code');
    }

    // 1) Exchange code for SHORT-lived user token
    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', APP_ID);
    tokenUrl.searchParams.set('client_secret', APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);
    const tokenResp = await fetch(tokenUrl);
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) throw new Error('OAuth exchange failed: ' + JSON.stringify(tokenJson));

    const shortLived = tokenJson.access_token;

    // 2) Upgrade to LONG-lived user token (lasts ~60 days)
    const longUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', APP_ID);
    longUrl.searchParams.set('client_secret', APP_SECRET);
    longUrl.searchParams.set('fb_exchange_token', shortLived);
    const longResp = await fetch(longUrl);
    const longJson = await longResp.json();
    if (!longResp.ok) throw new Error('Upgrade token failed: ' + JSON.stringify(longJson));

    store.userToken = longJson.access_token;

    // 3) Get user’s Pages (requires pages_show_list)
    const pagesResp = await fetch('https://graph.facebook.com/v20.0/me/accounts?fields=name,id,access_token', {
      headers: { Authorization: `Bearer ${store.userToken}` },
    });
    const pages = await pagesResp.json();
    if (!pagesResp.ok) throw new Error('Fetching pages failed: ' + JSON.stringify(pages));
    if (!pages.data || pages.data.length === 0) throw new Error('No managed pages found');

    // For demo, auto-pick the first page. In production, render a chooser UI.
    const page = pages.data[0];
    store.selectedPage = page; // includes page.access_token scoped for this page

    // 4) Resolve linked Instagram account for the selected Page
    const pageFieldsResp = await fetch(`https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account{id,username}`, {
      headers: { Authorization: `Bearer ${page.access_token}` },
    });
    const pageFields = await pageFieldsResp.json();
    if (!pageFieldsResp.ok) throw new Error('Page fields failed: ' + JSON.stringify(pageFields));

    store.instagram = pageFields.instagram_business_account || null;

    // 5) Subscribe your app to Page webhooks for messages (so DMs hit your webhook later)
    const subUrl = new URL(`https://graph.facebook.com/v20.0/${page.id}/subscribed_apps`);
    subUrl.searchParams.set('subscribed_fields', 'messages');
    const subResp = await fetch(subUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${page.access_token}` },
    });
    const subJson = await subResp.json();
    if (!subResp.ok) throw new Error('Subscribing app failed: ' + JSON.stringify(subJson));

    // Success → back to homepage with status flag
    res.redirect('/?status=ok');
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

// Helper for the demo UI to display what we connected
app.get('/whoami', (req, res) => {
  res.json({ page: store.selectedPage, instagram: store.instagram });
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
```

> In production, store tokens in a database and encrypt at rest. The demo keeps them in memory so you can see the flow clearly.

---

## 5) Run it
```bash
node server.js
```
Open `http://localhost:3000` and click **Connect Instagram**. Complete the Facebook login and accept permissions. You’ll land back on `/` and see the connected Page + Instagram details.

If you see **“Instagram: not linked”**:
- Open the selected Facebook Page → **Linked accounts** → connect your IG Professional account to that Page.
- Then re-run the connection (or add a “Retry IG Link Check” button that repeats step 4).

---

## 6) (Optional) Add a Page chooser UI
Right now we auto-select the first Page. For real users, present a list.

- Fetch Pages (already in the code).
- Render a simple form to choose a Page ID.
- POST that Page ID to an endpoint that runs steps 4–5 (IG lookup + subscribed_apps) for the chosen page.

This makes onboarding smoother for agencies who manage multiple Pages.

---

## 7) (Optional) Webhook receiver for messages
To actually receive DMs as webhooks, add two routes and point your **App → Webhooks (Instagram & Page)** subscriptions to them (use a tool like **Cloudflare Tunnel** or **ngrok** for a public URL during development):

**Add to `server.js`:**
```js
// VERIFY (GET) — Meta sends hub.challenge
app.get('/webhook', (req, res) => {
  const challenge = req.query['hub.challenge'];
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  // Compare token with your secret; for demo accept any
  if (mode === 'subscribe' && challenge) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// EVENTS (POST) — Instagram/Page events arrive here
app.post('/webhook', (req, res) => {
  console.log('Webhook event:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});
```

Then in the App Dashboard → **Webhooks**, subscribe the **Instagram** object to **messages**, and the **Page** object to **messages** as well. Set the callback URL to your public `/webhook` endpoint.

---

## 8) Common pitfalls and fixes
- **Dev Mode blindness**: In Dev Mode, only app **roles** (admins/devs/testers) can connect and trigger messages. Add test accounts under **Roles**.
- **Invalid redirect URI**: The OAuth callback must exactly match what’s in **Facebook Login → Valid OAuth Redirect URIs**.
- **No Pages found**: The user’s Facebook profile doesn’t manage any Pages (or the scope was denied). Use another account or share a Page.
- **Instagram not linked**: The Page isn’t linked to an IG Professional account. Link it in Page settings and retry.
- **Subscribing app failed**: Usually missing `pages_manage_metadata` or using the wrong token (use the **Page access token**, not the user token).

---

## 9) Where to go next
- Replace the auto-pick Page logic with a **selector UI**.
- Store tokens in a database; refresh/repair flows if tokens expire.
- After connect, hand the **Page access token** + **IG account ID** to your **n8n** workflow so it can send DMs (`POST /{PAGE_ID}/messages`).
- Add a health check that re-runs: “Is IG linked? Is app subscribed? Can I read Page info?” and shows ✅ / ❌ with fix buttons.

---

## 10) You can totally lean on an AI coder
If you prefer to skip hand-wiring, hand this doc to an AI code assistant with the tasks:
1) “Generate the Express app with the endpoints above.”
2) “Add a Page chooser UI and store tokens to SQLite/Postgres.”
3) “Create a health-check page that re-subscribes the selected page if needed.”

Ship the basics first; fancy comes later. 🛠️🚀

