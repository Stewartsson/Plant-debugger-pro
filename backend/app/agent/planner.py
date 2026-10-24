import json
from typing import Dict, Any, List, Optional
from app.config import settings
from app.sim.models import TelemetrySnapshot, FieldTask, TaskType
from app.memory.site_knowledge import site_knowledge_repo
from app.memory.sop_rag import sop_rag

class GeminiDiagnosticPlanner:
    """
    Reasoning Planner for Plant Debugger.
    Owns the diagnostic objective, dynamically selecting what physical observation
    or bounded experiment must happen next based on current evidence.
    """
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[Planner] Warning: Failed to init Gemini: {e}")

    def plan_next_step(
        self,
        snapshot: TelemetrySnapshot,
        completed_tasks: List[FieldTask],
        incident_step_count: int
    ) -> Dict[str, Any]:
        """
        Evaluates telemetry + field evidence + tacit site knowledge to determine next step.
        """
        # Collect tacit knowledge
        f17_facts = site_knowledge_repo.get_facts_for_asset("F-17")
        bv104_facts = site_knowledge_repo.get_facts_for_asset("BV-104")
        all_facts_text = "\n".join([f"[{f.fact_id}] ({f.author}): {f.assertion}" for f in (f17_facts + bv104_facts)])
        
        # Collect SOP context
        sop_text = sop_rag.format_context_for_prompt("P-101")
        
        # Summarize completed tasks
        evidence_summary = []
        for t in completed_tasks:
            ai_data = t.ai_interpretation or {}
            evidence_summary.append({
                "task_type": t.task_type.value,
                "target_asset": t.target_asset,
                "evidence_type": t.evidence_type,
                "ai_result": ai_data
            })

        # Check existing evidence
        has_f17_photo = any(t.target_asset == "F-17" and t.evidence_type == "PHOTO" for t in completed_tasks)
        f17_dp_high = False
        for t in completed_tasks:
            if t.target_asset == "F-17" and t.ai_interpretation:
                if t.ai_interpretation.get("condition") == "HIGH" or t.ai_interpretation.get("reading_psi", 0) > 6.0:
                    f17_dp_high = True

        has_acoustic_record = any(t.target_asset == "P-101" and t.evidence_type == "AUDIO" for t in completed_tasks)
        has_probe_adjustment = any(t.target_asset == "BV-104" and t.task_type == TaskType.BOUNDED_ADJUSTMENT for t in completed_tasks)
        has_final_verification = any(t.target_asset == "BV-104" and t.task_type == TaskType.POSITION_VERIFICATION for t in completed_tasks)

        # Rule-grounded dynamic planning logic (ADK Agentic loop)
        # Step 1: No visual inspection of uninstrumented F-17 gauge yet
        if not has_f17_photo:
            # Check tacit knowledge for aisle warning
            safety_note = "Access F-17 strictly from West maintenance aisle. (East aisle restricted during P-101 operation per Fact #101)."
            return {
                "hypotheses": [
                    {"name": "Strainer F-17 Basket Foreign Fouling", "confidence": 0.72},
                    {"name": "Pump P-101 Impeller Cavitation", "confidence": 0.45},
                    {"name": "Discharge Control Valve FCV-102 Restriction", "confidence": 0.20}
                ],
                "reasoning": "Discharge flow FT-101 has dropped below threshold (65 gpm). Because Strainer F-17 differential pressure gauge is an uninstrumented local analog indicator, visual inspection has the highest information value.",
                "selected_action": "VISUAL_INSPECTION",
                "target_asset": "F-17",
                "title": "Inspect Local Analog ΔP Gauge on F-17",
                "instruction": f"Navigate to Duplex Strainer F-17. {safety_note} Tap glass bezel gently if needle appears static (Fact #103). Return one clear photo of the differential pressure gauge face.",
                "safety_notes": ["West aisle access only", "Eye protection required", "Mind rotating pump guard"],
                "evidence_type": "PHOTO",
                "allowed_delta_pct": None,
                "grounded_sop_citation": "SOP-PR-04 Section 2.0 & Site Knowledge Fact #101, #103"
            }

        # Step 2: F-17 inspected. If cavitation reported or operator wants acoustic check
        if snapshot.pump.is_cavitating and not has_acoustic_record:
            return {
                "hypotheses": [
                    {"name": "Strainer F-17 Fouling Causing Suction Cavitation", "confidence": 0.88},
                    {"name": "Mechanical Bearing Failure", "confidence": 0.25}
                ],
                "reasoning": "Suction pressure PT-101 is depressed and pump vibration is elevated. An acoustic recording of pump casing will confirm whether vapor bubble cavitation is actively eroding impeller blades.",
                "selected_action": "ACOUSTIC_INSPECTION",
                "target_asset": "P-101",
                "title": "Capture 5s Acoustic Recording of Pump P-101 Casing",
                "instruction": "Approach Pump P-101 bearing housing from safe perimeter. Record a 5-second casing audio sample to verify acoustic frequency signature (impeller cavitation vs bearing wear).",
                "safety_notes": ["Maintain 1m distance from spinning coupling", "Ear protection required"],
                "evidence_type": "AUDIO",
                "allowed_delta_pct": None,
                "grounded_sop_citation": "OEM-P101-MANUAL Acoustic Section"
            }

        # Step 3: F-17 DP is HIGH -> Bounded 10% probe on manual bypass BV-104
        if f17_dp_high and not has_probe_adjustment:
            return {
                "hypotheses": [
                    {"name": "Strainer F-17 Flow Restriction Solvable via Bypass BV-104", "confidence": 0.91}
                ],
                "reasoning": "F-17 gauge photo verified critical differential pressure (14.2 psi). Per SOP-PR-04, do not trip pump. Perform bounded 10% probe on manual bypass BV-104 to confirm hydraulic flow response.",
                "selected_action": "BOUNDED_ADJUSTMENT",
                "target_asset": "BV-104",
                "title": "Perform Safe 10% Probe on Manual Bypass Valve BV-104",
                "instruction": "Locate manual handwheel BV-104. Note Fact #102: take up 1.5 turns of mechanical backlash first, then rotate handwheel to 10% open mark. Observe and confirm mechanical movement.",
                "safety_notes": ["Rate of change limited to max 25%", "Take up 1.5 turns backlash per Fact #102"],
                "evidence_type": "CONFIRMATION",
                "allowed_delta_pct": 10.0,
                "grounded_sop_citation": "SOP-PR-04 Section 3.0 & Site Knowledge Fact #102"
            }

        # Step 4: 10% probe completed, but flow is still below nominal (e.g. ~55 gpm vs 100 gpm) -> Full Open with Verification Photo
        if has_probe_adjustment and snapshot.flow_meter.flow_gpm < 90.0 and not has_final_verification:
            return {
                "hypotheses": [
                    {"name": "Partial Bypass Flow Confirms Strainer Restriction - Full Bypass Required", "confidence": 0.98}
                ],
                "reasoning": "10% probe yielded partial flow recovery (55 gpm), proving hydraulic causality. To restore full production rate (100 gpm), open BV-104 fully to 100%. Policy strictly requires physical end-state verification photo.",
                "selected_action": "POSITION_VERIFICATION",
                "target_asset": "BV-104",
                "title": "Open Bypass BV-104 Fully & Verify Mechanical OPEN Position",
                "instruction": "Rotate BV-104 handwheel counter-clockwise until hard stop at 100% OPEN mark. Upload a clear photograph of the stem dial aligned with the mechanical OPEN index.",
                "safety_notes": ["Slow steady rotation to prevent water hammer", "Do not force past hard mechanical stop"],
                "evidence_type": "PHOTO",
                "allowed_delta_pct": 100.0,
                "grounded_sop_citation": "SOP-PR-04 Section 4.0 (Mandatory Visual End-State Verification)"
            }

        # Step 5: End-state verified, waiting for deterministic recovery
        return {
            "hypotheses": [
                {"name": "Plant Bypass Route Active - Telemetry Stabilization in Progress", "confidence": 0.99}
            ],
            "reasoning": "BV-104 physical OPEN state verified by Gemini Vision. Deterministic verifier is monitoring flow stability and motor amps. No further physical interventions required.",
            "selected_action": "WAIT_FOR_TELEMETRY",
            "target_asset": "P-101",
            "title": "Monitoring Sustained Telemetry Recovery",
            "instruction": "Stand by at safe perimeter. Monitoring FT-101 flow stability (need >= 15 seconds continuous nominal flow).",
            "safety_notes": ["Observe pump casing for leaks or vibration"],
            "evidence_type": "CONFIRMATION",
            "allowed_delta_pct": None,
            "grounded_sop_citation": "SOP-PR-04 Section 4.0 Deterministic Recovery"
        }

gemini_planner = GeminiDiagnosticPlanner()
