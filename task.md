# Production Readiness Task Board

> Always update this file after each work session. Track progress by checking off completed items and adding notes/dates as needed.

## Stage 1 – Security & Secrets
- [ ] Move environment secrets into a managed secret store (e.g., AWS SSM, Doppler) and remove plaintext `.env` from the server
  - Notes: Playbook drafted in `docs/SECRET_MANAGEMENT.md`; awaiting platform selection and migration.
- [ ] Rotate `APP_SECRET`, `OAUTH_STATE_SECRET`, and `VERIFY_TOKEN`; document rotation procedure
  - Notes: Rotation steps documented in `docs/SECRET_MANAGEMENT.md`; scheduling pending.
- [ ] Enforce HTTPS for `insta.tiblings.com` with automatic certificate renewal and HTTP→HTTPS redirects
  - Notes: Application-level redirect available via `ENFORCE_HTTPS=true`; infrastructure cert automation still required.
- [x] Harden cookies (secure, `httpOnly`, strict state validation) and add CSRF/state nonce protections
  - Notes: `server.js` now issues short-lived state tokens, enforces secure cookies in production (with `sameSite=lax` for OAuth compatibility), and rejects stale/nonexistent state.

## Stage 2 – Persistence & Sessions
- [ ] Introduce persistent storage (Postgres or DynamoDB) for user profiles, pages, tokens, and webhook preferences
- [ ] Implement application authentication (e.g., email login or Auth0) and map Meta assets to user accounts
- [ ] Build token refresh jobs to renew long-lived Meta tokens before expiry and log refresh outcomes

## Stage 3 – Webhook Handling
- [ ] Implement signature validation and queueing for `/webhook` receiver
- [ ] Persist webhook deliveries with retry/backoff logic and dead-letter handling
- [ ] Expose a dashboard/history view for webhook events with filtering and manual replay

## Stage 4 – Frontend & User Experience
- [ ] Migrate static HTML to a framework (React/Next.js) with shared auth state
- [ ] Improve error/empty-state messaging (e.g., guidance when no pages are found)
- [ ] Add guided onboarding and contextual help for connecting assets
- [ ] Localize strings and support multi-language copy (optional stretch)

## Stage 5 – Graph API Reliability
- [ ] Wrap Graph API calls with retry, timeout, and rate-limit handling
- [ ] Surface actionable error messages and prompt for re-consent when scopes are missing
- [ ] Capture structured request/response logs (excluding secrets) for debugging

## Stage 6 – Infrastructure & Deployments
- [ ] Containerize the app with Docker and define health checks/resource limits
- [ ] Set up CI/CD (GitHub Actions) to lint, test, build, and deploy to cloud automatically
- [ ] Deploy to a managed runtime (ECS/Fargate, GKE, or similar) behind a load balancer/CDN
- [ ] Implement blue/green or canary deployments for zero-downtime releases

## Stage 7 – Testing & Quality
- [ ] Add Jest + Supertest coverage for all Express routes and OAuth branches
- [ ] Mock Graph API with nock (or equivalent) for deterministic tests
- [ ] Add Playwright/Cypress end-to-end flows covering login + dashboard scenarios
- [ ] Enforce ESLint + Prettier with pre-commit hooks and CI checks

## Stage 8 – Observability & Operations
- [ ] Integrate structured logging (pino/winston) with request IDs and ship to centralized logging
- [ ] Instrument metrics/tracing (OpenTelemetry → Datadog/Prometheus) and create dashboards
- [ ] Configure alerts for token refresh failures, webhook errors, and elevated latency
- [ ] Document operational runbooks and disaster recovery steps (backups, restores)

## Stage 9 – Compliance & Documentation
- [ ] Publish production-ready privacy policy and terms of service
- [ ] Document data retention/deletion policies and user consent workflows
- [ ] Maintain infrastructure diagrams and onboarding docs for new team members
- [ ] Ensure ongoing Meta App Review compliance and track renewal requirements
