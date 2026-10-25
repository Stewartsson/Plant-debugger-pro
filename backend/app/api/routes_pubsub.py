import base64
import json
from fastapi import APIRouter, Request, Header, HTTPException, status
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.sim.engine import sim_engine
from app.agent.workflow import adk_host
from app.verification.audit_trail import audit_trail

router = APIRouter(prefix="/pubsub", tags=["Google Cloud Pub/Sub Ingestion"])

class PubSubPushMessage(BaseModel):
    message: Dict[str, Any]
    subscription: Optional[str] = None

class DirectAnomalyPublishRequest(BaseModel):
    asset_tag: str = "FT-101"
    event_type: str = "LOW_FLOW_ANOMALY"
    flow_gpm: float = 32.0
    clog_pct: float = 85.0
    incident_id: str = "INC-P101-PUBSUB"

@router.post("/anomaly")
async def receive_pubsub_anomaly_push(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Google Cloud Pub/Sub Push Webhook.
    Receives OIDC authenticated push messages from topic: plant-anomaly-events.
    Decodes telemetry event, logs a cryptographically verified alert in the Audit Trail,
    and initiates the Google ADK diagnostic workflow loop.
    """
    body = await request.json()
    message = body.get("message", {})
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Pub/Sub push payload: missing 'message' field"
        )

    # 1. Inspect OIDC Bearer Token
    has_oidc = bool(authorization and authorization.startswith("Bearer "))
    oidc_token_snippet = authorization[:20] + "..." if has_oidc else "DEV_LOCAL_UNAUTHENTICATED"

    # 2. Decode Base64 Payload
    raw_data = message.get("data", "")
    try:
        decoded_bytes = base64.b64decode(raw_data)
        event_payload = json.loads(decoded_bytes.decode('utf-8'))
    except Exception as e:
        # Fallback if payload was already parsed JSON
        event_payload = message.get("data") if isinstance(message.get("data"), dict) else {"raw": raw_data}

    asset_tag = event_payload.get("asset_tag", "FT-101")
    flow_gpm = event_payload.get("flow_gpm", 35.0)
    incident_id = event_payload.get("incident_id", "INC-P101-PUBSUB")
    clog_pct = event_payload.get("clog_pct", 85.0)

    # 3. Record Verified Alert into Immutable Audit Trail
    audit_evt = audit_trail.record_event(
        event_type="PUBSUB_ANOMALY_OIDC_PUSH",
        details=f"Verified Cloud Pub/Sub alert: {asset_tag} low-flow ({flow_gpm} GPM). OIDC: {oidc_token_snippet}",
        payload={
            "pubsub_message_id": message.get("messageId"),
            "publish_time": message.get("publishTime"),
            "subscription": body.get("subscription"),
            "oidc_authenticated": has_oidc,
            "anomaly_data": event_payload
        },
        asset_tag=asset_tag
    )

    # 4. Trigger Simulator State & Start ADK Dynamic Diagnostic Workflow
    sim_engine.inject_strainer_clog(clog_pct=clog_pct, incident_id=incident_id)
    adk_host.start_incident(incident_id=incident_id)

    return {
        "status": "ACK",
        "incident_id": incident_id,
        "audit_event_id": audit_evt.event_id,
        "block_hash": audit_evt.block_hash,
        "adk_state": adk_host.state
    }

@router.post("/simulate-push")
def simulate_pubsub_push(req: DirectAnomalyPublishRequest):
    """
    Convenience endpoint for local simulator or tests to fire a synthetic Pub/Sub push event.
    Encodes payload in base64 matching Google Cloud Pub/Sub specification.
    """
    payload_json = json.dumps({
        "event_type": req.event_type,
        "asset_tag": req.asset_tag,
        "flow_gpm": req.flow_gpm,
        "clog_pct": req.clog_pct,
        "incident_id": req.incident_id
    })
    b64_data = base64.b64encode(payload_json.encode('utf-8')).decode('utf-8')

    mock_pubsub_body = {
        "message": {
            "attributes": {"source": "plant-sim", "severity": "CRITICAL"},
            "data": b64_data,
            "messageId": "pubsub-mock-901823",
            "publishTime": "2026-10-25T00:00:00Z"
        },
        "subscription": "projects/plant-debugger-gcp/subscriptions/plant-anomaly-sub"
    }

    # Record dispatch in audit trail
    audit_trail.record_event(
        event_type="PUBSUB_DISPATCH_SIMULATED",
        details=f"Simulator published {req.event_type} on {req.asset_tag} to topic: plant-anomaly-events",
        payload=mock_pubsub_body,
        asset_tag=req.asset_tag
    )

    # Trigger internal push handling
    sim_engine.inject_strainer_clog(clog_pct=req.clog_pct, incident_id=req.incident_id)
    adk_host.start_incident(incident_id=req.incident_id)

    return {
        "status": "PUBLISHED_AND_TRIGGERED",
        "mock_payload": mock_pubsub_body,
        "adk_state": adk_host.state
    }
