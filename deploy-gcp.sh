#!/bin/bash
# =========================================================
# Google Cloud One-Click Deployment Script for Plant Debugger
# =========================================================
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

echo "Deploying Plant Debugger to GCP Project: $PROJECT_ID ($REGION)..."

# 1. Enable required APIs
gcloud services enable \
    run.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    pubsub.googleapis.com \
    secretmanager.googleapis.com \
    aiplatform.googleapis.com

# 2. Build and Deploy plant-debugger to Cloud Run
echo "Building and deploying plant-debugger..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/plant-debugger:latest .
gcloud run deploy plant-debugger \
    --image gcr.io/$PROJECT_ID/plant-debugger:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars DECISION_ENGINE=adk,ADK_SESSION_BACKEND=firestore,FIELD_STATE_BACKEND=firestore,FIELD_EVIDENCE_BACKEND=gcs

# 3. Build and Deploy plant-sim to Cloud Run
echo "Building and deploying plant-sim..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/plant-sim:latest ./services/plant-sim
gcloud run deploy plant-sim \
    --image gcr.io/$PROJECT_ID/plant-sim:latest \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated

echo "Deployment complete!"
