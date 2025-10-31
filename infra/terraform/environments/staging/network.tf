module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr
  azs  = var.availability_zones

  public_subnets   = var.public_subnet_cidrs
  private_subnets  = var.private_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  enable_nat_gateway           = true
  single_nat_gateway           = true # staging cost optimisation; introduces single point of failure for outbound traffic
  enable_dns_hostnames         = true
  enable_dns_support           = true
  create_igw                   = true
  create_database_subnet_group = true

  public_subnet_tags = {
    Tier = "public"
  }

  private_subnet_tags = {
    Tier = "application"
  }

  database_subnet_tags = {
    Tier = "database"
  }

  tags = local.common_tags
}
