variable "project_name" {
  description = "Canonical project identifier used in resource naming."
  type        = string
  default     = "berthcare"
}

variable "environment" {
  description = "Deployment environment identifier."
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ca-central-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the staging VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets."
  type        = list(string)
  default = [
    "10.20.0.0/24",
    "10.20.1.0/24",
  ]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets."
  type        = list(string)
  default = [
    "10.20.10.0/24",
    "10.20.11.0/24",
  ]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for private data subnets used by data stores."
  type        = list(string)
  default = [
    "10.20.20.0/24",
    "10.20.21.0/24",
  ]
}

variable "log_retention_days" {
  description = "Retention period for CloudWatch Log Groups."
  type        = number
  default     = 30
}

variable "db_allocated_storage" {
  description = "Allocated storage (GiB) for the PostgreSQL instance."
  type        = number
  default     = 20
}

variable "db_backup_retention_days" {
  description = "Automated backup retention period for the PostgreSQL instance."
  type        = number
  default     = 7
}
