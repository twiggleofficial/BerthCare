resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.name_prefix}-redis-subnets"
  description = "Subnet group for Redis replication group."

  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis replication group for ${var.environment}."

  engine         = "redis"
  engine_version = "7.1"
  node_type      = var.redis_node_type

  num_cache_clusters         = var.redis_num_cache_nodes
  automatic_failover_enabled = true
  multi_az_enabled           = true
  port                       = 6379

  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [
    aws_security_group.redis.id
  ]

  maintenance_window         = var.redis_maintenance_window
  auto_minor_version_upgrade = true
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  tags = local.common_tags
}
