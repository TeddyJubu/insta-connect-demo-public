# Repository Guidelines

## Task Workflow
- Review the Production Readiness Task Board below at the start of every session to understand the next prioritized items.
- Update the checklist as work progresses, checking off completed tasks and adding notes when scope changes.
- Do not mark a task complete until code, tests, and deployment steps (if any) are finished.

## Production Readiness Task Board

> Always update this checklist after each work session. Track progress by checking off completed items and adding notes/dates as needed.

### Stage 1 – Security & Secrets
- [x] Move environment secrets into a managed secret store (e.g., AWS SSM, Doppler) and remove plaintext `.env` from the server
  - Notes: Doppler project `insta-connect-demo` (`dev_insta` config) now holds all secrets; service token lives in `/etc/insta-connect-demo/doppler.env`; local `.env` removed.
- [ ] Rotate `APP_SECRET`, `OAUTH_STATE_SECRET`, and `VERIFY_TOKEN`; document rotation procedure
  - Notes: Rotation steps documented in `docs/SECRET_MANAGEMENT.md`; scheduling pending (can defer until closer to production launch).
- [ ] Enforce HTTPS for `insta.tiblings.com` with automatic certificate renewal and HTTP→HTTPS redirects
  - Notes: Application-level redirect available via `ENFORCE_HTTPS=true`; provision TLS (Hostinger panel or certbot/nginx) before enabling.
- [x] Harden cookies (`secure`, `httpOnly`, `sameSite=strict`) and add CSRF/state nonce validation
  - Notes: `server.js` now issues short-lived state tokens, enforces secure cookies in production (with `sameSite=lax` for OAuth compatibility), and rejects stale/nonexistent state.

### Stage 2 – Persistence & Sessions
- [ ] Introduce persistent storage (Postgres or DynamoDB) for user profiles, pages, tokens, and webhook preferences
- [ ] Implement application authentication (e.g., email login or Auth0) and map Meta assets to user accounts
- [ ] Build token refresh jobs to renew long-lived Meta tokens before expiry and log refresh outcomes

### Stage 3 – Webhook Handling
- [ ] Implement signature validation and queueing for `/webhook` receiver
- [ ] Persist webhook deliveries with retry/backoff logic and dead-letter handling
- [ ] Expose a dashboard/history view for webhook events with filtering and manual replay

### Stage 4 – Frontend & User Experience
- [ ] Migrate static HTML to a framework (React/Next.js) with shared auth state
- [ ] Improve error/empty-state messaging (e.g., guidance when no pages are found)
- [ ] Add guided onboarding and contextual help for connecting assets
- [ ] Localize strings and support multi-language copy (optional stretch)

### Stage 5 – Graph API Reliability
- [ ] Wrap Graph API calls with retry, timeout, and rate-limit handling
- [ ] Surface actionable error messages and prompt for re-consent when scopes are missing
- [ ] Capture structured request/response logs (excluding secrets) for debugging

### Stage 6 – Infrastructure & Deployments
- [ ] Containerize the app with Docker and define health checks/resource limits
- [ ] Set up CI/CD (GitHub Actions) to lint, test, build, and deploy to cloud automatically
- [ ] Deploy to a managed runtime (ECS/Fargate, GKE, or similar) behind a load balancer/CDN
- [ ] Implement blue/green or canary deployments for zero-downtime releases

### Stage 7 – Testing & Quality
- [ ] Add Jest + Supertest coverage for all Express routes and OAuth branches
- [ ] Mock Graph API with nock (or equivalent) for deterministic tests
- [ ] Add Playwright/Cypress end-to-end flows covering login + dashboard scenarios
- [ ] Enforce ESLint + Prettier with pre-commit hooks and CI checks

### Stage 8 – Observability & Operations
- [ ] Integrate structured logging (pino/winston) with request IDs and ship to centralized logging
- [ ] Instrument metrics/tracing (OpenTelemetry → Datadog/Prometheus) and create dashboards
- [ ] Configure alerts for token refresh failures, webhook errors, and elevated latency
- [ ] Document operational runbooks and disaster recovery steps (backups, restores)

### Stage 9 – Compliance & Documentation
- [ ] Publish production-ready privacy policy and terms of service
- [ ] Document data retention/deletion policies and user consent workflows
- [ ] Maintain infrastructure diagrams and onboarding docs for new team members
- [ ] Ensure ongoing Meta App Review compliance and track renewal requirements

## Project Structure & Module Organization
- `server.js` is the Express entry point; it loads `.env`, wires middleware, and serves assets from `public/`.
- `public/` holds static client files (currently `index.html`) that drive the Instagram connect button flow.
- Add integration code in dedicated modules under a new `src/` or `services/` directory to keep `server.js` focused on routing.
- Keep sensitive values such as `APP_ID`, `APP_SECRET`, and `OAUTH_REDIRECT_URI` in `.env`; never commit that file.

## Build, Test, and Development Commands
- `npm install` – install dependencies, including Express, `dotenv`, and `cookie-parser` for local parsing.
- `node server.js` – start the HTTP server; override the port with `PORT=4000 node server.js` when needed.
- Update the `test` script before shipping features; the current placeholder exits with status 1 so CI will fail until you wire real tests.

## Coding Style & Naming Conventions
- JavaScript files use 2-space indentation and CommonJS `require`/`module.exports` to match the existing style.
- Function and variable names follow `camelCase`; constants and environment variables stay `UPPER_SNAKE_CASE`.
- Share reusable helpers in small modules and document non-obvious logic with brief comments above the block.
- Run `npx prettier@latest --check "**/*.js"` before pushing; add a `.prettierrc` if the defaults ever diverge from team preferences.

## Testing Guidelines
- Use Jest with Supertest for HTTP routes. Place specs in `tests/` with the pattern `*.spec.js` (e.g., `tests/login.spec.js`).
- Stub external Meta API calls so `npm test` runs offline and deterministically.
- Target coverage on critical OAuth branches and token handling; add regression tests when you fix a bug or ship a new flow.

## Commit & Pull Request Guidelines
- Write imperative, focused commits (e.g., `feat: add OAuth callback handler`) and keep subjects ≤72 characters.
- Squash noisy WIP commits before opening a PR; include a checklist covering local test results and manual login verification.
- Reference related issues or docs, attach screenshots of the Connect flow when UI changes, and call out any caveats for deployers.

## Environment & Security Notes
- Store secrets in `.env` locally and in your deployment platform’s secrets manager; rotate `OAUTH_STATE_SECRET` if it leaks.
- Audit dependencies after upgrades with `npm audit` and patch high-severity findings before release.
