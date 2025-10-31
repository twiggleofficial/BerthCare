resource "random_password" "db_master" {
  length           = 32
  special          = true
  override_special = "!#$%^*-_=+?"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "/${var.project}/${var.environment}/database"
  description = "RDS PostgreSQL master credentials for ${var.environment}."

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_master.result
    engine   = "postgres"
    host     = module.rds.db_instance_address
    port     = 5432
    dbname   = var.db_name
    endpoint = module.rds.db_instance_endpoint
  })
}

resource "random_password" "redis_auth_token" {
  length           = 32
  special          = true
  override_special = "!@$%^*-_=+"
}

resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "/${var.project}/${var.environment}/redis"
  description = "ElastiCache Redis auth token for ${var.environment}."

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    host       = aws_elasticache_replication_group.redis.primary_endpoint_address
    reader     = aws_elasticache_replication_group.redis.reader_endpoint_address
    port       = 6379
  })
}

resource "aws_secretsmanager_secret" "sentry_backend" {
  name        = "/${var.project}/${var.environment}/sentry/backend"
  description = "Sentry DSN and configuration for the backend API."

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "sentry_backend" {
  count     = length(trimspace(var.sentry_backend_dsn)) > 0 ? 1 : 0
  secret_id = aws_secretsmanager_secret.sentry_backend.id
  secret_string = jsonencode({
    dsn         = var.sentry_backend_dsn
    environment = local.monitoring_sentry_environment
  })
}

resource "aws_secretsmanager_secret" "sentry_mobile" {
  name        = "/${var.project}/${var.environment}/sentry/mobile"
  description = "Sentry DSN and configuration for the mobile application."

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "sentry_mobile" {
  count     = length(trimspace(var.sentry_mobile_dsn)) > 0 ? 1 : 0
  secret_id = aws_secretsmanager_secret.sentry_mobile.id
  secret_string = jsonencode({
    dsn         = var.sentry_mobile_dsn
    environment = local.monitoring_sentry_environment
  })
}

locals {
  twilio_secret_data = {
    account_sid         = trimspace(var.twilio_account_sid)
    subaccount_sid      = trimspace(var.twilio_subaccount_sid)
    api_key_sid         = trimspace(var.twilio_api_key_sid)
    api_key_secret      = trimspace(var.twilio_api_key_secret)
    auth_token          = trimspace(var.twilio_auth_token)
    voice_phone_number  = trimspace(var.twilio_voice_phone_number)
    sms_phone_number    = trimspace(var.twilio_sms_phone_number)
    voice_webhook_url   = trimspace(var.twilio_voice_webhook_url)
    sms_webhook_url     = trimspace(var.twilio_sms_webhook_url)
    status_callback_url = trimspace(var.twilio_status_callback_url)
  }

  twilio_secret_is_configured = (
    length(local.twilio_secret_data.subaccount_sid) > 0 &&
    length(local.twilio_secret_data.api_key_sid) > 0 &&
    length(local.twilio_secret_data.api_key_secret) > 0
  )
}

resource "aws_secretsmanager_secret" "twilio" {
  name        = "/${var.project}/${var.environment}/twilio"
  description = "Twilio credentials and configuration for ${var.environment}."

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "twilio" {
  count     = local.twilio_secret_is_configured ? 1 : 0
  secret_id = aws_secretsmanager_secret.twilio.id
  secret_string = jsonencode(local.twilio_secret_data)
}
