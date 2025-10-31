# Local Development Environment

This guide provisions the data-layer dependencies described in the architecture blueprint (`project-documentation/architecture-output.md`) so the backend can run locally against PostgreSQL, Redis, and an S3-compatible store via LocalStack.

## Prerequisites

- Docker Desktop or Docker Engine 24+
- Node.js 20 LTS and pnpm 9 (see `README.md` for installation links)
- AWS CLI v2 (optional, but required for managing LocalStack resources)

## Configure Environment Variables

1. Copy the template file and adjust any values that need to differ on your machine:

   ```bash
   cp .env.example .env
   ```

2. Update any secrets (`JWT_SECRET`, etc.) before using the configuration with real data.
3. Ensure your shell loads the variables before starting the backend, for example:

   ```bash
   set -a && source .env && set +a
   ```

## Start Infrastructure Services

From the repository root:

```bash
docker compose up -d
```

This spins up:

- PostgreSQL 15 (`postgres` service) with credentials from `.env`
- Redis 7 (`redis` service) for caching and session state
- LocalStack (`localstack` service) exposing S3 on `http://localhost:${LOCALSTACK_PORT:-4566}`

Check service status with:

```bash
docker compose ps
```

All containers should report a `healthy` status once ready.

### Troubleshooting

#### Inspect container logs when a service is unhealthy

  ```bash
  docker compose logs postgres
  docker compose logs redis
  docker compose logs localstack
  ```

#### Confirm Docker is running and responsive

  ```bash
  docker info
  ```

  Restart Docker Desktop if the command reports errors.

#### Detect port conflicts (e.g., PostgreSQL on 5432, Redis on 6379, LocalStack on 4566)

  ```bash
  lsof -i :5432
  lsof -i :6379
  lsof -i :4566
  ```

  Stop the conflicting process or override the service port in `.env`.

#### Recover from failed healthchecks

- Quick reset without data loss:

  ```bash
  docker compose restart <service>
  ```

- Full reset (clears volumes):

  ```bash
  docker compose down --volumes
  docker compose up -d
  ```

Preserve persistent data unless state is corrupt (e.g., migrations broken). Use `--volumes` only when you intentionally want a clean database/cache.
## Run the Backend Against Docker Services

1. Install dependencies if you have not already:

   ```bash
   pnpm install
   ```

2. With the `.env` variables exported, build and start the backend:

   ```bash
   pnpm nx serve backend
   ```

   The backend uses `DATABASE_URL`, `REDIS_URL`, and the LocalStack AWS credentials to connect to the services defined in `docker-compose.yml`.

## Working with LocalStack S3

Create the development bucket once the container is running (the default name is `berthcare-local`):

```bash
aws --endpoint-url "${S3_ENDPOINT}" s3 mb "s3://${AWS_S3_BUCKET}"
```

Verify the bucket exists:

```bash
aws --endpoint-url "${S3_ENDPOINT}" s3 ls
```

When using AWS SDKs locally, ensure `S3_FORCE_PATH_STYLE=true` so requests are routed correctly to LocalStack.

## Shutdown and Cleanup

Stop the services when you are done:

```bash
docker compose down
```

To remove persisted data add the `--volumes` flag (this deletes PostgreSQL/Redis/LocalStack state):

```bash
docker compose down --volumes
```
