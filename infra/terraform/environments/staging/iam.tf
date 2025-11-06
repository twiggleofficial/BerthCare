data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = local.ecs_exec_role_name
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = {
    Name = local.ecs_exec_role_name
  }
}

resource "aws_iam_role" "ecs_task" {
  name               = local.ecs_task_role_name
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = {
    Name = local.ecs_task_role_name
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    sid    = "AppDataBucketAccess"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.app_data.arn,
    ]
  }

  statement {
    sid    = "AppDataObjectAccess"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectTagging",
      "s3:PutObjectTagging",
    ]

    resources = [
      "${aws_s3_bucket.app_data.arn}/*",
    ]
  }
}

resource "aws_iam_policy" "ecs_task_s3" {
  name        = "${local.name_prefix}-ecs-task-s3"
  description = "Allow ECS tasks to interact with the staging application S3 bucket."
  policy      = data.aws_iam_policy_document.ecs_task_s3.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_s3.arn
}

data "aws_iam_policy_document" "ecs_task_parameters" {
  statement {
    sid    = "ReadEncryptedParameters"
    effect = "Allow"

    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]

    resources = [
      aws_ssm_parameter.db_master_password.arn,
      aws_ssm_parameter.redis_auth_token.arn,
    ]
  }

  statement {
    sid    = "DecryptSSMParameters"
    effect = "Allow"

    actions = [
      "kms:Decrypt",
    ]

    resources = [
      aws_kms_key.ssm.arn,
    ]
  }
}

resource "aws_iam_policy" "ecs_task_parameters" {
  name        = "${local.name_prefix}-ecs-task-parameters"
  description = "Allow ECS tasks to fetch secure parameters required for runtime configuration."
  policy      = data.aws_iam_policy_document.ecs_task_parameters.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_parameters" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_parameters.arn
}
