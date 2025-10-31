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

## Secret Rotation Procedure

### When to Rotate
- **Scheduled**: Every 90 days minimum
- **Immediate**: After suspected compromise or exposure
- **Best Practice**: After team member departure with access

### Step-by-Step Rotation Process

#### 1. Generate New Secrets
Use cryptographically secure random generation:

```bash
# Generate new secrets using Node.js crypto
node -e "const crypto = require('crypto'); \
  console.log('APP_SECRET=' + crypto.randomBytes(32).toString('hex')); \
  console.log('OAUTH_STATE_SECRET=' + crypto.randomBytes(32).toString('hex')); \
  console.log('VERIFY_TOKEN=' + crypto.randomBytes(32).toString('hex'));"
```

**Note**: `APP_SECRET` comes from Meta Developer Console and should match the value there. Only rotate if you regenerate it in Meta's dashboard.

#### 2. Update Secrets in Doppler
```bash
# Update each secret in Doppler
doppler secrets set APP_SECRET='<new-value>' --project insta-connect-demo --config dev_insta
doppler secrets set OAUTH_STATE_SECRET='<new-value>' --project insta-connect-demo --config dev_insta
doppler secrets set VERIFY_TOKEN='<new-value>' --project insta-connect-demo --config dev_insta
```

#### 3. Update Meta Developer Console (if applicable)
- **VERIFY_TOKEN**: Update in Meta Developer Console → Webhooks → Edit Callback URL
- **APP_SECRET**: Only if you regenerated it in Meta's App Dashboard → Settings → Basic

#### 4. Restart Production Service
```bash
# SSH into production server
ssh root@147.93.112.223

# Restart the service to pick up new secrets
sudo systemctl restart insta-connect-demo

# Verify service is running
sudo systemctl status insta-connect-demo

# Check logs for any errors
sudo journalctl -u insta-connect-demo -n 50 --no-pager
```

#### 5. Verify Application Functionality
- Test OAuth flow: Visit https://insta.tiblings.com and click "Connect Instagram"
- Test webhook verification: Meta will re-verify the webhook endpoint
- Check application logs for any authentication errors

#### 6. Document Rotation
Update rotation log below with date, rotated secrets, and operator.

### Rotation History

| Date       | Secrets Rotated                                    | Operator | Notes                          |
|------------|---------------------------------------------------|----------|--------------------------------|
| 2025-10-31 | APP_SECRET, OAUTH_STATE_SECRET, VERIFY_TOKEN      | System   | Initial rotation after Doppler migration |

### Important Notes
- **APP_SECRET**: Must match Meta Developer Console. Rotating requires regenerating in Meta's dashboard first.
- **OAUTH_STATE_SECRET**: Internal only, can be rotated freely. Used for CSRF protection.
- **VERIFY_TOKEN**: Must be updated in Meta Developer Console after rotation for webhook verification.
- **Zero Downtime**: Service restart takes ~5 seconds. Active OAuth flows may fail during restart.

## Next Actions
- [x] Provision managed secret store and migrate production credentials.
- [x] Update deployment pipeline to load secrets programmatically.
- [x] Document rotation completion and dates in `task.md`.
