variable "project" {
  description = "Human-friendly project identifier used for tagging and resource names."
  type        = string
  default     = "berthcare"
}

variable "environment" {
  description = "Deployment environment identifier."
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ca-central-1"
}

variable "availability_zones" {
  description = "Availability zones to spread the VPC subnets across."
  type        = list(string)
  default     = ["ca-central-1a", "ca-central-1b"]
}

variable "vpc_cidr" {
  description = "CIDR block for the staging VPC."
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets."
  type        = list(string)
  default     = ["10.10.1.0/24", "10.10.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for application private subnets."
  type        = list(string)
  default     = ["10.10.11.0/24", "10.10.12.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks dedicated to database subnets."
  type        = list(string)
  default     = ["10.10.21.0/24", "10.10.22.0/24"]
}

variable "db_name" {
  description = "Initial database name for the PostgreSQL cluster."
  type        = string
  default     = "berthcare"
}

variable "db_username" {
  description = "Master username for the PostgreSQL cluster."
  type        = string
  default     = "berthcare_app"
}

variable "db_instance_class" {
  description = "Instance class for the staging PostgreSQL cluster."
  type        = string
  default     = "db.t4g.large"
}

variable "db_allocated_storage" {
  description = "Initial storage (in GB) allocated for the PostgreSQL cluster."
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum storage (in GB) for auto-scaling storage."
  type        = number
  default     = 500
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days for PostgreSQL."
  type        = number
  default     = 14
}

variable "db_backup_window" {
  description = "Preferred backup window for the PostgreSQL cluster."
  type        = string
  default     = "03:30-04:30"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window for the PostgreSQL cluster."
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "enable_rds_deletion_protection" {
  description = "Whether to enable deletion protection on the PostgreSQL cluster."
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "Instance size for each Redis cache node."
  type        = string
  default     = "cache.t4g.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis replication group."
  type        = number
  default     = 2
}

variable "redis_maintenance_window" {
  description = "Preferred maintenance window for Redis."
  type        = string
  default     = "sun:06:00-sun:07:00"
}

variable "trusted_office_cidrs" {
  description = "CIDR blocks that should have direct access to private resources (e.g., VPN or office IPs)."
  type        = list(string)
  default     = []
}

variable "photos_bucket_force_destroy" {
  description = "Whether objects in the photos bucket should be removed when destroying the environment."
  type        = bool
  default     = false
}

variable "documents_bucket_force_destroy" {
  description = "Whether objects in the documents bucket should be removed when destroying the environment."
  type        = bool
  default     = false
}

variable "cloudfront_price_class" {
  description = "CloudFront price class for the distribution."
  type        = string
  default     = "PriceClass_100"
}

variable "cloudfront_alternate_domains" {
  description = "Optional alternate domain names (CNAMEs) for the CloudFront distribution."
  type        = list(string)
  default     = []
}

variable "cloudfront_acm_certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS if using custom domains."
  type        = string
  default     = ""
}

variable "cloudfront_logging_bucket" {
  description = "Optional S3 bucket (ARN) to receive CloudFront access logs."
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Number of days to retain application logs in CloudWatch."
  type        = number
  default     = 30
}

variable "alert_subscription_emails" {
  description = "Email addresses to subscribe to the monitoring SNS topic."
  type        = list(string)
  default     = []
}

variable "api_load_balancer_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer serving the API (e.g., app/berthcare-staging-api/abcdefgh)."
  type        = string
  default     = ""
}

variable "api_target_group_arn_suffix" {
  description = "ARN suffix of the target group backing the API service (e.g., targetgroup/berthcare-staging-api/abcdefgh)."
  type        = string
  default     = ""
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster running the API service (used for dashboard visualizations)."
  type        = string
  default     = ""
}

variable "ecs_service_name" {
  description = "Name of the ECS service exposing the API (used for dashboard visualizations)."
  type        = string
  default     = ""
}

variable "sentry_backend_dsn" {
  description = "Sentry DSN for the backend service."
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_mobile_dsn" {
  description = "Sentry DSN for the mobile application."
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_environment" {
  description = "Optional Sentry environment label; defaults to the Terraform environment when omitted."
  type        = string
  default     = ""
}

variable "cloudfront_logging_prefix" {
  description = "Prefix to apply to CloudFront access logs."
  type        = string
  default     = "cloudfront/"
}

variable "twilio_account_sid" {
  description = "Twilio master account SID (used for traceability)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_subaccount_sid" {
  description = "Environment-specific Twilio subaccount SID."
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_api_key_sid" {
  description = "Twilio API key SID for programmatic access."
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_api_key_secret" {
  description = "Twilio API key secret for programmatic access."
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio auth token (fallback credential)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_voice_phone_number" {
  description = "Primary Twilio phone number for voice calls (E.164)."
  type        = string
  default     = ""
}

variable "twilio_sms_phone_number" {
  description = "Primary Twilio phone number for SMS (E.164). Can match the voice number."
  type        = string
  default     = ""
}

variable "twilio_voice_webhook_url" {
  description = "Voice webhook endpoint expected by Twilio."
  type        = string
  default     = ""
}

variable "twilio_sms_webhook_url" {
  description = "SMS webhook endpoint expected by Twilio."
  type        = string
  default     = ""
}

variable "twilio_status_callback_url" {
  description = "Twilio voice/SMS status callback endpoint."
  type        = string
  default     = ""
}
