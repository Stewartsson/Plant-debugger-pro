import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.sim.models import (
    TelemetrySnapshot,
    FieldTask,
    TaskType,
    TaskStatus
)
from app.sim.engine import sim_engine
from app.agent.planner import gemini_planner
from app.agent.action_guard import action_guard
from app.agent.vision import gemini_vision
from app.agent.acoustic import gemini_acoustic
from app.verification.audit_trail import audit_trail
from app.storage.backends import state_backend

class ADKWorkflowState:
    IDLE = "IDLE"
    EVALUATING = "EVALUATING"
    PAUSED_AWAITING_INPUT = "PAUSED_AWAITING_INPUT"
    PROCESSING_EVIDENCE = "PROCESSING_EVIDENCE"
    RESUMED = "RESUMED"
    COMPLETED = "COMPLETED"

class ADKDynamicWorkflowHost:
    """
    Google ADK Resumable Workflow Host.
    Controls the dynamic diagnostic loop:
    (Plan -> RequestInput -> PAUSE -> Multimodal Evidence Ingestion -> FunctionResponse -> RESUME -> Re-Plan)
    """
    def __init__(self):
        self.state: str = ADKWorkflowState.IDLE
        self.current_incident_id: Optional[str] = None
        self.active_task: Optional[FieldTask] = None
        self.completed_tasks: List[FieldTask] = []
        self.decision_trace: List[Dict[str, Any]] = []
        self.step_counter: int = 0

    def start_incident(self, incident_id: str = "INC-P101-001"):
        self.current_incident_id = incident_id
        self.completed_tasks.clear()
        self.decision_trace.clear()
        self.step_counter = 0
        self.state = ADKWorkflowState.EVALUATING
        
        # Log initial trigger event in Decision Trace
        self._log_trace(
            step=1,
            phase="TELEMETRY_ALERT",
            title="Discharge Flow Anomaly Detected (FT-101)",
            details="Discharge flow meter FT-101 dropped below low threshold (32 gpm vs 100 gpm nominal). Pump P-101 motor is running. ADK workflow initialized.",
            status="TRIGGERED"
        )
        
        # Immediate initial plan
        self.run_cycle()

    def run_cycle(self):
        """Runs one planning pass if not paused."""
        if self.state == ADKWorkflowState.PAUSED_AWAITING_INPUT:
            return  # Waiting for physical reality to respond

        snapshot = sim_engine.get_current_snapshot()
        self.step_counter += 1
        
        # 1. Gemini Planner evaluates state
        plan = gemini_planner.plan_next_step(snapshot, self.completed_tasks, self.step_counter)
        
        action_type_str = plan["selected_action"]
        
        # If waiting for telemetry stabilization
        if action_type_str == "WAIT_FOR_TELEMETRY":
            self._log_trace(
                step=self.step_counter,
                phase="VERIFICATION_MONITORING",
                title="Awaiting Deterministic Telemetry Proof",
                details=plan["reasoning"],
                status="MONITORING"
            )
            self.active_task = None
            if snapshot.incident_status == "RESOLVED":
                self.state = ADKWorkflowState.COMPLETED
                self._log_trace(
                    step=self.step_counter + 1,
                    phase="RESOLVED",
                    title="Deterministic Recovery Sustained",
                    details=f"Flow FT-101 sustained healthy 100 GPM for > {sim_engine.required_recovery_ticks}s. Closed loop verified.",
                    status="RESOLVED"
                )
            return

        # Create new Field Task
        task_id = f"TASK-{uuid.uuid4().hex[:6].upper()}"
        task_type_enum = TaskType(action_type_str)
        
        task = FieldTask(
            task_id=task_id,
            task_type=task_type_enum,
            target_asset=plan["target_asset"],
            title=plan["title"],
            instruction=plan["instruction"],
            safety_notes=plan["safety_notes"],
            allowed_delta_pct=plan.get("allowed_delta_pct"),
            evidence_type=plan["evidence_type"],
            status=TaskStatus.PENDING
        )
        self.active_task = task
        
        # PAUSE workflow: Wait for field operator
        self.state = ADKWorkflowState.PAUSED_AWAITING_INPUT
        
        self._log_trace(
            step=self.step_counter,
            phase="REQUEST_INPUT_PAUSE",
            title=f"Field Task Dispatched: {task.title}",
            details=f"{plan['reasoning']} (Citations: {plan['grounded_sop_citation']}). Execution PAUSED until operator uploads evidence.",
            status="PAUSED",
            task=task.model_dump()
        )

    def submit_field_evidence(
        self,
        task_id: str,
        evidence_bytes: Optional[bytes] = None,
        evidence_filename: str = "",
        sha256_hash: str = "",
        operator_notes: str = "",
        confirmed_action_pct: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Receives evidence from Field Operator (FunctionResponse -> RESUME).
        Interprets evidence with Gemini Vision/Acoustic, updates simulator state, and resumes workflow.
        """
        if not self.active_task or self.active_task.task_id != task_id:
            return {"error": "Invalid or expired task ID"}

        task = self.active_task
        task.status = TaskStatus.IN_PROGRESS
        task.evidence_sha256 = sha256_hash
        task.operator_notes = operator_notes

        ai_result: Dict[str, Any] = {}

        # 1. Process Multimodal Evidence
        if task.evidence_type == "PHOTO" and evidence_bytes:
            if task.target_asset == "F-17":
                ai_result = gemini_vision.analyze_gauge_image(evidence_bytes, evidence_filename)
            elif task.target_asset == "BV-104":
                ai_result = gemini_vision.analyze_valve_position_image(evidence_bytes, evidence_filename)
        elif task.evidence_type == "AUDIO" and evidence_bytes:
            ai_result = gemini_acoustic.analyze_pump_audio(evidence_bytes)
        elif task.evidence_type == "CONFIRMATION":
            ai_result = {
                "action_executed": True,
                "confirmed_value_pct": confirmed_action_pct,
                "notes": operator_notes or "Operator completed physical movement"
            }

        task.ai_interpretation = ai_result

        # 2. Apply Physical Simulator updates if adjustment occurred
        if task.task_type == TaskType.BOUNDED_ADJUSTMENT and confirmed_action_pct is not None:
            # ActionGuard safety validation
            curr_pos = sim_engine.bypass_valve_pct
            is_safe, reason, safe_val = action_guard.validate_valve_adjustment(
                current_pos_pct=curr_pos,
                target_pos_pct=confirmed_action_pct,
                differential_pressure_psi=sim_engine.get_current_snapshot().strainer.differential_pressure_psi,
                incident_step_count=len(self.completed_tasks) + 1
            )
            sim_engine.set_bypass_valve(safe_val)
            task.operator_notes = f"{operator_notes} (ActionGuard: {reason})"
        elif task.task_type == TaskType.POSITION_VERIFICATION:
            if ai_result.get("position_state") == "OPEN":
                sim_engine.set_bypass_valve(100.0)

        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        self.completed_tasks.append(task)
        self.active_task = None

        # 3. RESUME workflow
        self.state = ADKWorkflowState.RESUMED
        self._log_trace(
            step=self.step_counter + 1,
            phase="FUNCTION_RESPONSE_RESUME",
            title=f"Evidence Received & Verified: {task.title}",
            details=f"SHA-256: {sha256_hash[:12]}... | AI Classification: {ai_result.get('condition') or ai_result.get('position_state') or ai_result.get('classification')}. Workflow RESUMED.",
            status="RESUMED",
            evidence=ai_result
        )

        # Trigger next cycle
        self.run_cycle()

        return {
            "status": "SUCCESS",
            "task_id": task_id,
            "ai_interpretation": ai_result,
            "next_state": self.state
        }

    def _log_trace(self, step: int, phase: str, title: str, details: str, status: str, **kwargs):
        entry = {
            "step": step,
            "timestamp": datetime.utcnow().isoformat(),
            "phase": phase,
            "title": title,
            "details": details,
            "status": status,
            **kwargs
        }
        self.decision_trace.append(entry)
        
        # Persist to Cryptographic Audit Trail
        audit_trail.record_event(
            event_type=f"ADK_{phase}",
            details=f"[{title}] {details}",
            payload={"step": step, "status": status, **kwargs},
            asset_tag=kwargs.get("task", {}).get("target_asset") if isinstance(kwargs.get("task"), dict) else None
        )

        # Persist checkpoint to state backend (Firestore / Local)
        if self.current_incident_id:
            state_backend.save_adk_checkpoint(
                session_id=self.current_incident_id,
                step=step,
                checkpoint_data=entry
            )

adk_host = ADKDynamicWorkflowHost()
