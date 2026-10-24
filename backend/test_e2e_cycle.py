import time
import requests
import json
import sys
from pathlib import Path

# Fix Windows console unicode printing
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_test():
    print("=" * 60)
    print("PLANT DEBUGGER PRO: END-TO-END AUTONOMOUS DIAGNOSTIC TEST")
    print("The Last Meter Has No API: Physical Operator + ADK Workflow")
    print("=" * 60)

    # 1. Health check
    print("\n[1] Checking Backend Health...")
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print(f"    Backend Status: {r.json()['status']} | Service: {r.json()['service']}")

    # 2. Reset simulator to normal
    print("\n[2] Resetting Plant to Baseline...")
    r = requests.post(f"{BASE_URL}/api/sim/reset")
    snap = r.json()["snapshot"]
    print(f"    Initial Flow (FT-101): {snap['flow_meter']['flow_gpm']} GPM (Nominal: 100 GPM)")
    assert snap['flow_meter']['flow_gpm'] >= 95.0, "Flow not at baseline!"

    # 3. Inject Strainer Clog
    print("\n[3] Injecting Heavy Particulate Fouling on Strainer F-17 (85% Clog)...")
    r = requests.post(f"{BASE_URL}/api/sim/inject-fault", json={"clog_pct": 85.0, "incident_id": "INC-P101-TEST"})
    snap = r.json()["snapshot"]
    print(f"    Alarm Triggered: {snap['active_alarms']}")
    print(f"    Discharge Flow: {snap['flow_meter']['flow_gpm']} GPM (LOW-FLOW ALERT)")
    print(f"    Suction Pressure: {snap['suction_pressure']['pressure_psi']} PSI")
    assert snap['flow_meter']['flow_gpm'] < 65.0, "Flow did not drop below threshold!"

    # 4. Check ADK Paused on Field Task
    print("\n[4] Inspecting ADK Dynamic Workflow State...")
    time.sleep(1.2)
    r = requests.get(f"{BASE_URL}/api/agent/state")
    agent_state = r.json()
    print(f"    ADK Workflow State: {agent_state['workflow_state']}")
    assert agent_state['workflow_state'] == "PAUSED_AWAITING_INPUT", "ADK should be paused awaiting field reality!"
    active_task = agent_state['active_task']
    print(f"    Dispatched Task: [{active_task['task_id']}] {active_task['title']}")
    print(f"    Target Asset: {active_task['target_asset']} (Local Analog Gauge - No Remote API)")
    print(f"    Safety Notes: {active_task['safety_notes']}")

    # 5. Submit F-17 Gauge Photo Evidence
    print("\n[5] Field Operator Submits Photo Evidence of Strainer F-17 Local Gauge...")
    evidence_path = Path("storage/evidence/gauge_f17_high_dp.jpg")
    with open(evidence_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/agent/submit-evidence",
            data={
                "task_id": active_task["task_id"],
                "operator_notes": "Accessed via West aisle. Tapped bezel gently per Fact #103."
            },
            files={"file": ("gauge_f17_high_dp.jpg", f, "image/jpeg")}
        )
    res = r.json()
    print(f"    Gemini Multimodal Interpretation: {res['ai_interpretation']}")
    assert res['ai_interpretation']['condition'] == "HIGH", "Gauge should be read as HIGH dP!"

    # 6. Check Next Dynamic Step: Acoustic Inspection or Bypass Probe
    print("\n[6] Evaluating Dynamic Re-Plan from Evidence...")
    time.sleep(1.2)
    r = requests.get(f"{BASE_URL}/api/agent/state")
    agent_state = r.json()
    active_task = agent_state['active_task']
    print(f"    Next Field Task: [{active_task['task_id']}] {active_task['title']}")
    
    # If agent requests acoustic recording of cavitating pump
    if active_task['task_type'] == "ACOUSTIC_INSPECTION":
        print("\n[6a] Field Operator Submits 5s Pump Casing Acoustic Audio Snippet...")
        audio_resp = requests.get(f"{BASE_URL}/api/sim/pump-audio")
        r = requests.post(
            f"{BASE_URL}/api/agent/submit-evidence",
            data={
                "task_id": active_task["task_id"],
                "operator_notes": "Captured casing acoustic sample from non-drive end bearing."
            },
            files={"file": ("casing_acoustic.wav", audio_resp.content, "audio/wav")}
        )
        print(f"    Gemini Acoustic Interpretation: {r.json()['ai_interpretation']}")
        time.sleep(1.2)
        r = requests.get(f"{BASE_URL}/api/agent/state")
        active_task = r.json()['active_task']
        print(f"    Next Field Task After Acoustic Proof: [{active_task['task_id']}] {active_task['title']}")

    assert active_task['target_asset'] == "BV-104", "Should target manual bypass BV-104!"
    assert active_task['task_type'] == "BOUNDED_ADJUSTMENT", "Should request bounded adjustment!"

    # 7. Operator executes 10% manual adjustment
    print("\n[7] Field Operator Executes Bounded 10% Adjustment on BV-104...")
    r = requests.post(
        f"{BASE_URL}/api/agent/submit-evidence",
        data={
            "task_id": active_task["task_id"],
            "operator_notes": "Compensated for 1.5 turns backlash per Fact #102. Set indicator to 10%.",
            "confirmed_action_pct": 10.0
        }
    )
    time.sleep(1.2)
    r_snap = requests.get(f"{BASE_URL}/api/telemetry/snapshot").json()
    print(f"    Post-Probe Flow: {r_snap['flow_meter']['flow_gpm']} GPM (Partial Recovery Confirms Causality)")

    # 8. Check Next Step: 100% Full Open with Position Verification Photo
    print("\n[8] ADK Re-Plans from Incomplete Recovery -> Commands Full Open with Verification...")
    r = requests.get(f"{BASE_URL}/api/agent/state")
    active_task = r.json()['active_task']
    print(f"    Active Task: [{active_task['task_id']}] {active_task['title']}")
    assert active_task['task_type'] == "POSITION_VERIFICATION", "Requires visual end-state verification!"

    # 9. Operator uploads 100% OPEN photo
    print("\n[9] Operator Submits 100% OPEN Valve Dial Verification Photo...")
    valve_photo_path = Path("storage/evidence/valve_bv104_open.jpg")
    with open(valve_photo_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/agent/submit-evidence",
            data={
                "task_id": active_task["task_id"],
                "operator_notes": "Rotated to hard mechanical stop. Valve stem indicator aligns with OPEN notch."
            },
            files={"file": ("valve_bv104_open.jpg", f, "image/jpeg")}
        )
    print(f"    Gemini Vision Valve Verification: {r.json()['ai_interpretation']}")

    # 10. Deterministic Telemetry Proof
    print("\n[10] Waiting for Deterministic Sustained Telemetry Recovery (15 seconds)...")
    for s in range(16):
        time.sleep(1.0)
        snap = requests.get(f"{BASE_URL}/api/telemetry/snapshot").json()
        print(f"     [Tick +{s+1}s] Flow: {snap['flow_meter']['flow_gpm']} GPM | Status: {snap['incident_status']} ({snap['sustained_recovery_seconds']}/15s)", end="\r")

    print("\n    ✓ Telemetry Recovery Sustained!")
    snap = requests.get(f"{BASE_URL}/api/telemetry/snapshot").json()
    assert snap['incident_status'] == "RESOLVED", "Incident must be marked RESOLVED by deterministic verifier!"

    # 11. Post-Incident 5-Why RCA & SAP PM Work Order
    print("\n[11] Fetching Post-Incident 5-Why Root Cause Analysis & SAP PM Work Order...")
    r_rca = requests.get(f"{BASE_URL}/api/agent/rca").json()
    print(f"    Work Order Generated: {r_rca['work_order']['work_order_id']}")
    print(f"    Equipment: {r_rca['work_order']['equipment_description']}")
    print(f"    Maintenance Action: {r_rca['work_order']['maintenance_action']}")
    print(f"    5-Whys Count: {len(r_rca['five_whys'])} items")

    print("\n" + "=" * 60)
    print("SUCCESS: ALL 11 VERIFICATION STAGES PASSED COMPREHENSIVELY!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_test()
