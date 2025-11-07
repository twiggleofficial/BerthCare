# BerthCare Staging Infrastructure (Terraform)

This configuration provisions the BerthCare staging environment in the `ca-central-1` AWS region. It follows the infrastructure requirements defined in `project-documentation/architecture-output.md` (Infrastructure; Canadian data residency) with an emphasis on invisible tooling, questioning defaults, and owning the stack.

## Provisioned Resources

- **Networking:** VPC (`/16`) with paired public and private subnets across two Availability Zones, internet gateway, NAT gateway (single AZ to limit cost), and dedicated route tables.
- **Runtime perimeter:** Security groups that isolate application workloads (`ecs_tasks`) and strictly permit PostgreSQL and Redis access from those tasks only.
- **Data layer:** Encrypted PostgreSQL 15 (`db.t3.micro`) instance in private data subnets, plus encrypted Redis 7 (`cache.t3.micro`) replication group.
- **Storage:** Private, versioned S3 bucket with default AWS KMS encryption and lifecycle transitions for infrequently accessed data.
- **Identity:** ECS task execution role (pull images, write logs) and ECS task role with least-privilege access to S3 and secure parameters.
- **Secrets:** SSM Parameter Store `SecureString` values for the database master password and Redis auth token.

All resources are tagged with `Project`, `Environment`, and `ManagedBy` for traceability and cost allocation.

## Usage

1. Ensure you have AWS credentials for the staging account with permissions to manage VPC, EC2 networking, RDS, ElastiCache, S3, IAM, and SSM resources.
2. From this directory run:

   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

   The generated plan should stay within the staging budget target (~$200/month) by using burstable instances and a single NAT gateway.

3. Outputs include VPC and subnet IDs, database/cache endpoints, S3 bucket name, and IAM role ARNs. Application services can retrieve secrets via the emitted SSM parameter names.

## Notes & Assumptions

- The S3 bucket name is suffixed with the AWS account ID to guarantee global uniqueness.
- `terraform destroy` will delete the database without a final snapshot (acceptable for staging but **not** production).
- Redis auth tokens and database passwords are generated per apply. Re-applying will rotate these secrets if the state is replaced.
- Additional environments should re-use shared modules but provide their own variable files to keep account-level isolation.

## Next Steps

- Integrate the emitted IAM role ARNs and SSM parameters into the ECS service/task definitions.
- Configure VPC endpoints (S3, SSM) if future compliance reviews require private network egress for AWS services.
