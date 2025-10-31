data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_task_permissions" {
  statement {
    sid    = "AllowS3ObjectAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]

    resources = [
      aws_s3_bucket.photos.arn,
      "${aws_s3_bucket.photos.arn}/*",
      aws_s3_bucket.documents.arn,
      "${aws_s3_bucket.documents.arn}/*"
    ]
  }

  statement {
    sid     = "AllowSecretsRead"
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [
      aws_secretsmanager_secret.db_credentials.arn,
      aws_secretsmanager_secret.redis_auth.arn,
      aws_secretsmanager_secret.sentry_backend.arn,
      aws_secretsmanager_secret.sentry_mobile.arn
    ]
  }

  statement {
    sid       = "AllowRedisDiscovery"
    effect    = "Allow"
    actions   = ["elasticache:DescribeReplicationGroups"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowRDSConnectivity"
    effect = "Allow"
    actions = [
      "rds-db:connect"
    ]
    resources = [
      "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${module.rds.db_instance_resource_id}/${var.db_username}"
    ]
  }

  statement {
    sid    = "AllowApplicationLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.api.arn}:*"
    ]
  }
}

resource "aws_iam_policy" "ecs_task" {
  name        = "${local.name_prefix}-ecs-task"
  description = "Application role permissions for BerthCare staging workloads."
  policy      = data.aws_iam_policy_document.ecs_task_permissions.json
}

resource "aws_iam_role_policy_attachment" "ecs_task" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task.arn
}

data "aws_caller_identity" "current" {}
