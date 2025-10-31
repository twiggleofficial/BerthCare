# Twilio Account Setup Runbook

This runbook explains how to provision and validate the Twilio resources that Phase E7 (“Configure Twilio accounts”) calls for. It aligns with the Communication Services guidance in `project-documentation/architecture-output.md` by preparing Canadian voice + SMS capabilities that back the voice-first alert flows.

> **Goal:** One Twilio master account with staging and production subaccounts, Canadian numbers capable of both voice and SMS, placeholder webhooks, and secrets stored in AWS Secrets Manager so application code can consume them safely.

---

## 1. Prerequisites

- Corporate email address (`ops@berthcare.ca` recommended) with access to MFA device.
- Company billing instrument (credit card) ready—Twilio requires payment to buy Canadian numbers.
- AWS access with permissions to write to Secrets Manager for each environment.
- Links to the staging and production API gateways (if not available yet, keep the placeholder URLs from the architecture plan).

---

## 2. Create the Master Account

1. Go to <https://www.twilio.com/try-twilio> and create the BerthCare master account using the corporate email.
2. Verify email address and enable multi-factor authentication (Security → Two-Factor Auth).
3. Add at least one backup administrator (Account → Settings → Manage users) with the `Administrator` role.
4. Under Account → Settings → General, set the account friendly name to `BerthCare Master`.

---

## 3. Create Environment Subaccounts

Twilio recommends isolating credentials per environment. Create a subaccount for staging and one for production.

1. Navigate to Account → Subaccounts.
2. Click “Create subaccount” twice:
   - `BerthCare Staging`
   - `BerthCare Production`
3. Record the Account SID for each subaccount—these are the values for:
   - `twilio_staging_subaccount_sid`
   - `twilio_production_subaccount_sid`
4. Ensure the master account has sufficient balance so subaccounts can purchase phone numbers.

---

## 4. Purchase Canadian Phone Numbers

Each environment needs a phone number that supports both **Voice** and **SMS**.

1. Switch to the desired subaccount (top-right “Switch Account” control).
2. Visit Phone Numbers → Buy a Number.
3. Filter by **Country = Canada**, **Capabilities = Voice & SMS**, **Type = Local**.
4. Pick a number with an area code close to the pilot region.
5. Purchase one number per subaccount and note the values (E.164 format, e.g. `+14165550123`).
6. Assign friendly names:
   - `BerthCare Staging Primary`
   - `BerthCare Production Primary`

If you want dedicated numbers for voice and SMS, repeat the purchase process and store both values.

---

## 5. Configure Webhooks (Placeholders Until API Is Live)

Even before backend endpoints exist, configure Twilio to point at the expected URLs so switching is a one-click update later.

### Voice

1. In Phone Numbers → Manage → Active numbers, open the number you just purchased.
2. Under **Voice & Fax → A CALL COMES IN**, choose **Webhook** and paste the placeholder:
   - Staging: `https://api-staging.berthcare.ca/v1/twilio/voice-alert`
   - Production: `https://api.berthcare.ca/v1/twilio/voice-alert`
3. Under **Status Callback URL**, set:
   - Staging: `https://api-staging.berthcare.ca/v1/twilio/call-status`
   - Production: `https://api.berthcare.ca/v1/twilio/call-status`
4. Save.

### SMS / Messaging

1. In the same number record, under **Messaging → A MESSAGE COMES IN**, choose **Webhook** and use:
   - Staging: `https://api-staging.berthcare.ca/v1/twilio/sms/webhook`
   - Production: `https://api.berthcare.ca/v1/twilio/sms/webhook`
2. Set a status callback (optional but recommended):
   - Staging: `https://api-staging.berthcare.ca/v1/twilio/sms/status`
   - Production: `https://api.berthcare.ca/v1/twilio/sms/status`
3. Leave the HTTP methods as POST unless the backend requires GET.

When real endpoints are deployed, no additional console work is needed.

---

## 6. Generate Environment API Keys

For each subaccount:

1. Switch into the subaccount.
2. Navigate to Account → API keys & tokens → Create API Key.
3. Use the `Standard` key type and name it `berthcare-staging-backend` or `berthcare-production-backend`.
4. Copy the **API Key SID** and **Secret** immediately; the secret is shown once.
5. Record the subaccount’s **Auth Token** as a fallback credential (Twilio still issues it).
6. Recommended mapping:

| Terraform variable      | Twilio console value             |
| ----------------------- | -------------------------------- |
| `twilio_account_sid`    | Master Account SID (`AC...`)     |
| `twilio_subaccount_sid` | Environment-specific Account SID |
| `twilio_api_key_sid`    | API Key SID (`SK...`)            |
| `twilio_api_key_secret` | API Key Secret                   |
| `twilio_auth_token`     | Subaccount Auth Token            |

---

## 7. Store Credentials in AWS Secrets Manager

1. Ensure Terraform variables (`twilio_account_sid`, etc.) are set via `terraform.tfvars` or environment-specific CI variables.
2. Run `terraform apply` from `infra/terraform/environments/<env>` to create/update the secret `/<project>/<environment>/twilio`.
3. Alternatively, set values manually:

```bash
aws secretsmanager put-secret-value \
  --secret-id "/berthcare/staging/twilio" \
  --secret-string '{
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxx",
    "subaccount_sid": "ACyyyyyyyyyyyyyyyyyyyyy",
    "api_key_sid": "SKzzzzzzzzzzzzzzzzzzzzz",
    "api_key_secret": "super-secret",
    "auth_token": "staging-auth-token",
    "voice_phone_number": "+14165550123",
    "sms_phone_number": "+14165550123",
    "voice_webhook_url": "https://api-staging.berthcare.ca/v1/twilio/voice-alert",
    "sms_webhook_url": "https://api-staging.berthcare.ca/v1/twilio/sms/webhook",
    "status_callback_url": "https://api-staging.berthcare.ca/v1/twilio/call-status"
  }'
```

Update values per environment. Keep the command history secure (or run it via AWS console).

---

## 8. Verification Checklist

Perform these smoke tests after provisioning each environment.

- **Voice test:** Use the Twilio console (Programmable Voice → Calls → Make a Call) to call a team member’s phone and confirm audio works.
- **SMS test:** Send a text using Programmable Messaging → Try it out → Send an SMS and confirm delivery.
- **Webhook status:** Use Twilio’s debugger (Monitor → Logs → Errors) to ensure webhooks return HTTP 200 (stubs can respond with 204/200).
- **Secrets validation:** From an EC2 bastion or local AWS-authenticated session, fetch the secret:

  ```bash
  aws secretsmanager get-secret-value --secret-id "/berthcare/staging/twilio"
  ```

  Confirm JSON contains the values captured above.

- **Documentation:** Update `project-documentation/task-plan.md` (E7) with the completion date and attach any runbook notes or ticket links.

---

## 9. Next Steps

- Share the API key SID/secret with the CI team (via the `/berthcare/<env>/twilio` secret) so backend services can authenticate to Twilio.
- Schedule quarterly reviews to rotate API keys and confirm phone numbers remain active.
- When backend endpoints go live, smoke test real voice alerts and SMS flows end-to-end.

This runbook can be checked into the repo and referenced in onboarding materials so future engineers can reprovision Twilio without guesswork.
