resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "Security group for containerized application workloads (ECS/Fargate)."
  vpc_id      = module.vpc.vpc_id

  egress {
    description = "Allow all outbound traffic."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-sg"
  })
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Security group for PostgreSQL RDS, restricted to application workloads and trusted CIDRs."
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-sg"
  })
}

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Security group for Redis, restricted to application workloads."
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

resource "aws_security_group_rule" "rds_from_app" {
  type                     = "ingress"
  description              = "Allow PostgreSQL access from application tasks."
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "redis_from_app" {
  type                     = "ingress"
  description              = "Allow Redis access from application tasks."
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "rds_from_trusted" {
  for_each = toset(var.trusted_office_cidrs)

  type              = "ingress"
  description       = "Allow trusted CIDR ${each.value} access to PostgreSQL."
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = aws_security_group.rds.id
  cidr_blocks       = [each.value]
}

resource "aws_security_group_rule" "redis_from_trusted" {
  for_each = toset(var.trusted_office_cidrs)

  type              = "ingress"
  description       = "Allow trusted CIDR ${each.value} access to Redis."
  from_port         = 6379
  to_port           = 6379
  protocol          = "tcp"
  security_group_id = aws_security_group.redis.id
  cidr_blocks       = [each.value]
}
