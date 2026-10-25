variable "project_id" {
  type        = string
  description = "The Google Cloud Project ID"
}

variable "region" {
  type        = string
  description = "Google Cloud region for deployment"
  default     = "us-central1"
}

variable "debugger_image" {
  type        = string
  description = "Container image for plant-debugger"
  default     = "gcr.io/plant-debugger-gcp/plant-debugger:latest"
}

variable "sim_image" {
  type        = string
  description = "Container image for plant-sim"
  default     = "gcr.io/plant-debugger-gcp/plant-sim:latest"
}
