resource "aws_kms_key" "s3" {
  description             = "Customer managed key for ${local.name_prefix} S3 data at rest."
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "${local.name_prefix}-s3-kms"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

data "aws_iam_policy_document" "kms_s3" {
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
    sid = "AllowS3BucketEncryption"

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]

    resources = [aws_kms_key.s3.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [aws_s3_bucket.app_data.arn]
    }
  }
}

resource "aws_kms_key_policy" "s3" {
  key_id = aws_kms_key.s3.key_id
  policy = data.aws_iam_policy_document.kms_s3.json
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${local.name_prefix}/s3"
  target_key_id = aws_kms_key.s3.key_id
}

resource "aws_s3_bucket" "app_data" {
  bucket        = local.s3_bucket_name
  force_destroy = false

  tags = {
    Name = local.s3_bucket_name
  }
}

resource "aws_s3_bucket_public_access_block" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  rule {
    id     = "infrequent-access"
    status = "Enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 3
    }
  }
}
