terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "berthcare-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "ca-central-1"
    encrypt        = true
    dynamodb_table = "berthcare-terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}
