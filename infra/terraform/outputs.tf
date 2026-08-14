output "blob_bucket" {
  description = "Feeds IRODORA_BLOB_BUCKET."
  value       = aws_s3_bucket.blob.id
}

output "region" {
  description = "Feeds IRODORA_BLOB_REGION."
  value       = var.region
}
