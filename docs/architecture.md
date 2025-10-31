# BerthCare Architecture & Environment Reference

## Scope & Audience

This document is the source of truth for how the BerthCare staging environment is put together today. It complements the narrative blueprint in `project-documentation/architecture-output.md` by listing the concrete AWS resources, infrastructure decisions, Twilio integration details, and local development workflow engineers should rely on when deploying or troubleshooting the platform.

---

## Environment Overview

| Item              | Value                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| AWS account       | `berthcare` shared services (state stored in `berthcare-terraform-state`)                                                |
| Terraform backend | S3 bucket `berthcare-terraform-state`, DynamoDB table `berthcare-terraform-locks`, state key `staging/terraform.tfstate` |
| Region            | `ca-central-1` (Montreal)                                                                                                |
| Environment tag   | `staging` (`Environment=staging`)                                                                                        |
| Naming prefix     | `berthcare-staging-<component>`                                                                                          |
| IaC entrypoint    | `infra/terraform/environments/staging`                                                                                   |

`terraform output -state=...` exposes authoritative IDs for every resource listed below; the table captures the friendly names and how they map to those outputs.

---

## Networking & Security

### Virtual Private Cloud

| Component                                              | Terraform Output      | Notes                                                         |
| ------------------------------------------------------ | --------------------- | ------------------------------------------------------------- |
| VPC (`berthcare-staging-vpc`)                          | `vpc_id`              | `/16` CIDR `10.10.0.0/16` with DNS hostnames/support enabled. |
| Public subnets (`10.10.1.0/24`, `10.10.2.0/24`)        | `public_subnet_ids`   | Used by the internet-facing load balancer and NAT gateway.    |
| Private app subnets (`10.10.11.0/24`, `10.10.12.0/24`) | `private_subnet_ids`  | Host ECS Fargate tasks and private workloads.                 |
| Database subnets (`10.10.21.0/24`, `10.10.22.0/24`)    | `database_subnet_ids` | Dedicated to the RDS subnet group.                            |

The VPC module provisions an Internet Gateway, single NAT Gateway (shared between AZs), and route tables automatically. Subnet tags (`Tier=public/application/database`) feed cost allocation and security automation. The single-NAT setup keeps staging costs down; note that it also introduces a single point of failure for outbound traffic from private subnets, so production should plan for one NAT per AZ.

### Security Groups

| Name                         | Purpose                                                      | Ingress                                                                              |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `berthcare-staging-app-sg`   | Attach to ECS/Fargate tasks and other app compute resources. | Deny by default; referenced by other security group rules to grant access.           |
| `berthcare-staging-rds-sg`   | Protects PostgreSQL.                                         | TCP/5432 from `app-sg` and any `trusted_office_cidrs` defined in `terraform.tfvars`. |
| `berthcare-staging-redis-sg` | Protects Redis.                                              | TCP/6379 from `app-sg` and `trusted_office_cidrs`.                                   |

All security groups allow outbound access to the internet to support package downloads and AWS API access.

---

## Application & Data Layer

### Compute Expectations

The staging stack assumes API workloads run on **ECS Fargate** behind an **Application Load Balancer**:

- Supply the ALB ARN suffix (`api_load_balancer_arn_suffix`) and target group suffix (`api_target_group_arn_suffix`) in `terraform.tfvars` once the load balancer exists. This powers dashboards and alarms.
- Set `ecs_cluster_name` / `ecs_service_name` to the live service identifiers so CloudWatch dashboards bind to the correct metrics.

> Until those values are provided, Terraform still provisions networking, IAM, storage, and monitoring primitives so the service can be deployed when ready.

### PostgreSQL (Amazon RDS)

| Setting        | Value                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| Identifier     | `berthcare-staging-postgres`                                                 |
| Engine/version | PostgreSQL 15.5 (multi-AZ)                                                   |
| Instance class | `db.t4g.large`                                                               |
| Storage        | 100 GB allocated, autoscaling to 500 GB                                      |
| Backups        | 14-day retention, window `03:30–04:30` UTC                                   |
| Maintenance    | Sunday `04:00–05:00` UTC                                                     |
| Authentication | Username `berthcare_app`, password generated via `random_password.db_master` |
| Logs           | PostgreSQL & upgrade event streams forwarded to CloudWatch                   |

Retrieve the live endpoint via `terraform output rds_endpoint`. Credentials are stored in Secrets Manager at `/berthcare/staging/database`.

### Redis (Amazon ElastiCache)

| Setting              | Value                                                               |
| -------------------- | ------------------------------------------------------------------- |
| Replication group ID | `berthcare-staging-redis`                                           |
| Engine/version       | Redis 7.1                                                           |
| Topology             | 2 cache nodes (`cache.t4g.medium`), multi-AZ failover               |
| Encryption           | In-transit + at-rest enabled                                        |
| Maintenance window   | Sunday `06:00–07:00` UTC                                            |
| Auth                 | 32-character token generated via `random_password.redis_auth_token` |

Primary and reader endpoints are exposed via `terraform output redis_primary_endpoint` / `redis_reader_endpoint`. Auth token and endpoint metadata are stored in Secrets Manager at `/berthcare/staging/redis`.

### Object Storage & CDN

| Resource                                | Notes                                                                                                                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S3 bucket `berthcare-staging-photos`    | Versioned, KMS-encrypted, lifecycle to Standard-IA at 90 days and Glacier at 365 days. Public access fully blocked.                                                                                                                      |
| S3 bucket `berthcare-staging-documents` | Versioned, KMS-encrypted, 7-year retention policy. Public access fully blocked.                                                                                                                                                          |
| CloudFront Origin Access Control        | `berthcare-staging-oac` signs requests to both buckets.                                                                                                                                                                                  |
| CloudFront distribution                 | Comment `BerthCare staging asset distribution`, default origin `photos`, path-based origin for `documents/*`, HTTP/2+3, optional logging prefix `cloudfront/`. DNS name available via `terraform output cloudfront_distribution_domain`. |

Applications interact with the buckets via IAM policies attached to the ECS task role (`berthcare-staging-ecs-task`). CloudFront requires either the default certificate or a custom ACM ARN supplied in `terraform.tfvars`.

---

## Identity, Secrets & Configuration

- **ECS execution role:** `berthcare-staging-ecs-execution` (pulls container images, publishes logs).
- **ECS task role:** `berthcare-staging-ecs-task` (S3 CRUD, Secrets Manager read, Redis discovery, RDS IAM auth, CloudWatch Logs writes).
- **Secrets Manager entries:**
  - `/berthcare/staging/database` – PostgreSQL credentials and endpoint metadata.
  - `/berthcare/staging/redis` – Redis auth token and endpoints.
  - `/berthcare/staging/sentry/backend` & `/berthcare/staging/sentry/mobile` – DSNs + environment labels.
  - `/berthcare/staging/twilio` – Twilio credentials and webhook configuration (populated when Twilio is configured).
- **CloudWatch log group:** `/aws/ecs/berthcare-staging-api` (override by setting `ecs_service_name`).
- **Observability assets:** Dashboard `berthcare-staging-observability`, SNS topic `berthcare-staging-alerts`, alarms `berthcare-staging-api-high-error-rate` and `berthcare-staging-db-high-cpu`.

---

## Twilio Voice & Messaging

Twilio provisioning is tracked in `docs/communication/twilio-setup.md`. Key facts reiterated here for architecture traceability:

- **Account structure:** Master account (`TWILIO_ACCOUNT_SID`) with subaccounts `BerthCare Staging` and `BerthCare Production`.
- **Required credentials (per environment):**
  - `account_sid` – master account SID.
  - `subaccount_sid` – environment-specific SID (e.g. staging).
  - `api_key_sid` / `api_key_secret` – standard API key pair named `berthcare-<env>-backend`.
  - `auth_token` – subaccount auth token (fallback).
  - `voice_phone_number` / `sms_phone_number` – Canadian E.164 numbers supporting voice + SMS.
  - `voice_webhook_url`, `sms_webhook_url`, `status_callback_url` – backing API endpoints, staging defaults to `https://api-staging.berthcare.ca/v1/twilio/...`.
- **Secrets storage:** `terraform apply` writes the structured payload into `/berthcare/staging/twilio` when the values are present in `terraform.tfvars`.
- **Webhook expectations:** Voice calls hit `/v1/twilio/voice-alert`, SMS messages hit `/v1/twilio/sms/webhook`, status callbacks post to `/v1/twilio/call-status` or `/v1/twilio/sms/status`.

Keep `.env` in sync for local testing—the template includes Twilio variables pointing at the local backend (`http://localhost:3000`).

---

## Local Development Environment

Local parity is delivered via Docker Compose (`docker-compose.yml`):

| Service            | Image                          | Ports                           | Data volume       | Notes                                                  |
| ------------------ | ------------------------------ | ------------------------------- | ----------------- | ------------------------------------------------------ |
| `berth_postgres`   | `postgres:15-alpine`           | Host `${POSTGRES_PORT:-5432}`   | `postgres_data`   | Seeds database credentials from `.env`.                |
| `berth_redis`      | `redis:7-alpine`               | Host `${REDIS_PORT:-6379}`      | `redis_data`      | Persists snapshot data to speed up restarts.           |
| `berth_localstack` | `localstack/localstack:latest` | Host `${LOCALSTACK_PORT:-4566}` | `localstack_data` | Provides S3-compatible API used by the backend in dev. |

Workflow recap:

1. `cp .env.example .env` and adjust secrets (`JWT_SECRET`, Twilio credentials when available).
2. Export env vars (`export $(grep -v '^#' .env | xargs)`), then `docker compose up -d`.
3. Create the LocalStack bucket once per machine: `aws --endpoint-url "$S3_ENDPOINT" s3 mb "s3://$AWS_S3_BUCKET"`.
4. Install dependencies (`pnpm install`) and run the backend with `pnpm nx serve backend`.
5. Tear down with `docker compose down` (add `--volumes` to clear state).

Local endpoints mimic staging:

- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/berthcare_dev`
- Redis: `redis://localhost:6379`
- S3: `http://localhost:4566` (set `S3_FORCE_PATH_STYLE=true`)

---

## Architecture Diagram

```mermaid
graph LR
  subgraph "AWS ca-central-1 (staging)"
    VPC["berthcare-staging-vpc"]
    ALB["ALB: app/berthcare-staging-api (ARN suffix)"]
    ECS["ECS Service: berthcare-staging-api"]
    RDS["RDS: berthcare-staging-postgres"]
    Redis["ElastiCache: berthcare-staging-redis"]
    Photos["S3: berthcare-staging-photos"]
    Documents["S3: berthcare-staging-documents"]
    CloudFront["CloudFront distribution (assets)"]
    Secrets["Secrets Manager (/berthcare/staging/*)"]
    Logs["CloudWatch Logs (/aws/ecs/berthcare-staging-api)"]
    Alerts["SNS: berthcare-staging-alerts"]
  end

  Mobile["React Native App (Expo)"]
  CareTeam["Care Team Portal / API clients"]
  Twilio["Twilio Voice & SMS"]

  Mobile -->|HTTPS assets| CloudFront
  CloudFront --> Photos
  CloudFront --> Documents
  CareTeam -->|HTTPS API| ALB
  ALB --> ECS
  ECS --> RDS
  ECS --> Redis
  ECS --> Photos
  ECS --> Documents
  ECS --> Secrets
  ECS --> Logs
  Logs --> Alerts
  Twilio -->|Webhooks| ALB
```

Update the ALB and ECS labels once live ARNs/service names are known so the diagram mirrors production reality.

---

## Operational Checkpoints

- Keep `infra/terraform/environments/staging/terraform.tfvars` populated with live ALB/ECS identifiers, alert subscriber emails, and Twilio credentials.
- Run `terraform output` after each apply and paste any changed resource identifiers back into this document if naming conventions diverge.
- Rotate sensitive secrets (Twilio API keys, Redis auth tokens, Sentry DSNs) quarterly; Terraform will detect drift when values change.
- Confirm the CloudFront distribution domain is referenced by mobile and web clients; update DNS aliases when custom domains come online.
