data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  name_prefix                = "${var.project_name}-${var.environment}"
  vpc_name                   = "${local.name_prefix}-vpc"
  public_subnet_name         = "${local.name_prefix}-public"
  app_subnet_name            = "${local.name_prefix}-app"
  data_subnet_name           = "${local.name_prefix}-data"
  db_identifier              = "${local.name_prefix}-postgres"
  redis_identifier           = "${local.name_prefix}-redis"
  redis_identifier_sanitized = replace(lower(local.redis_identifier), "/[^a-z0-9-]/", "")
  redis_identifier_compact   = replace(local.redis_identifier_sanitized, "/-{2,}/", "-")
  redis_identifier_trimmed   = replace(local.redis_identifier_compact, "/-+$/", "")
  redis_identifier_letters   = replace(local.redis_identifier_trimmed, "/^[^a-z]+/", "")
  redis_identifier_fallback  = local.redis_identifier_letters != "" ? local.redis_identifier_letters : "redis"
  redis_identifier_truncated = substr(local.redis_identifier_fallback, 0, 20)
  redis_identifier_final     = replace(local.redis_identifier_truncated, "/-+$/", "")
  s3_bucket_name_base        = "${local.name_prefix}-${data.aws_region.current.name}-app-data"
  s3_bucket_name             = lower(replace("${local.s3_bucket_name_base}-${data.aws_caller_identity.current.account_id}", "/[^a-z0-9-]/", ""))
  ecs_task_role_name         = "${local.name_prefix}-ecs-task"
  ecs_exec_role_name         = "${local.name_prefix}-ecs-exec"
  azs                        = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_map          = { for idx, az in local.azs : az => var.public_subnet_cidrs[idx] }
  app_subnet_map             = { for idx, az in local.azs : az => var.private_app_subnet_cidrs[idx] }
  data_subnet_map            = { for idx, az in local.azs : az => var.private_data_subnet_cidrs[idx] }
  nat_gateway_az             = element(sort(keys(local.public_subnet_map)), 0)
  redis_replication_group_id = local.redis_identifier_final
}
