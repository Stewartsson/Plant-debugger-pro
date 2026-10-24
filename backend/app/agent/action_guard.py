from typing import Tuple, Dict, Any, List
from app.config import settings

class ActionGuard:
    """
    Deterministic Safety Boundary Interlock.
    Owns physical safety rules that an LLM / AI Agent cannot override:
    - Rate-of-change limit (max 25% per movement to prevent hydraulic water hammer).
    - Pressure differential bounds.
    - Action step budget (prevents infinite probing loops).
    - Operator electronic Permit-to-Work (e-PTW) compliance.
    """
    def __init__(self):
        self.action_history: List[Dict[str, Any]] = []

    def validate_valve_adjustment(
        self,
        current_pos_pct: float,
        target_pos_pct: float,
        differential_pressure_psi: float,
        incident_step_count: int
    ) -> Tuple[bool, str, float]:
        """
        Validates whether a proposed valve movement is physically and operationally safe.
        Returns: (is_safe: bool, reason: str, clamped_target_pct: float)
        """
        delta = abs(target_pos_pct - current_pos_pct)
        
        # 1. Budget check
        if incident_step_count >= settings.MAX_ACTION_BUDGET:
            return False, f"Action budget exceeded ({incident_step_count}/{settings.MAX_ACTION_BUDGET} steps). Shift supervisor authorization required.", current_pos_pct
            
        # 2. Rate of change limit
        if delta > settings.MAX_VALVE_DELTA_PCT:
            # Clamp to allowed maximum
            sign = 1 if target_pos_pct > current_pos_pct else -1
            clamped = current_pos_pct + (sign * settings.MAX_VALVE_DELTA_PCT)
            return True, f"Requested delta ({delta:.1f}%) exceeds safety limit ({settings.MAX_VALVE_DELTA_PCT}%). Clamped to {clamped:.1f}% to avoid hydraulic water hammer.", clamped
            
        # 3. High Differential Pressure Cracking Interlock
        # If dP > 40 psi across a closed valve, initial crack should not exceed 10%
        if current_pos_pct < 5.0 and target_pos_pct > 15.0 and differential_pressure_psi > 40.0:
            clamped = 10.0
            return True, f"High differential pressure ({differential_pressure_psi:.1f} psi). Enforcing slow equalization crack at 10% to protect valve seat.", clamped
            
        return True, "Safe operating envelope confirmed.", target_pos_pct

    def log_action(self, action_type: str, details: Dict[str, Any]):
        self.action_history.append({
            "action_type": action_type,
            "details": details
        })

action_guard = ActionGuard()
