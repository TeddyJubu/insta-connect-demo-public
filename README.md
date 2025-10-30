````markdown name=README.md url=https://github.com/TeddyJubu/insta-connect-demo-public/blob/main/README.md
# Insta Connect Demo (public)

A small demo application showing how to connect a Facebook Page and its Instagram Business Account using the Facebook/Instagram Graph API and webhook subscription flow. This repository contains a minimal Express server (server.js) and a static front-end in `public/` to demonstrate OAuth login, token exchange, subscribing to page/instagram webhook fields, and receiving webhook events.

This README explains what the project contains and how to run the demo locally.

---

## Features

- OAuth login flow for Facebook apps to obtain a Page-level access token.
- Exchange of short-lived token to a long-lived token.
- Detect and store the connected Page and associated Instagram Business Account (if present).
- Subscribe/unsubscribe to webhook fields for the connected Page.
- Minimal webhook endpoint to receive and log events.
- Simple in-memory demo store (not suitable for production).

---

## Repository layout

- `server.js` - Main Express server that implements OAuth, token exchange, webhook subscription, and endpoints used by the demo UI.
- `public/` - Static front-end assets (index.html, privacy-policy.html, etc.).
- `package.json` / `package-lock.json` - Node project metadata and dependencies.
- `instruction.md`, `TECHNICAL_OVERVIEW.md`, `AGENTS.md`, `task.md` - project docs and notes.

---

## Prerequisites

- Node.js (v16+ recommended)
- A Facebook App configured to use the Instagram Graph API and Webhooks
- A Facebook Page that you manage and that is connected to an Instagram Business Account (optional for some demo flows)
- ngrok (or similar) for local webhook testing if you want a publicly reachable webhook URL

---

## Environment variables

Create a `.env` file in the project root with these variables (example values shown as placeholders):

```
PORT=3000
APP_ID=your_facebook_app_id
APP_SECRET=your_facebook_app_secret
OAUTH_REDIRECT_URI=https://your.domain/oauth/callback
SCOPES=pages_show_list,instagram_basic,instagram_manage_messages  # example scopes
OAUTH_STATE_SECRET=some_random_secret_for_state
VERIFY_TOKEN=some_webhook_verify_token
COOKIE_DOMAIN=yourdomain.com        # optional
NODE_ENV=development
ENFORCE_HTTPS=false
OAUTH_STATE_TTL_MS=600000           # optional (state TTL in ms)
```

Descriptions:
- APP_ID / APP_SECRET: your Facebook App credentials.
- OAUTH_REDIRECT_URI: redirect URL configured in the Facebook App settings (must match).
- SCOPES: comma-separated scopes to request during OAuth (customize for the permissions you need).
- OAUTH_STATE_SECRET: used to HMAC a random seed and protect the OAuth state cookie.
- VERIFY_TOKEN: token used to verify webhook subscription requests from Facebook.
- COOKIE_DOMAIN: optional, domain to use when setting OAuth cookies.
- ENFORCE_HTTPS: set to `true` in production if you want to redirect HTTP -> HTTPS.
- OAUTH_STATE_TTL_MS: optional override for how long signed states live (default ~10 minutes).

Note: Do not commit `.env` or any secrets to version control.

---

## Install & Run

1. Install dependencies:

   npm install

2. Start the server:

   node server.js

   or, if a start script exists in `package.json`:

   npm start

3. Open the demo front-end:

   Visit http://localhost:3000/ (or the port you set in `.env`)

If you want to expose your local server to the internet for webhook verification, use ngrok:

   ngrok http 3000

Then use the ngrok URL as your `OAUTH_REDIRECT_URI` and webhook callback URL in your Facebook App settings.

---

## Important endpoints

- GET /               - serves `public/index.html`
- GET /login          - begins the OAuth flow (creates a state cookie and redirects to Facebook)
- GET /oauth/callback - OAuth callback that exchanges code -> tokens and subscribes app to Page
- GET /whoami         - returns current in-memory connection state
- GET /api/status     - same as /whoami, useful for the demo UI
- GET /api/webhooks   - list currently-subscribed webhook fields (in-memory)
- POST /api/webhooks  - subscribe to a webhook field (body: { field: "messages" })
- DELETE /api/webhooks/:field - unsubscribe a webhook field
- GET /webhook        - webhook verification (Facebook will call with hub.mode=subscribe)
- POST /webhook       - receive webhook events (logs payload to console)
- GET /privacy-policy - serves `public/privacy-policy.html`

---

## Behavior notes & limitations

- The demo stores tokens, selected page, instagram account info, and webhook subscriptions in-memory. This is suitable only for demonstration. Use a persistent store (database or secure secret store) in production.
- The server upgrades the short-lived OAuth access token to a long-lived token using the Graph API.
- The app attempts to subscribe to the `messages` field for the connected page during the demo OAuth exchange — adjust behavior as needed.
- The code logs webhook request payloads to the console. In production, you should validate, persist, and securely process webhook events.

---

## Security & production considerations

- Never commit APP_SECRET, access tokens, or VERIFY_TOKEN to source control.
- Use secure, persistent storage for tokens in production (encrypted at rest).
- Ensure HTTPS is enforced in production (set `ENFORCE_HTTPS=true`).
- Rotate secrets regularly and follow Facebook's platform policies.
- Validate and verify webhook payloads where applicable (signature verification).

---

## Troubleshooting

- "Missing required OAuth environment variables" warning — ensure APP_ID, APP_SECRET, OAUTH_REDIRECT_URI, SCOPES, OAUTH_STATE_SECRET, and VERIFY_TOKEN are set in `.env`.
- OAuth callback reports "Invalid state or missing code" — make sure cookies are enabled and the `OAUTH_REDIRECT_URI` configured in the app matches the redirect used during OAuth. Also ensure the oauth_state cookie is preserved and state TTL has not expired.
- No managed pages found — the user account used for OAuth must manage at least one page. Confirm permissions and scopes.

---

## Contributing

This repo is a simple demo. If you'd like to contribute, please open an issue describing proposed changes or submit a PR with updates. Add tests and documentation where possible.

---

## License

No license file is included in this repo. If you want this project to be open source, add a LICENSE (for example, MIT) to the repository.

---

If you'd like, I prepared this README based on the demo server and documentation files in the repository (server.js, instruction.md, TECHNICAL_OVERVIEW.md). You can copy this in as `README.md` at the root of the project.
````
