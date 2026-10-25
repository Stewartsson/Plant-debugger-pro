import hashlib
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.agent.workflow import adk_host
from app.verification.rca_generator import rca_generator
from app.verification.audit_trail import audit_trail
from app.storage.backends import evidence_backend
from app.config import settings

router = APIRouter(prefix="/agent", tags=["Agent Workflow"])

@router.get("/state")
def get_agent_state():
    return {
        "workflow_state": adk_host.state,
        "incident_id": adk_host.current_incident_id,
        "active_task": adk_host.active_task.model_dump() if adk_host.active_task else None,
        "completed_tasks": [t.model_dump() for t in adk_host.completed_tasks],
        "decision_trace": adk_host.decision_trace,
        "step_counter": adk_host.step_counter
    }

@router.post("/submit-evidence")
async def submit_evidence(
    task_id: str = Form(...),
    operator_notes: str = Form(""),
    confirmed_action_pct: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    evidence_bytes = None
    filename = ""
    sha256_hash = ""
    
    if file:
        evidence_bytes = await file.read()
        filename = file.filename or "evidence.dat"
        sha256_hash = hashlib.sha256(evidence_bytes).hexdigest()
        
        # Store evidence via configured backend (GCS or Local)
        stored_uri = evidence_backend.store_evidence(filename, evidence_bytes, sha256_hash)
        
        # Log evidence integrity into Audit Trail
        audit_trail.record_event(
            event_type="FIELD_EVIDENCE_SEALED",
            details=f"Field evidence sealed: {filename} (SHA-256: {sha256_hash[:16]}...). URI: {stored_uri}",
            payload={"task_id": task_id, "sha256": sha256_hash, "uri": stored_uri, "filename": filename}
        )
    else:
        # For pure manual slider confirmations, hash the text notes + timestamp
        sha256_hash = hashlib.sha256(f"{task_id}_{confirmed_action_pct}_{operator_notes}".encode()).hexdigest()
        audit_trail.record_event(
            event_type="MANUAL_ACTION_CONFIRMED",
            details=f"Operator confirmed manual delta: {confirmed_action_pct}% on task {task_id}",
            payload={"task_id": task_id, "confirmed_pct": confirmed_action_pct, "notes": operator_notes}
        )

    result = adk_host.submit_field_evidence(
        task_id=task_id,
        evidence_bytes=evidence_bytes,
        evidence_filename=filename,
        sha256_hash=sha256_hash,
        operator_notes=operator_notes,
        confirmed_action_pct=confirmed_action_pct
    )
    return result

@router.post("/cycle")
def trigger_agent_cycle():
    adk_host.run_cycle()
    return get_agent_state()

@router.get("/rca")
def get_post_incident_rca():
    incident_id = adk_host.current_incident_id or "INC-P101-001"
    package = rca_generator.generate_post_incident_package(
        incident_id=incident_id,
        decision_trace=adk_host.decision_trace,
        evidence_list=[t.model_dump() for t in adk_host.completed_tasks]
    )
    return package
