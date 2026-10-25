import os
import math
import json
import base64
import asyncio
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="Plant Simulator (Private Cloud Run Service)", version="2.0.0")

# Hidden fault labels remain isolated from ADK
_HIDDEN_FAULT_LABEL: Optional[str] = None
_CLOG_PCT: float = 0.0
_BYPASS_VALVE_PCT: float = 0.0
_TICK: int = 0

PLANT_DEBUGGER_URL = os.getenv("PLANT_DEBUGGER_URL", "http://127.0.0.1:8000")
GCP_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "plant-debugger-gcp")
PUBSUB_TOPIC = os.getenv("PUBSUB_TOPIC", "plant-anomaly-events")

pubsub_publisher = None
try:
    from google.cloud import pubsub_v1
    pubsub_publisher = pubsub_v1.PublisherClient()
    topic_path = pubsub_publisher.topic_path(GCP_PROJECT, PUBSUB_TOPIC)
except Exception:
    topic_path = None

class FaultInjectRequest(BaseModel):
    clog_pct: float = 85.0
    hidden_fault_code: str = "FAULT_SUCTION_STRAINER_FOULING_F17"
    incident_id: str = "INC-P101-SIM-001"

class MirrorActionRequest(BaseModel):
    asset_tag: str
    target_pct: float

def compute_hydraulics():
    global _TICK, _CLOG_PCT, _BYPASS_VALVE_PCT
    _TICK += 1
    
    clog_factor = 1.0 + (_CLOG_PCT / 100.0) ** 3 * 340.0
    r_strainer = 0.00018 * clog_factor
    valve_fraction = _BYPASS_VALVE_PCT / 100.0
    cv_effective = 120.0 * (valve_fraction ** 1.6)

    k_strainer = 1.0 / math.sqrt(r_strainer) if r_strainer > 0 else 1000.0
    k_bypass = cv_effective / math.sqrt(2.31) if cv_effective > 0 else 0.0
    k_total_inlet = k_strainer + k_bypass

    r_inlet_eff = 1.0 / (k_total_inlet ** 2)
    r_system = r_inlet_eff + 0.00602
    q_total = math.sqrt(72.0 / (r_system + 0.0012))

    p_suct = max(0.2, 14.7 - (r_inlet_eff * (q_total ** 2)))
    p_disch = p_suct + (72.0 - 0.0012 * (q_total ** 2))
    is_cavitating = (p_suct - 0.5) < 4.2

    return {
        "tick": _TICK,
        "timestamp": datetime.utcnow().isoformat(),
        "flow_gpm": round(q_total, 1),
        "suction_psi": round(p_suct, 2),
        "discharge_psi": round(p_disch, 2),
        "is_cavitating": is_cavitating,
        "bypass_valve_pct": _BYPASS_VALVE_PCT
        # Notice: _HIDDEN_FAULT_LABEL is NEVER exposed here to ADK!
    }

async def publish_anomaly_to_pubsub(incident_id: str, flow_gpm: float, clog_pct: float):
    payload = {
        "event_type": "LOW_FLOW_ANOMALY",
        "asset_tag": "FT-101",
        "flow_gpm": flow_gpm,
        "clog_pct": clog_pct,
        "incident_id": incident_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # 1. Attempt Pub/Sub cloud publish
    published_to_cloud = False
    if pubsub_publisher and topic_path:
        try:
            data = json.dumps(payload).encode("utf-8")
            pubsub_publisher.publish(topic_path, data, source="plant-sim")
            published_to_cloud = True
            print(f"[plant-sim] Published anomaly to Pub/Sub: {topic_path}")
        except Exception as e:
            print(f"[plant-sim] Cloud Pub/Sub publish failed: {e}")

    # 2. Push direct to plant-debugger webhook if local or fallback
    if not published_to_cloud:
        try:
            import requests
            b64_data = base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')
            push_body = {
                "message": {
                    "data": b64_data,
                    "messageId": f"sim-msg-{_TICK}",
                    "publishTime": datetime.utcnow().isoformat()
                },
                "subscription": "projects/plant-debugger-gcp/subscriptions/plant-anomaly-sub"
            }
            requests.post(f"{PLANT_DEBUGGER_URL}/api/pubsub/anomaly", json=push_body, timeout=5)
            print(f"[plant-sim] Pushed event directly to {PLANT_DEBUGGER_URL}/api/pubsub/anomaly")
        except Exception as err:
            print(f"[plant-sim] Webhook push err: {err}")

@app.get("/health")
def health():
    return {"status": "HEALTHY", "service": "plant-sim (Private Physical Dynamics)"}

@app.get("/telemetry")
def get_telemetry():
    return compute_hydraulics()

@app.post("/sim/inject-fault")
async def inject_fault(req: FaultInjectRequest, bg_tasks: BackgroundTasks):
    global _HIDDEN_FAULT_LABEL, _CLOG_PCT
    _HIDDEN_FAULT_LABEL = req.hidden_fault_code
    _CLOG_PCT = req.clog_pct
    
    telemetry = compute_hydraulics()
    # Trigger Pub/Sub event delivery
    bg_tasks.add_task(publish_anomaly_to_pubsub, req.incident_id, telemetry["flow_gpm"], req.clog_pct)
    
    return {
        "status": "FAULT_TRIGGERED",
        "telemetry": telemetry,
        "pubsub_dispatched": True
    }

@app.post("/actions/mirror")
def mirror_field_action(req: MirrorActionRequest):
    global _BYPASS_VALVE_PCT
    if req.asset_tag == "BV-104":
        _BYPASS_VALVE_PCT = req.target_pct
    return {
        "status": "MIRRORED",
        "asset_tag": req.asset_tag,
        "target_pct": req.target_pct,
        "telemetry": compute_hydraulics()
    }

@app.post("/sim/reset")
def reset():
    global _HIDDEN_FAULT_LABEL, _CLOG_PCT, _BYPASS_VALVE_PCT
    _HIDDEN_FAULT_LABEL = None
    _CLOG_PCT = 0.0
    _BYPASS_VALVE_PCT = 0.0
    return {"status": "RESET_BASELINE", "telemetry": compute_hydraulics()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
