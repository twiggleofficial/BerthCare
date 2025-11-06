resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks-sg"
  description = "Allows outbound traffic for ECS tasks; ingress is managed via load balancers."
  vpc_id      = aws_vpc.main.id

  egress {
    description = "HTTPS egress to internet services via NAT"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "PostgreSQL access to database security group"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }

  egress {
    description     = "Redis access to cache security group"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
  }

  tags = {
    Name = "${local.name_prefix}-ecs-tasks-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "PostgreSQL access restricted to ECS tasks."
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Restrict database egress to VPC network"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "${local.name_prefix}-rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Redis access restricted to ECS tasks."
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Restrict Redis egress to VPC network"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "${local.name_prefix}-redis-sg"
  }
}

resource "aws_security_group_rule" "rds_ingress_from_ecs" {
  security_group_id        = aws_security_group.rds.id
  type                     = "ingress"
  description              = "PostgreSQL access from ECS tasks"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs_tasks.id
}

resource "aws_security_group_rule" "redis_ingress_from_ecs" {
  security_group_id        = aws_security_group.redis.id
  type                     = "ingress"
  description              = "Redis access from ECS tasks"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs_tasks.id
}
