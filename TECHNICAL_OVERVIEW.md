# Insta Connect Demo: Technical Overview

## Purpose
This Express-based demo showcases the minimum pieces needed to connect a Facebook Page and its linked Instagram Business account to a custom app. It walks through the Meta OAuth handshake, upgrades the token for long-lived use, inspects the Page for Instagram linkage, and subscribes the app for webhook delivery.

## Application Architecture
- **Runtime & entry point**: `server.js` bootstraps Express, loads `.env` variables via `dotenv`, registers JSON + cookie middleware, and exposes HTTP routes. Static assets (`public/index.html`, `privacy-policy.html`) are served from the `public/` directory.
- **State handling**: An in-memory `store` object caches the most recent user access token, selected Facebook Page, and Instagram account metadata. This is sufficient for the demo but should be replaced with persistent storage in production.
- **OAuth helpers**: `buildAuthUrl()` composes the Meta login URL and `makeState()` signs a timestamp with `OAUTH_STATE_SECRET`. These keep routing logic in `server.js` concise.
- **HTTP client**: Uses the global Fetch API when available (Node 18+) and falls back to `node-fetch` otherwise, allowing a single code path for Graph API calls.

## OAuth + Graph API Flow
1. **Login redirect** (`/login`): Generates an HMAC-based state token, stores it in an HTTP-only cookie, and redirects the browser to the Meta OAuth dialog with scopes provided via `SCOPES`.
2. **Callback processing** (`/oauth/callback`): Validates that the `state` query matches the cookie to guard against CSRF, then exchanges the authorization code for a short-lived user access token.
3. **Token upgrade**: Calls `/{app-id}/oauth/access_token` with `grant_type=fb_exchange_token` to obtain a long-lived user access token and caches it in memory.
4. **Page discovery**: Requests `me/accounts?fields=name,id,access_token` to enumerate manageable Facebook Pages and picks the first result for the demo.
5. **Instagram account lookup**: Fetches `/{page-id}?fields=instagram_business_account{id,username}` using the Page access token to locate the linked IG Business account.
6. **Webhook subscription**: Posts to `/{page-id}/subscribed_apps` with the `messages` field so the app will receive Messenger/Instagram webhooks.
7. **User feedback**: Redirects to `/?status=ok`, and the client-side script hits `/whoami` to display the connected Page + IG handles.

## Webhook Handling
- **Verification** (`GET /webhook`): Confirms Meta’s subscription handshake. If `hub.verify_token` matches `VERIFY_TOKEN`, the endpoint echoes `hub.challenge` with HTTP 200.
- **Delivery** (`POST /webhook`): Logs the raw JSON payload and replies with HTTP 200. Extend this handler to process Instagram messaging events in real deployments.

## Key Environment Variables
- `APP_ID`, `APP_SECRET`: Meta app credentials.
- `OAUTH_REDIRECT_URI`: HTTPS callback URL registered in the Meta dashboard (e.g., `https://insta.tiblings.com/oauth/callback`).
- `SCOPES`: Comma-separated OAuth permissions (e.g., `pages_show_list,instagram_basic,instagram_manage_messages`).
- `OAUTH_STATE_SECRET`: HMAC key that signs the state token.
- `VERIFY_TOKEN`: Value Meta expects during webhook verification.
- `PORT`: Local listening port (defaults to `3000`).

## Deployment Notes
- **Local testing**: Run `npm install` once, then `node server.js`. The app listens on `http://localhost:3000`; override with `PORT=4000` as needed.
- **Production service**: On the cloud host (Ubuntu 24.04), the project lives at `/root/insta-connect-demo` and is managed by `systemd` via `insta-connect.service`.
  - Restart the live app: `sudo systemctl restart insta-connect.service`.
  - Logs stream to the journal: `sudo journalctl -u insta-connect.service -n 200 -f`.
- **HTTPS & routing**: Nginx proxies `https://insta.tiblings.com` to the Node process and terminates TLS using Let’s Encrypt certificates managed by `certbot.timer`.
- **Security**: `.env` on the server is owned by root with `chmod 600`; edit carefully to avoid leaking secrets. Rotate `OAUTH_STATE_SECRET` and Page tokens if compromised.

## Related URLs
- Public landing page: `https://insta.tiblings.com/`
- OAuth entry point (redirect target of the button): `https://insta.tiblings.com/login`
- OAuth callback (register with Meta): `https://insta.tiblings.com/oauth/callback`
- Webhook endpoint: `https://insta.tiblings.com/webhook`
- Privacy policy: `https://insta.tiblings.com/privacy-policy`

## Extending the Demo
- Replace the in-memory store with a database to persist tokens per user/Page pair.
- Add webhook signature verification (`X-Hub-Signature-256`) and structured logging for production observability.
- Introduce Jest + Supertest tests for `/login`, `/oauth/callback` (mocking Graph API), and webhook verification.
- Harden the client to handle multiple Page selections and display better error states when OAuth fails.

