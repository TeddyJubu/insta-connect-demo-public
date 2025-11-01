# Data Retention Policy

**Last Updated:** November 1, 2025

## 1. Overview

This Data Retention Policy defines how long insta-connect-demo retains different types of data and the procedures for secure deletion.

## 2. Data Retention Schedule

### 2.1 User Account Data

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Email Address | Active account + 90 days | Secure deletion |
| Password Hash | Active account + 90 days | Secure deletion |
| User Profile | Active account + 90 days | Secure deletion |
| Account Settings | Active account + 90 days | Secure deletion |

### 2.2 Authentication & Session Data

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Session Tokens | 30 days of inactivity | Automatic expiration |
| Login History | 90 days | Automatic deletion |
| Failed Login Attempts | 30 days | Automatic deletion |
| Password Reset Tokens | 24 hours | Automatic expiration |

### 2.3 Access Tokens & Credentials

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Instagram Access Tokens | Valid + 30 days after expiration | Secure deletion |
| Refresh Tokens | Valid + 30 days after expiration | Secure deletion |
| API Keys | Active + 90 days after revocation | Secure deletion |
| OAuth State Tokens | 10 minutes | Automatic expiration |

### 2.4 Webhook Data

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Webhook Events (Processed) | 90 days | Automatic deletion |
| Webhook Events (Failed) | 30 days | Automatic deletion |
| Webhook Events (Pending) | 7 days | Automatic deletion |
| Webhook Signatures | 90 days | Automatic deletion |

### 2.5 Logs & Audit Data

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Application Logs | 14 days | Automatic deletion |
| Error Logs | 30 days | Automatic deletion |
| Access Logs | 14 days | Automatic deletion |
| Audit Logs | 90 days | Automatic deletion |

### 2.6 Metrics & Analytics

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Request Metrics | 90 days | Automatic deletion |
| API Metrics | 90 days | Automatic deletion |
| Performance Metrics | 90 days | Automatic deletion |
| User Analytics | 1 year | Automatic deletion |

### 2.7 Backup Data

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Database Backups | 30 days | Automatic deletion |
| Log Backups | 14 days | Automatic deletion |
| Archive Backups | 1 year | Automatic deletion |

## 3. User Deletion Rights

### 3.1 Account Deletion

Users can request account deletion through:
- Account settings page
- Email to: privacy@insta-connect-demo.com
- Support form on website

### 3.2 Deletion Process

1. User submits deletion request
2. Account is marked for deletion
3. All personal data is deleted within 30 days
4. Confirmation email is sent to user
5. Deletion is logged for compliance

### 3.3 Data Retained After Deletion

The following data may be retained after account deletion:

- Aggregated, anonymized analytics
- Legal compliance records
- Fraud prevention data
- Backup copies (deleted after 30 days)

## 4. Data Export

### 4.1 User Data Export

Users can request a copy of their data:

- Email: privacy@insta-connect-demo.com
- Include: Account email, verification code
- Format: JSON or CSV
- Timeline: Within 30 days

### 4.2 Export Contents

- Account information
- Connected Instagram accounts
- Webhook events
- Login history
- Settings and preferences

## 5. Automated Deletion Procedures

### 5.1 Scheduled Deletion Jobs

```bash
# Daily at 2 AM UTC
- Delete expired session tokens
- Delete failed webhook events older than 30 days
- Delete application logs older than 14 days

# Weekly on Sunday at 3 AM UTC
- Delete inactive user accounts (90+ days)
- Delete expired access tokens (30+ days)
- Delete error logs older than 30 days

# Monthly on 1st at 4 AM UTC
- Delete audit logs older than 90 days
- Delete metrics data older than 90 days
- Delete old database backups (30+ days)
```

### 5.2 Deletion Verification

All deletions are:
- Logged with timestamp and reason
- Verified with database queries
- Monitored for compliance
- Reported in monthly audits

## 6. Data Retention Exceptions

### 6.1 Legal Holds

Data may be retained longer if:
- Required by law or regulation
- Subject to legal proceedings
- Needed for fraud investigation
- Required by government request

### 6.2 Backup Retention

Backups are retained for:
- Disaster recovery (30 days)
- Compliance audits (1 year)
- Legal holds (as required)

## 7. User Consent & Preferences

### 7.1 Consent Management

Users can manage data retention preferences:
- Opt-in/out of analytics
- Choose data retention periods
- Request early deletion
- Manage communication preferences

### 7.2 Consent Records

Consent is:
- Recorded with timestamp
- Stored securely
- Retained for compliance
- Auditable for verification

## 8. Compliance

This policy complies with:

- **GDPR:** Right to erasure, data minimization
- **CCPA:** Consumer deletion rights
- **Meta Policies:** Instagram data handling requirements
- **Industry Standards:** SOC 2, ISO 27001

## 9. Data Security During Retention

All retained data is:

- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.2+)
- Access controlled (RBAC)
- Regularly audited
- Backed up securely

## 10. Monitoring & Auditing

### 10.1 Retention Audits

- Monthly: Verify deletion jobs ran successfully
- Quarterly: Audit data retention compliance
- Annually: Full compliance review

### 10.2 Audit Reports

Reports include:
- Data deleted
- Deletion dates
- Compliance status
- Any exceptions or holds

## 11. Contact & Questions

For questions about data retention:

**Email:** privacy@insta-connect-demo.com
**Data Protection Officer:** dpo@insta-connect-demo.com

## 12. Policy Updates

This policy is reviewed:
- Quarterly for compliance
- Annually for completeness
- When regulations change
- When business practices change

---

**Version:** 1.0
**Effective Date:** November 1, 2025
**Last Reviewed:** November 1, 2025

