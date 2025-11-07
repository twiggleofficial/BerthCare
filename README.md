# BerthCare Monorepo

BerthCare delivers an offline-first, React Native care delivery experience backed by a TypeScript service stack. This repository will host the shared source for mobile, backend, and infrastructure components so the full team can iterate together while keeping tooling invisible to caregivers and coordinators.

## Initial Setup

- Install Node.js 20+, pnpm 8+, Docker, and Docker Compose.
- Clone the repository (GitHub URL will be `https://github.com/berthcare/berthcare` once provisioned).
- Bootstrap the workspace with `make setup` (creates `.env` from `.env.example`, installs pnpm dependencies, and pulls container images).
- Run `make start` to launch PostgreSQL 15, Redis 7, and LocalStack S3 locally; `make stop`/`make clean` tear things down when you're done.
- Use `make test` to run linting and type-checking before you ship anything.

## Tooling Principles

- Two-space indentation, UTF-8 encoding, LF line endings across the codebase.
- Follow Conventional Commits for all commits and pull requests.
- Keep developer tooling fast and silent; every command should earn its place.

## Local Environment

- `.env.example` documents every variable the stack expects; `make setup` copies it to `.env` so you can adjust ports or credentials before starting containers.
- `DB_POOL_MIN` controls how many PostgreSQL connections the backend keeps warm (defaults to 2); raise it in staging/prod if you need more ready clients, or lower it locally to reduce idle connections.
- `docker-compose.yml` pins PostgreSQL 15.5, Redis 7.2, and LocalStack 3.x to keep the local data layer in lockstep with the [architecture blueprint](project-documentation/architecture-output.md) while still running entirely on your machine.
- Services listen on `localhost:5432` (PostgreSQL), `localhost:6379` (Redis), and `localhost:4566` (LocalStack). Update the `.env` file if you need to avoid clashes with other installs.
- Buckets and schemas are not auto-created—own the stack by running the migrations or S3 bootstrap scripts you need inside the containers.
- `make clean` removes containers, volumes, and node modules so you can return to a blank slate when diagnosing drift.

## Monitoring & Observability

- Terraform (see `infra/terraform/environments/staging/monitoring.tf`) provisions a CloudWatch log group (`/aws/ecs/berthcare-staging/backend`), request/error/latency metric filters, the `berthcare-staging-observability` dashboard, and SNS-backed alarms that fire when the API error rate exceeds 1% or when p95 latency passes 2s. Apply the environment to publish them.
- Backend logs are now structured JSON with `event` fields so CloudWatch metric filters stay inexpensive and accurate; health requests immediately surface in the dashboard once the ECS service is wired up.
- Sentry wiring is in place for both the Express API and React Native app. Populate `SENTRY_DSN_BACKEND`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `EXPO_PUBLIC_SENTRY_DSN_MOBILE`, and `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (all documented in `.env.example`) before you build so telemetry flows. For quick smoke tests, call `/healthz?forceError=true` locally after setting the DSN to confirm a synthetic exception reaches Sentry.
- Observability defaults mirror the [Monitoring & Observability guidance](project-documentation/architecture-output.md#monitoring--observability) in the architecture blueprint: tooling stays invisible (no extra dashboards to click through), we question defaults by owning the log schema, and we keep CloudWatch + Sentry as the single source of truth for runtime signals.

## Documentation References

- Architecture blueprint (v2.0.0) — see `project-documentation/architecture-output.md`, Data Layer section, for the rationale behind PostgreSQL 15, Redis 7, and S3 (via LocalStack) in this local environment.
- Infrastructure guide — see `docs/architecture.md` for repository layout, Terraform-managed AWS staging details, CI/CD quality gate, and observability defaults.

## Next Steps

- Enable the required branch protections on `main` (1 review minimum, required status checks, signed commits).
- Add the CI workflow, pnpm workspace structure, and local environment tooling as tracked in Phase E tasks E2–E4.

This repository is licensed under MIT; see `LICENSE` for details.
