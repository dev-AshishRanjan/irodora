# Provider and version constraints.
#
# `required_version` is a floor with an upper bound, not `>= 1.0`. A state file written
# by a newer Terraform cannot be read by an older one, so an unbounded constraint means
# one engineer upgrading locally can lock everyone else out of the state.

terraform {
  required_version = "~> 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}
