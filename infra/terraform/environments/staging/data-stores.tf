resource "aws_kms_key" "ssm" {
  description             = "Customer managed key for ${local.name_prefix} SSM secure parameters."
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "${local.name_prefix}-ssm-kms"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

data "aws_iam_policy_document" "kms_ssm" {
  statement {
    sid = "AllowAccountRootFullAccess"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid = "AllowSSMParameterStore"

    principals {
      type        = "Service"
      identifiers = ["ssm.amazonaws.com"]
    }

    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]

    resources = [aws_kms_key.ssm.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "StringLike"
      variable = "aws:SourceArn"
      values = [
        "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*",
      ]
    }
  }
}

resource "aws_kms_key_policy" "ssm" {
  key_id = aws_kms_key.ssm.key_id
  policy = data.aws_iam_policy_document.kms_ssm.json
}

resource "aws_kms_alias" "ssm" {
  name          = "alias/${local.name_prefix}/ssm"
  target_key_id = aws_kms_key.ssm.key_id
}

resource "random_password" "db_master" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = values(aws_subnet.data)[*].id

  tags = {
    Name = "${local.name_prefix}-db-subnets"
  }
}

resource "aws_db_instance" "postgres" {
  identifier                            = local.db_identifier
  engine                                = "postgres"
  engine_version                        = "15.5"
  instance_class                        = "db.t3.micro"
  allocated_storage                     = var.db_allocated_storage
  max_allocated_storage                 = var.db_allocated_storage + 20
  storage_type                          = "gp3"
  multi_az                              = false
  db_subnet_group_name                  = aws_db_subnet_group.this.name
  vpc_security_group_ids                = [aws_security_group.rds.id]
  storage_encrypted                     = true
  username                              = lower("${var.project_name}_${var.environment}")
  password                              = random_password.db_master.result
  port                                  = 5432
  publicly_accessible                   = false
  deletion_protection                   = true
  backup_retention_period               = var.db_backup_retention_days
  backup_window                         = "02:00-03:00"
  maintenance_window                    = "sun:04:00-sun:05:00"
  auto_minor_version_upgrade            = true
  apply_immediately                     = false
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  skip_final_snapshot                   = false
  final_snapshot_identifier             = "${local.db_identifier}-final-snapshot"

  tags = {
    Name = local.db_identifier
  }
}

resource "random_password" "redis_auth" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_elasticache_subnet_group" "this" {
  name        = "${local.name_prefix}-redis-subnets"
  subnet_ids  = values(aws_subnet.data)[*].id
  description = "Private subnets for Redis cache."
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = local.redis_replication_group_id
  description                = "Staging Redis for ${var.project_name}"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.t3.micro"
  num_cache_clusters         = 1
  parameter_group_name       = "default.redis7"
  port                       = 6379
  automatic_failover_enabled = false
  multi_az_enabled           = false
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  maintenance_window         = "sun:05:00-sun:06:00"
  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = {
    Name = local.redis_identifier
  }
}

resource "aws_ssm_parameter" "db_master_password" {
  name        = "/${var.project_name}/${var.environment}/database/master_password"
  description = "PostgreSQL master password for the ${var.environment} environment."
  type        = "SecureString"
  value       = random_password.db_master.result
  overwrite   = true
  key_id      = aws_kms_key.ssm.arn
}

resource "aws_ssm_parameter" "redis_auth_token" {
  name        = "/${var.project_name}/${var.environment}/cache/auth_token"
  description = "Redis auth token for the ${var.environment} environment."
  type        = "SecureString"
  value       = random_password.redis_auth.result
  overwrite   = true
  key_id      = aws_kms_key.ssm.arn
}
