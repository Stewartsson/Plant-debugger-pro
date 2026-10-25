terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# =========================================================
# 1. Cloud Storage: Evidence Vault (Photos with SHA-256)
# =========================================================
resource "google_storage_bucket" "evidence_bucket" {
  name                        = "${var.project_id}-plant-debugger-evidence"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# =========================================================
# 2. Cloud Firestore: Incident State, ADK Sessions & Site Knowledge
# =========================================================
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# =========================================================
# 3. Cloud Pub/Sub: Anomaly Events Topic & OIDC Push Subscription
# =========================================================
resource "google_pubsub_topic" "anomaly_events" {
  name = "plant-anomaly-events"
}

# Service Account for Pub/Sub OIDC Push Auth
resource "google_service_account" "pubsub_invoker" {
  account_id   = "plant-pubsub-invoker"
  display_name = "Cloud Pub/Sub OIDC Invoker for Plant Debugger"
}

resource "google_pubsub_subscription" "anomaly_push_sub" {
  name  = "plant-anomaly-push-sub"
  topic = google_pubsub_topic.anomaly_events.name

  ack_deadline_seconds = 30

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.plant_debugger.uri}/api/pubsub/anomaly"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
      audience              = google_cloud_run_v2_service.plant_debugger.uri
    }
  }
}

# =========================================================
# 4. Secret Manager: Gemini API Key & Secrets
# =========================================================
resource "google_secret_manager_secret" "gemini_key" {
  secret_id = "gemini-api-key"

  replication {
    auto {}
  }
}

# =========================================================
# 5. Cloud Run: Plant Debugger (Public Application Layer)
# =========================================================
resource "google_cloud_run_v2_service" "plant_debugger" {
  name     = "plant-debugger"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = var.debugger_image

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name  = "DECISION_ENGINE"
        value = "adk"
      }
      env {
        name  = "ADK_FALLBACK_POLICY"
        value = "false"
      }
      env {
        name  = "ADK_SESSION_BACKEND"
        value = "firestore"
      }
      env {
        name  = "VISION_ENGINE"
        value = "gemini"
      }
      env {
        name  = "VISION_FALLBACK_POLICY"
        value = "false"
      }
      env {
        name  = "FIELD_STATE_BACKEND"
        value = "firestore"
      }
      env {
        name  = "FIELD_EVIDENCE_BACKEND"
        value = "gcs"
      }
      env {
        name  = "GCS_EVIDENCE_BUCKET"
        value = google_storage_bucket.evidence_bucket.name
      }
    }
  }
}

# Public access for Commander & Operator UI
resource "google_cloud_run_v2_service_iam_member" "debugger_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.plant_debugger.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Allow Pub/Sub OIDC invoker
resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_role" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.plant_debugger.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

# =========================================================
# 6. Cloud Run: Plant Sim (Private Simulation Layer)
# =========================================================
resource "google_cloud_run_v2_service" "plant_sim" {
  name     = "plant-sim"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    containers {
      image = var.sim_image

      env {
        name  = "PLANT_DEBUGGER_URL"
        value = google_cloud_run_v2_service.plant_debugger.uri
      }
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.anomaly_events.name
      }
    }
  }
}
