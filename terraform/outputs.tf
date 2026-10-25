output "plant_debugger_url" {
  value       = google_cloud_run_v2_service.plant_debugger.uri
  description = "Public URL for Commander and Field Operator Console"
}

output "plant_sim_url" {
  value       = google_cloud_run_v2_service.plant_sim.uri
  description = "Private URL for isolated Plant Simulator"
}

output "evidence_bucket" {
  value       = google_storage_bucket.evidence_bucket.name
  description = "Cloud Storage Evidence Vault Bucket"
}

output "pubsub_topic" {
  value       = google_pubsub_topic.anomaly_events.name
  description = "Pub/Sub Topic for Anomaly Event Delivery"
}
