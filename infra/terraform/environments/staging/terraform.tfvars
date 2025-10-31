# Copy to terraform.tfvars and adjust as needed before applying.
project     = "berthcare"
environment = "staging"

# Optional: limit office/VPN CIDRs that can reach PostgreSQL/Redis.
# trusted_office_cidrs = ["203.0.113.0/24"]

# Provide ACM certificate ARN if using a custom domain with CloudFront.
# cloudfront_acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
# cloudfront_alternate_domains   = ["assets-staging.berthcare.ca"]

# Store CloudFront logs in a central bucket (must exist beforehand).
# cloudfront_logging_bucket = "berthcare-logs.s3.amazonaws.com"

# Monitoring & observability configuration.
# log_retention_days = 30

# alert_subscription_emails = ["devops@berthcare.ca"]

# Application Load Balancer resources backing the API.
# api_load_balancer_arn_suffix = "app/berthcare-staging-api/0123456789abcdef"
# api_target_group_arn_suffix  = "targetgroup/berthcare-staging-api/0123456789abcdef"

# ECS identifiers feeding dashboard widgets.
# ecs_cluster_name = "berthcare-staging-cluster"
# ecs_service_name = "berthcare-staging-api"

# Override the Sentry environment label (defaults to staging).
# sentry_environment = "staging"

# Provide DSNs out-of-band (keep secrets out of version control).
# sentry_backend_dsn = "https://examplePublicKey@example.ingest.sentry.io/123456"
# sentry_mobile_dsn  = "https://examplePublicKey@example.ingest.sentry.io/654321"

# Twilio configuration (see docs/communication/twilio-setup.md).
# twilio_account_sid        = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# twilio_subaccount_sid     = "ACyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
# twilio_api_key_sid        = "SKzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
# twilio_api_key_secret     = "super-secret"
# twilio_auth_token         = "auth-token-from-twilio"
# twilio_voice_phone_number = "+14165550123"
# twilio_sms_phone_number   = "+14165550123"
# twilio_voice_webhook_url  = "https://api-staging.berthcare.ca/v1/twilio/voice-alert"
# twilio_sms_webhook_url    = "https://api-staging.berthcare.ca/v1/twilio/sms/webhook"
# twilio_status_callback_url = "https://api-staging.berthcare.ca/v1/twilio/call-status"
