# Remote state — PARTIAL configuration, deliberately.
#
# The block is empty and the values arrive at init time:
#
#   terraform init -backend-config=backend.hcl
#
# This is the honest form. Hard-coding a bucket that nobody has created produces a file
# that LOOKS configured and fails on the first `init`, and the failure is confusing
# because the config is right there in the repository. An empty block says plainly that
# the backend is chosen and its location is an input.
#
# ATTESTED, not gated (ADR-0038): "remote state configured" means a real bucket with
# versioning and a lock table. That needs a cloud account, so it is recorded as an
# obligation on F-005 rather than claimed here.

terraform {
  backend "s3" {}
}
