# The cloud profile.
#
# SKELETON. What exists here is the state layout, the naming convention and the one
# resource whose configuration carries a product obligation — the blob bucket. The
# managed database, cache and queue land with the features that need them, because a
# Terraform file describing infrastructure nobody has provisioned is a file that drifts
# from the day it is written.
#
# The application is portable by construction (ADR-0016): every dependency sits behind a
# port in @irodora/ports, so this profile swaps adapters rather than code.

locals {
  name = "irodora-${var.environment}"

  tags = {
    Project     = "irodora"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Wardrobe images (F-042). Present now because its security properties are decisions,
# not defaults, and writing them down late means writing them down after the first
# upload.
resource "aws_s3_bucket" "blob" {
  bucket = var.blob_bucket_name
}

resource "aws_s3_bucket_public_access_block" "blob" {
  bucket = aws_s3_bucket.blob.id

  # All four, explicitly. Any one left false is a bucket that can be made public by a
  # later policy edit nobody reviews.
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "blob" {
  bucket = aws_s3_bucket.blob.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "blob" {
  bucket = aws_s3_bucket.blob.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Managed Postgres, cache and queue are NOT declared here yet — they arrive with
# F-015 (API foundation) and F-034 (tenancy), which are the features that define what
# the schema and the connection limits need to be.
