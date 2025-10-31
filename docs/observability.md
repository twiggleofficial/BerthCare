# Monitoring & Observability

This guide explains the monitoring components provisioned by Terraform and how product teams should hook backend and mobile applications into them.

## CloudWatch Assets

- **Dashboard:** `berthcare-staging-observability` (environment-prefixed). The dashboard plots API latency/error rate/throughput (via the Application Load Balancer), ECS service utilisation, PostgreSQL health, and Redis health.
- **Log aggregation:** API workloads write structured JSON logs to `/aws/ecs/berthcare-staging-api` (name derived from `ecs_service_name`). A metric filter transforms `level:error` entries into the `Berthcare/API` namespace for alerting and Insights queries.
- **Alerts:** `berthcare-staging-alerts` SNS topic fan-outs high-severity notifications. Terraform wires two alarms by default:
  - `berthcare-staging-api-high-error-rate` — ALB target 4XX/5XX responses exceeding 5% for 3 minutes.
  - `berthcare-staging-db-high-cpu` — PostgreSQL CPU utilisation above 80% for 15 minutes.

### Set Up

1. After the API service and load balancer exist, populate `api_load_balancer_arn_suffix`, `api_target_group_arn_suffix`, `ecs_cluster_name`, and `ecs_service_name` in `infra/terraform/environments/staging/terraform.tfvars`.
2. Add email subscribers to `alert_subscription_emails` or subscribe via the AWS console. Recipients must confirm the SNS email before receiving alerts.
3. Apply Terraform to push the updates. Re-run when infrastructure identifiers change so the dashboard and alarms stay in sync.

## Sentry Configuration

Terraform creates two Secrets Manager entries:

- `/berthcare/staging/sentry/backend`
- `/berthcare/staging/sentry/mobile`

Populate the DSNs either by setting `sentry_backend_dsn` / `sentry_mobile_dsn` securely in `terraform.tfvars` (not committed) or by adding a secret value manually in the AWS console. Each secret stores:

```json
{
  "dsn": "<project specific dsn>",
  "environment": "staging"
}
```

### Backend Integration

1. During deployment, inject the secret into the runtime (e.g. using ECS task definitions or parameter store) and expose variables:
   - `SENTRY_DSN` – secret `dsn`.
   - `SENTRY_ENVIRONMENT` – secret `environment`.
2. Initialise Sentry in the backend bootstrap:

```ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: 0.1
});
```

3. Emit a test error once per environment to confirm ingestion:

```ts
Sentry.captureException(new Error('BerthCare staging smoke test'));
```

### Mobile Integration

1. Pull the `/sentry/mobile` secret into the mobile CI pipeline and export `SENTRY_DSN`/`SENTRY_ENVIRONMENT` variables.
2. Initialise the SDK (React Native example):

```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: 0.1
});
```

3. Trigger `Sentry.captureMessage('Staging mobile smoke test')` during QA to verify events appear in Sentry.

## Operational Checklist

- ✅ Confirm SNS email subscriptions are accepted.
- ✅ Verify dashboard widgets populate after traffic flows through the load balancer.
- ✅ Set up CloudWatch Logs Insights saved queries for `/aws/ecs/<service>` if deeper investigations are required.
- ✅ Schedule quarterly tests of both CloudWatch alarms and Sentry ingestion to maintain confidence in the monitoring pipeline.

### Troubleshooting

- Confirm SNS subscribers clicked the confirmation email; resend the subscription or add a temporary endpoint if alerts are not arriving.
- Check CloudWatch alarm actions and IAM permissions so alarms can publish to `berthcare-staging-alerts`.
- Validate Sentry DSN and `SENTRY_ENVIRONMENT` values in `/berthcare/staging/sentry/*`; ensure clients have outbound network access.
- Inspect ECS task definitions to verify the log group is `/aws/ecs/berthcare-staging-api` and that retention is set per `log_retention_days`.
- Review CloudWatch Logs for throttling or access errors when widgets or alarms stop updating.
