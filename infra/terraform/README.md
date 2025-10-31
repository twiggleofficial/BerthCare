# BerthCare Terraform

This directory codifies the BerthCare cloud infrastructure using Terraform. The initial focus is the staging environment deployed entirely in the `ca-central-1` (Canada Central) region to satisfy data residency requirements.

## Directory Layout

- `environments/staging/` – complete Terraform configuration for the staging environment, including network, data, storage, edge, and IAM resources.
- `environments/staging/terraform.tfvars.example` – sample variable file. Copy to `terraform.tfvars` (or provide equivalent CLI variables) before applying.

## Prerequisites

1. Terraform `1.6.x` or newer.
2. An S3 bucket and DynamoDB table for remote state (`berthcare-terraform-state` and `berthcare-terraform-locks` by default). Adjust `backend.tf` if different names are required.
3. AWS credentials with sufficient permissions to create networking, RDS, ElastiCache, S3, CloudFront, IAM, and Secrets Manager resources in `ca-central-1`.
4. (Optional) An ACM certificate in `us-east-1` if you plan to attach a custom domain to CloudFront.

## Typical Workflow

```bash
cd infra/terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars   # customise values if needed
terraform init
terraform plan
terraform apply
```

- Populate `trusted_office_cidrs` with VPN or office IP ranges that should be able to connect directly to PostgreSQL and Redis (leave empty if all access flows through application workloads).
- Set `cloudfront_acm_certificate_arn` and `cloudfront_alternate_domains` when you have a Route 53 hosted zone and ACM certificate ready for staging.
- Provide `cloudfront_logging_bucket` (in the format `bucket-name.s3.amazonaws.com`) to enable access logging.
- Specify `api_load_balancer_arn_suffix`, `api_target_group_arn_suffix`, `ecs_cluster_name`, and `ecs_service_name` once the staging API service is deployed. These power the CloudWatch dashboards and API error-rate alarm. Example values are documented in `terraform.tfvars.example`.
- Add email addresses to `alert_subscription_emails` (or manage subscriptions directly in AWS) so on-call engineers receive SNS notifications when alarms fire.
- Store the Sentry DSNs in Secrets Manager by setting `sentry_backend_dsn` and `sentry_mobile_dsn` via secure tfvars/CI variables. Terraform only writes the versions when a value is provided; otherwise create the secret value manually in the console.

## Outputs

After `terraform apply`, the configuration prints key connection details:

- VPC and subnet identifiers for application workloads.
- RDS endpoint along with the Secrets Manager ARN containing credentials.
- Redis primary/reader endpoints and the associated secret.
- S3 bucket names for photos and documents.
- CloudFront distribution domain for CDN access.
- IAM role ARNs for ECS task execution and runtime permissions.
- SNS topic ARN for operational alerts.
- CloudWatch log group name for API logs and the name of the observability dashboard.
- Secrets Manager ARNs storing Sentry DSNs for backend and mobile clients.

Use these values when wiring the backend services, deployment pipelines, and environment variables for staging.
