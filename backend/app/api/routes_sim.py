from fastapi import APIRouter, Response
from pydantic import BaseModel
from app.sim.engine import sim_engine
from app.sim.acoustic_synth import generate_pump_audio_wav
from app.agent.workflow import adk_host

router = APIRouter(prefix="/sim", tags=["Simulation"])

class FaultInjectionRequest(BaseModel):
    clog_pct: float = 85.0
    incident_id: str = "INC-P101-001"

class ValveMoveRequest(BaseModel):
    target_pct: float

@router.post("/inject-fault")
def inject_fault(req: FaultInjectionRequest):
    """Simulates foreign debris clogging strainer F-17 and triggers ADK incident loop."""
    sim_engine.inject_strainer_clog(clog_pct=req.clog_pct, incident_id=req.incident_id)
    adk_host.start_incident(incident_id=req.incident_id)
    return {
        "status": "FAULT_INJECTED",
        "clog_pct": req.clog_pct,
        "incident_id": req.incident_id,
        "snapshot": sim_engine.get_current_snapshot()
    }

@router.post("/reset")
def reset_sim():
    """Restores plant to normal nominal operation."""
    sim_engine.reset_plant()
    adk_host.state = "IDLE"
    adk_host.active_task = None
    adk_host.completed_tasks.clear()
    adk_host.decision_trace.clear()
    return {
        "status": "RESET_NORMAL",
        "snapshot": sim_engine.get_current_snapshot()
    }

@router.post("/set-valve")
def set_valve(req: ValveMoveRequest):
    sim_engine.set_bypass_valve(req.target_pct)
    return {
        "status": "VALVE_ADJUSTED",
        "valve_pct": req.target_pct,
        "snapshot": sim_engine.get_current_snapshot()
    }

@router.get("/pump-audio")
def get_pump_audio():
    """Generates a dynamic 3-second physics-accurate WAV sample of the pump running."""
    snapshot = sim_engine.get_current_snapshot()
    wav_bytes = generate_pump_audio_wav(
        duration_sec=3.0,
        is_cavitating=snapshot.pump.is_cavitating,
        cavitation_severity=snapshot.pump.cavitation_index,
        is_bearing_wear=sim_engine.bearing_wear
    )
    return Response(content=wav_bytes, media_type="audio/wav")
