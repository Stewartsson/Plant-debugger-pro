import math
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.sim.models import (
    TelemetrySnapshot,
    PumpState,
    StrainerState,
    ValveState,
    FlowTransmitter,
    PressureTransmitter,
    AssetCondition
)
from app.sim.acoustic_synth import generate_pump_audio_wav

class HydraulicSimulationEngine:
    def __init__(self):
        self.tick_count: int = 0
        self.running: bool = True
        
        # Physical Parameters
        self.tank_pressure_psi: float = 14.7  # Atmospheric
        self.vapor_pressure_psi: float = 0.5  # Water at 25C
        self.npsh_required_psi: float = 4.2   # Pump design requirement
        
        # State variables
        self.strainer_clog_pct: float = 0.0   # 0% = Clean, 100% = Fully Blocked
        self.bypass_valve_pct: float = 0.0    # 0% = Closed, 100% = Fully Open
        self.bearing_wear: bool = False
        
        # Incident and verification tracking
        self.incident_active: bool = False
        self.incident_id: Optional[str] = None
        self.incident_status: str = "NORMAL"  # "NORMAL", "INVESTIGATING", "RECOVERING", "RESOLVED"
        self.sustained_healthy_ticks: int = 0
        self.required_recovery_ticks: int = 15
        
        # Telemetry history buffer (last 60 ticks)
        self.history: List[TelemetrySnapshot] = []
        self._current_snapshot: TelemetrySnapshot = self._compute_physics()

    def get_current_snapshot(self) -> TelemetrySnapshot:
        return self._current_snapshot

    def inject_strainer_clog(self, clog_pct: float = 85.0, incident_id: str = "INC-P101-001"):
        """Simulates heavy foreign particulate fouling on strainer basket F-17."""
        self.strainer_clog_pct = max(0.0, min(100.0, clog_pct))
        self.incident_active = True
        self.incident_id = incident_id
        self.incident_status = "INVESTIGATING"
        self.sustained_healthy_ticks = 0
        self.tick()

    def set_bypass_valve(self, target_pct: float):
        """Sets physical position of manual bypass valve BV-104."""
        self.bypass_valve_pct = max(0.0, min(100.0, target_pct))
        self.tick()

    def reset_plant(self):
        """Resets all equipment to pristine baseline condition."""
        self.strainer_clog_pct = 0.0
        self.bypass_valve_pct = 0.0
        self.bearing_wear = False
        self.incident_active = False
        self.incident_id = None
        self.incident_status = "NORMAL"
        self.sustained_healthy_ticks = 0
        self.tick()

    def tick(self) -> TelemetrySnapshot:
        """Computes one discrete time step (1.0 sec) of plant hydraulic dynamics."""
        self.tick_count += 1
        snapshot = self._compute_physics()
        self._current_snapshot = snapshot
        
        self.history.append(snapshot)
        if len(self.history) > 60:
            self.history.pop(0)
            
        return snapshot

    def _compute_physics(self) -> TelemetrySnapshot:
        # 1. Hydraulic Resistance
        # Baseline clean strainer has R = 0.00018 -> at 100 gpm, dP = R * Q^2 = 1.8 psi
        # Clogging exponentially multiplies resistance
        clog_factor = 1.0 + (self.strainer_clog_pct / 100.0) ** 3 * 340.0
        r_strainer = 0.00018 * clog_factor
        
        # Bypass Valve Cv (Manual throttle valve BV-104)
        valve_fraction = self.bypass_valve_pct / 100.0
        # Equal-percentage characteristic
        cv_effective = 120.0 * (valve_fraction ** 1.6)
        
        # Parallel resistance calculation
        k_strainer = 1.0 / math.sqrt(r_strainer) if r_strainer > 0 else 1000.0
        k_bypass = cv_effective / math.sqrt(2.31) if cv_effective > 0 else 0.0
        k_total_inlet = k_strainer + k_bypass
        
        r_inlet_eff = 1.0 / (k_total_inlet ** 2)
        
        # Total system resistance R_total (calibrated for nominal 100 GPM at baseline)
        r_system = r_inlet_eff + 0.00602
        
        # Solve H_pump(Q) = R_system * Q^2
        # 72 - 0.0012 * Q^2 = R_system * Q^2 -> Q = sqrt(72 / (R_system + 0.0012))
        q_total = math.sqrt(72.0 / (r_system + 0.0012))
        
        # Flow split
        if k_total_inlet > 0:
            q_strainer = q_total * (k_strainer / k_total_inlet)
            q_bypass = q_total * (k_bypass / k_total_inlet)
        else:
            q_strainer = 0.0
            q_bypass = 0.0

        # Pressures
        dp_strainer = r_strainer * (q_strainer ** 2)
        # Add slight natural measurement noise
        dp_strainer = round(dp_strainer, 2)
        
        # Suction Pressure at Pump Flange: Tank pressure (14.7 psi) minus inlet drop
        p_suction = max(0.2, self.tank_pressure_psi - (r_inlet_eff * (q_total ** 2)))
        p_discharge = p_suction + (72.0 - 0.0012 * (q_total ** 2))
        
        # Cavitation Check: NPSH available
        npsh_avail = p_suction - self.vapor_pressure_psi
        is_cavitating = npsh_avail < self.npsh_required_psi
        cavitation_index = max(0.0, round((self.npsh_required_psi - npsh_avail) / self.npsh_required_psi, 2)) if is_cavitating else 0.0
        
        # Motor Current: proportional to hydraulic power + no load
        # P_hyd ~ Q * Head
        head = p_discharge - p_suction
        motor_amps = round(18.0 + (q_total * head * 0.0042) + (3.5 if is_cavitating else 0.0), 1)
        vibration = round(1.6 + (cavitation_index * 4.8), 2)
        
        q_display = round(q_total, 1)
        
        # Active alarms
        alarms = []
        pump_cond = AssetCondition.NORMAL
        strainer_cond = AssetCondition.NORMAL
        flow_cond = AssetCondition.NORMAL
        
        if q_display < 65.0:
            flow_cond = AssetCondition.CRITICAL
            alarms.append(f"FT-101 CRITICAL LOW-FLOW: {q_display} GPM (Setpoint 100 GPM)")
        elif q_display < 90.0:
            flow_cond = AssetCondition.ALERT
            alarms.append(f"FT-101 LOW-FLOW: {q_display} GPM")
            
        if dp_strainer > 8.0:
            strainer_cond = AssetCondition.CRITICAL
            # Note: Brownfield local indicator! Commander only sees consequence in flow & suction pressure
        elif dp_strainer > 4.0:
            strainer_cond = AssetCondition.ALERT

        if is_cavitating:
            pump_cond = AssetCondition.ALERT
            alarms.append("P-101 ACOUSTIC VIBRATION: Cavitation Inception Detected")

        # Deterministic Sustained Recovery Check
        if self.incident_active:
            if 95.0 <= q_display <= 105.0 and not is_cavitating:
                self.sustained_healthy_ticks += 1
                if self.sustained_healthy_ticks >= self.required_recovery_ticks:
                    self.incident_status = "RESOLVED"
                else:
                    self.incident_status = "RECOVERING"
            else:
                self.sustained_healthy_ticks = 0
                if self.incident_status != "RESOLVED":
                    self.incident_status = "INVESTIGATING"

        snapshot = TelemetrySnapshot(
            tick=self.tick_count,
            pump=PumpState(
                running=True,
                rpm=2950.0,
                motor_amps=motor_amps,
                vibration_mm_s=vibration,
                cavitation_index=cavitation_index,
                is_cavitating=is_cavitating,
                condition=pump_cond
            ),
            strainer=StrainerState(
                differential_pressure_psi=dp_strainer,
                clog_percentage=self.strainer_clog_pct,
                condition=strainer_cond
            ),
            bypass_valve=ValveState(
                position_pct=self.bypass_valve_pct,
                condition=AssetCondition.NORMAL if self.bypass_valve_pct == 0 else AssetCondition.WARNING
            ),
            flow_meter=FlowTransmitter(
                flow_gpm=q_display,
                condition=flow_cond
            ),
            suction_pressure=PressureTransmitter(
                tag="PT-101",
                name="Suction Pressure",
                pressure_psi=round(p_suction, 2),
                nominal_psi=14.5,
                condition=AssetCondition.ALERT if p_suction < 10.0 else AssetCondition.NORMAL
            ),
            discharge_pressure=PressureTransmitter(
                tag="PT-102",
                name="Discharge Pressure",
                pressure_psi=round(p_discharge, 2),
                nominal_psi=70.0,
                condition=AssetCondition.NORMAL
            ),
            incident_active=self.incident_active,
            incident_status=self.incident_status,
            sustained_recovery_seconds=self.sustained_healthy_ticks,
            active_alarms=alarms
        )
        return snapshot

# Singleton engine instance
sim_engine = HydraulicSimulationEngine()
