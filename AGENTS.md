# Repository Guidelines

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
