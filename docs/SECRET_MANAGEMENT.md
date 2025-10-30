# Secret Management Playbook

## Objective
Centralize Instagram app credentials in a managed secrets store so the application never relies on plaintext `.env` files on disk. This enables audit trails, access control, and rotation.

## Recommended Stores
- **AWS SSM Parameter Store or Secrets Manager** (if the app runs on AWS)
- **GCP Secret Manager** (if deployed on GCP)
- **Doppler / 1Password Secrets Automation** for platform-agnostic workflows

## Implementation Steps
1. **Create secrets**
   - Store each value (`APP_ID`, `APP_SECRET`, `OAUTH_STATE_SECRET`, `VERIFY_TOKEN`, `OAUTH_REDIRECT_URI`, `SCOPES`) as individual parameters.
   - Tag secrets with environment (`prod`, `staging`) and service name (`insta-connect-demo`).

2. **Provision access**
   - Grant the application runtime IAM role read-only access to the secrets namespace.
   - Deny listing secrets broadly to reduce accidental exposure.

3. **Bootstrap at deploy time**
   - During container start-up (e.g., entrypoint script), fetch secrets via the provider SDK/CLI and export them as environment variables.
   - Remove any generated files after load; rely purely on environment variables.

4. **Remove `.env` from servers**
   - Delete lingering `.env` files (`rm /path/.env`).
   - Update deployment scripts to fail fast when a `.env` file is detected in production.

5. **Rotation policy**
   - Schedule rotation at least every 90 days or immediately after suspected compromise.
   - Automate rotation by issuing new credentials in Meta Developer portal, updating the secret store, then redeploying.
   - Document the rotation date and owner in `task.md` notes.

6. **Monitoring**
   - Enable secret access logging (CloudTrail / Audit log) and set alerts on unusual access patterns.
   - Run quarterly reviews to ensure only required principals can read the secrets.

## Local Development
- Developers continue using `.env` locally.
- Never commit `.env` or share credentials in plain text; use a password manager to distribute updated values.

## Next Actions
- [ ] Provision managed secret store and migrate production credentials.
- [ ] Update deployment pipeline to load secrets programmatically.
- [ ] Document rotation completion and dates in `task.md`.
