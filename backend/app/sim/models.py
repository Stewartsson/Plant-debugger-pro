from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class AssetCondition(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    ALERT = "ALERT"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"

class TaskType(str, Enum):
    VISUAL_INSPECTION = "VISUAL_INSPECTION"
    BOUNDED_ADJUSTMENT = "BOUNDED_ADJUSTMENT"
    POSITION_VERIFICATION = "POSITION_VERIFICATION"
    ACOUSTIC_INSPECTION = "ACOUSTIC_INSPECTION"

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

class PumpState(BaseModel):
    tag: str = "P-101"
    name: str = "Centrifugal Feed Pump"
    running: bool = True
    rpm: float = 2950.0
    motor_amps: float = 38.5
    vibration_mm_s: float = 1.8
    cavitation_index: float = 0.0
    is_cavitating: bool = False
    condition: AssetCondition = AssetCondition.NORMAL

class StrainerState(BaseModel):
    tag: str = "F-17"
    name: str = "Duplex Suction Strainer"
    differential_pressure_psi: float = 1.8  # Clean is ~1.5 - 2.0 psi
    clog_percentage: float = 0.0            # 0% clean to 100% full restriction
    has_remote_telemetry: bool = False      # Key brownfield property: Local gauge ONLY!
    local_gauge_readable: bool = True
    condition: AssetCondition = AssetCondition.NORMAL

class ValveState(BaseModel):
    tag: str = "BV-104"
    name: str = "Manual Bypass Throttle Valve"
    position_pct: float = 0.0               # 0.0 = fully closed, 100.0 = fully open
    is_remotely_actuated: bool = False      # Key brownfield property: Physical handwheel only
    last_adjusted_at: Optional[datetime] = None
    verification_photo_sha: Optional[str] = None
    condition: AssetCondition = AssetCondition.NORMAL

class FlowTransmitter(BaseModel):
    tag: str = "FT-101"
    name: str = "Discharge Flow Transmitter"
    flow_gpm: float = 100.0                 # Nominal setpoint is 100 gpm
    nominal_flow_gpm: float = 100.0
    low_flow_threshold: float = 65.0
    condition: AssetCondition = AssetCondition.NORMAL

class PressureTransmitter(BaseModel):
    tag: str
    name: str
    pressure_psi: float
    nominal_psi: float
    condition: AssetCondition = AssetCondition.NORMAL

class TelemetrySnapshot(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tick: int = 0
    pump: PumpState = Field(default_factory=PumpState)
    strainer: StrainerState = Field(default_factory=StrainerState)
    bypass_valve: ValveState = Field(default_factory=ValveState)
    flow_meter: FlowTransmitter = Field(default_factory=FlowTransmitter)
    suction_pressure: PressureTransmitter = Field(
        default_factory=lambda: PressureTransmitter(tag="PT-101", name="Suction Pressure", pressure_psi=14.2, nominal_psi=14.5)
    )
    discharge_pressure: PressureTransmitter = Field(
        default_factory=lambda: PressureTransmitter(tag="PT-102", name="Discharge Pressure", pressure_psi=68.0, nominal_psi=70.0)
    )
    incident_active: bool = False
    incident_status: str = "NORMAL"  # "NORMAL", "INVESTIGATING", "RECOVERING", "RESOLVED"
    sustained_recovery_seconds: int = 0
    active_alarms: List[str] = []

class FieldTask(BaseModel):
    task_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    task_type: TaskType
    target_asset: str
    title: str
    instruction: str
    safety_notes: List[str] = []
    allowed_delta_pct: Optional[float] = None
    status: TaskStatus = TaskStatus.PENDING
    evidence_type: str = "PHOTO" # "PHOTO", "AUDIO", "CONFIRMATION"
    evidence_uri: Optional[str] = None
    evidence_sha256: Optional[str] = None
    ai_interpretation: Optional[Dict[str, Any]] = None
    operator_notes: Optional[str] = None
    completed_at: Optional[datetime] = None

class SiteKnowledgeFact(BaseModel):
    fact_id: str
    asset_tag: str
    assertion: str
    author: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    verified: bool = True
    context_tags: List[str] = []
