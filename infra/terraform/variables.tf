variable "region" {
  description = "AWS region. Data residency is a product constraint, not a performance one — see NFR-18."
  type        = string
}

variable "environment" {
  description = "Environment name. Becomes part of every resource name, so it must be short and stable."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,15}$", var.environment))
    error_message = "environment must be lowercase alphanumeric with hyphens, 2-16 characters."
  }
}

variable "blob_bucket_name" {
  description = "Bucket for wardrobe images. Globally unique, so it is an input rather than derived."
  type        = string
}
