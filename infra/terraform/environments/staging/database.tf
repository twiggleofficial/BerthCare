module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.5"

  identifier = "${local.name_prefix}-postgres"

  engine                = "postgres"
  engine_version        = "15.5"
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  multi_az              = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_master.result
  port     = 5432

  db_subnet_group_name   = module.vpc.database_subnet_group
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_window              = var.db_backup_window
  maintenance_window         = var.db_maintenance_window
  backup_retention_period    = var.db_backup_retention_period
  delete_automated_backups   = false
  deletion_protection        = var.enable_rds_deletion_protection
  copy_tags_to_snapshot      = true
  auto_minor_version_upgrade = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = null

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  storage_encrypted = true

  tags = local.common_tags
}
