output "vpc_id" {
  description = "Identifier of the staging VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet identifiers."
  value       = [for subnet in aws_subnet.public : subnet.id]
}

output "private_app_subnet_ids" {
  description = "Private application subnet identifiers."
  value       = [for subnet in aws_subnet.app : subnet.id]
}

output "private_data_subnet_ids" {
  description = "Private data subnet identifiers."
  value       = [for subnet in aws_subnet.data : subnet.id]
}

output "postgres_endpoint" {
  description = "Reader endpoint for the staging PostgreSQL instance."
  value       = aws_db_instance.postgres.address
}

output "postgres_port" {
  description = "Port used by the PostgreSQL instance."
  value       = aws_db_instance.postgres.port
}

output "redis_primary_endpoint" {
  description = "Primary endpoint for the staging Redis replication group."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Port used by the Redis replication group."
  value       = aws_elasticache_replication_group.redis.port
}

output "app_data_bucket_name" {
  description = "S3 bucket for staging application data."
  value       = aws_s3_bucket.app_data.bucket
}

output "ecs_task_role_arn" {
  description = "IAM role assumed by ECS tasks."
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_task_execution_role_arn" {
  description = "Execution role for ECS tasks."
  value       = aws_iam_role.ecs_task_execution.arn
}

output "db_password_parameter_name" {
  description = "SSM parameter storing the PostgreSQL master password."
  value       = aws_ssm_parameter.db_master_password.name
}

output "redis_auth_parameter_name" {
  description = "SSM parameter storing the Redis auth token."
  value       = aws_ssm_parameter.redis_auth_token.name
}

output "backend_log_group_name" {
  description = "CloudWatch log group used by the backend ECS service."
  value       = aws_cloudwatch_log_group.backend.name
}

output "observability_dashboard_name" {
  description = "CloudWatch dashboard aggregating key staging metrics."
  value       = aws_cloudwatch_dashboard.observability.dashboard_name
}

output "alerts_topic_arn" {
  description = "SNS topic receiving observability alerts."
  value       = aws_sns_topic.alerts.arn
}
