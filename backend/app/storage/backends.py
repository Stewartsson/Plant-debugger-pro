import os
import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path
from app.config import settings

# =========================================================
# STATE BACKEND (Firestore or Local)
# =========================================================
class BaseStateBackend(ABC):
    @abstractmethod
    def save_incident_state(self, incident_id: str, state: Dict[str, Any]):
        pass

    @abstractmethod
    def get_incident_state(self, incident_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def save_adk_checkpoint(self, session_id: str, step: int, checkpoint_data: Dict[str, Any]):
        pass

class LocalStateBackend(BaseStateBackend):
    def __init__(self):
        self._incidents: Dict[str, Dict[str, Any]] = {}
        self._checkpoints: Dict[str, List[Dict[str, Any]]] = {}

    def save_incident_state(self, incident_id: str, state: Dict[str, Any]):
        self._incidents[incident_id] = state

    def get_incident_state(self, incident_id: str) -> Optional[Dict[str, Any]]:
        return self._incidents.get(incident_id)

    def save_adk_checkpoint(self, session_id: str, step: int, checkpoint_data: Dict[str, Any]):
        if session_id not in self._checkpoints:
            self._checkpoints[session_id] = []
        self._checkpoints[session_id].append({"step": step, "data": checkpoint_data})

class FirestoreStateBackend(BaseStateBackend):
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
        self.client = None
        try:
            from google.cloud import firestore
            self.client = firestore.Client(project=self.project_id) if self.project_id else firestore.Client()
            print(f"[FirestoreBackend] Connected to Google Cloud Firestore (Project: {self.client.project})")
        except Exception as e:
            print(f"[FirestoreBackend] Notice: Google Cloud credentials not configured. Running with resilient local state fallback. ({e})")
            self._fallback = LocalStateBackend()

    def save_incident_state(self, incident_id: str, state: Dict[str, Any]):
        if self.client:
            try:
                self.client.collection("incidents").document(incident_id).set(state)
                return
            except Exception as e:
                print(f"[Firestore] Write error: {e}")
        self._fallback.save_incident_state(incident_id, state)

    def get_incident_state(self, incident_id: str) -> Optional[Dict[str, Any]]:
        if self.client:
            try:
                doc = self.client.collection("incidents").document(incident_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                print(f"[Firestore] Read error: {e}")
        return self._fallback.get_incident_state(incident_id)

    def save_adk_checkpoint(self, session_id: str, step: int, checkpoint_data: Dict[str, Any]):
        if self.client:
            try:
                self.client.collection("adk_sessions").document(session_id).collection("checkpoints").document(f"step_{step}").set(checkpoint_data)
                return
            except Exception as e:
                print(f"[Firestore] Checkpoint write error: {e}")
        self._fallback.save_adk_checkpoint(session_id, step, checkpoint_data)


# =========================================================
# EVIDENCE STORAGE BACKEND (GCS or Local)
# =========================================================
class BaseEvidenceBackend(ABC):
    @abstractmethod
    def store_evidence(self, filename: str, data: bytes, sha256_hash: str) -> str:
        pass

class LocalEvidenceBackend(BaseEvidenceBackend):
    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def store_evidence(self, filename: str, data: bytes, sha256_hash: str) -> str:
        dest = self.storage_dir / f"{sha256_hash[:16]}_{filename}"
        with open(dest, "wb") as f:
            f.write(data)
        return f"/evidence/{sha256_hash[:16]}_{filename}"

class GCSEvidenceBackend(BaseEvidenceBackend):
    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name or os.getenv("GCS_EVIDENCE_BUCKET", "plant-debugger-evidence")
        self.client = None
        self._local_fallback = LocalEvidenceBackend(settings.EVIDENCE_PATH)
        try:
            from google.cloud import storage
            self.client = storage.Client()
            self.bucket = self.client.bucket(self.bucket_name)
            print(f"[GCSEvidenceBackend] Connected to Google Cloud Storage bucket: {self.bucket_name}")
        except Exception as e:
            print(f"[GCSEvidenceBackend] Notice: GCS client not initialized. Falling back to local evidence store. ({e})")

    def store_evidence(self, filename: str, data: bytes, sha256_hash: str) -> str:
        if self.client:
            try:
                blob_name = f"evidence/{sha256_hash[:16]}_{filename}"
                blob = self.bucket.blob(blob_name)
                blob.upload_from_string(data)
                return f"gs://{self.bucket_name}/{blob_name}"
            except Exception as e:
                print(f"[GCS] Upload error: {e}")
        return self._local_fallback.store_evidence(filename, data, sha256_hash)


# Factory Initializers based on Devpost env vars:
# FIELD_STATE_BACKEND=firestore, FIELD_EVIDENCE_BACKEND=gcs, ADK_SESSION_BACKEND=firestore
def get_state_backend() -> BaseStateBackend:
    backend_choice = os.getenv("FIELD_STATE_BACKEND", "local").lower()
    if backend_choice == "firestore":
        return FirestoreStateBackend()
    return LocalStateBackend()

def get_evidence_backend() -> BaseEvidenceBackend:
    backend_choice = os.getenv("FIELD_EVIDENCE_BACKEND", "local").lower()
    if backend_choice == "gcs":
        return GCSEvidenceBackend()
    return LocalEvidenceBackend(settings.EVIDENCE_PATH)

state_backend = get_state_backend()
evidence_backend = get_evidence_backend()
