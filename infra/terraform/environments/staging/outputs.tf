output "aws_region" {
  description = "AWS region where the staging environment is deployed."
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC identifier for staging."
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for load balancers and NAT gateways."
  value       = module.vpc.public_subnets
}

output "private_subnet_ids" {
  description = "Private subnet IDs for application workloads."
  value       = module.vpc.private_subnets
}

output "database_subnet_ids" {
  description = "Database subnet IDs dedicated to RDS."
  value       = module.vpc.database_subnets
}

output "app_security_group_id" {
  description = "Security group ID for ECS/Fargate tasks."
  value       = aws_security_group.app.id
}

output "rds_endpoint" {
  description = "Connection endpoint for the PostgreSQL instance."
  value       = module.rds.db_instance_endpoint
}

output "rds_secret_arn" {
  description = "Secrets Manager ARN containing PostgreSQL credentials."
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "redis_primary_endpoint" {
  description = "Primary endpoint address for the Redis replication group."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Reader endpoint address for Redis read replicas."
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_secret_arn" {
  description = "Secrets Manager ARN containing the Redis auth token."
  value       = aws_secretsmanager_secret.redis_auth.arn
}

output "photos_bucket_name" {
  description = "Name of the S3 bucket storing care photos."
  value       = aws_s3_bucket.photos.bucket
}

output "documents_bucket_name" {
  description = "Name of the S3 bucket storing care documents."
  value       = aws_s3_bucket.documents.bucket
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name for asset delivery."
  value       = aws_cloudfront_distribution.assets.domain_name
}

output "ecs_task_role_arn" {
  description = "IAM role ARN assumed by application tasks."
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_execution_role_arn" {
  description = "IAM role ARN used by ECS tasks for pulling images and publishing logs."
  value       = aws_iam_role.ecs_execution.arn
}

output "alerts_topic_arn" {
  description = "SNS topic ARN used for operational alerts."
  value       = aws_sns_topic.alerts.arn
}

output "api_log_group_name" {
  description = "CloudWatch log group collecting API structured logs."
  value       = aws_cloudwatch_log_group.api.name
}

output "observability_dashboard_name" {
  description = "Name of the CloudWatch dashboard aggregating environment telemetry."
  value       = aws_cloudwatch_dashboard.observability.dashboard_name
}

output "sentry_backend_secret_arn" {
  description = "Secrets Manager ARN containing the backend Sentry configuration."
  value       = aws_secretsmanager_secret.sentry_backend.arn
}

output "sentry_mobile_secret_arn" {
  description = "Secrets Manager ARN containing the mobile Sentry configuration."
  value       = aws_secretsmanager_secret.sentry_mobile.arn
}
