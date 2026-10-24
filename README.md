# Plant Debugger Pro
### *The Last Meter Has No API: Physical Operator + Google ADK Autonomous Diagnostic Platform*

Plant Debugger Pro bridges the gap between central automation (DCS/SCADA) and physical brownfield reality. In operating industrial facilities, the critical observations and actions needed for troubleshooting—analog differential pressure gauges, manual bypass valves, pump acoustic emissions, and aisle clearance constraints—remain outside digital APIs.

Rather than treating human operators as passive approval-button clickers, Plant Debugger Pro uses **Google ADK + Gemini** to dynamically own the diagnostic objective, pausing execution (`RequestInput -> PAUSE`) when physical evidence is required, and resuming (`FunctionResponse -> RESUME`) to re-plan.

---

## 🌟 Key Advancements in Plant Debugger Pro

1. **Tri-Modal Sensory Diagnostics ("Ears & Eyes in the Field")**:
   - **Analog Gauge Vision**: Gemini reads local uninstrumented $\Delta P$ needle gauges on duplex strainers with bounding boxes and zone classification.
   - **Mechanical Valve Verification**: Vision-verified stem dial positions for manual handwheel bypass valves (`BV-104`).
   - **Acoustic Audio Diagnostic**: Gemini Audio evaluates 5-second pump casing audio recordings to detect impeller cavitation (4-8 kHz bubble collapse crackle) vs. bearing dry-run vs. laminar flow.
2. **Real-Time Hydraulic & Acoustic Physics Engine (`plant-sim`)**:
   - Discrete 1 Hz hydraulic equations: Bernoulli & Darcy-Weisbach flow resistance, pump affinity head-flow curves ($H$-$Q$), Net Positive Suction Head ($NPSH_A$ vs $NPSH_R$), and dynamic 44.1 kHz PCM audio synthesis.
3. **Digital Permit-to-Work (e-PTW) & ActionGuard 2.0**:
   - Deterministic safety interlocks: Rate-of-change clamping (max $\Delta 25\%$ to prevent water hammer), differential pressure cracking thresholds, and step budgets.
4. **Dual-Memory Engine (Tacit Site Knowledge + Plant SOP RAG)**:
   - Conservative human assertions (never hallucinated) combined with standard operating procedures (`SOP-PR-04`), grounding work orders in both institutional knowledge and field realities.
5. **Interactive Animated P&ID Canvas**:
   - Live fluid particle animation (cyan for nominal flow, red/amber for restrictions, dynamic diversion when bypass opens) and real-time instrumentation overlays.
6. **Automated Post-Incident 5-Why RCA & CMMS Work Order**:
   - Upon deterministic recovery verification ($\ge 15\text{s}$ nominal flow), automatically generates a 5-Why Root Cause Analysis and SAP PM / IBM Maximo maintenance order.

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Node.js 18+ & npm

### 2. Run the Full Application (Single Port)
The production frontend has already been built and is served directly by the backend:
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

### 3. Or Run in Development Mode (Live Hot-Reload)
**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
**Frontend:**
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

### 4. Run the Automated 11-Stage End-to-End Test Suite
```bash
cd backend
python test_e2e_cycle.py
```

---

## 🏭 Live Demonstration Walkthrough

1. **Observe Baseline**: Notice the animated P&ID canvas flowing cyan liquid at nominal 100 GPM.
2. **Inject Fault**: In the Commander Console, click **"Inject 85% Strainer Clog"**.
3. **Anomaly Detected**: Discharge flow `FT-101` drops to ~40 GPM; cavitation alarms trip on pump `P-101`.
4. **ADK Dynamic Pause**: ADK pauses execution on Step 1: *Inspect Local Analog $\Delta P$ Gauge on F-17* (grounded in Site Knowledge Fact #101: West aisle access).
5. **Field Operator Mode**: Switch role to **"Field Operator"** in the top bar. Click *"📷 Strainer F-17 Gauge - High ΔP (14.2 psi)"* and tap **"Submit Evidence & Resume ADK"**.
6. **Acoustic Diagnostic**: Gemini Vision identifies high dP ($14.2 \text{ psi}$); ADK notices suction depression and dispatches an *Acoustic Casing Sample*. Click *"Record from Pump Contact Sensor"* and submit.
7. **Bounded Adjustment**: ADK commands a safe 10% probe on manual handwheel `BV-104`. Operator sets 10% on the slider and confirms. Flow partially recovers to ~52 GPM, proving hydraulic causality.
8. **End-State Verification**: ADK commands full 100% bypass with mandatory verification photo. Select *"📷 Bypass BV-104 - 100% Fully OPEN"* and submit.
9. **Deterministic Recovery**: Telemetry recovers to 100 GPM. The deterministic verifier counts 15 seconds of sustained stability, then marks the incident as **RESOLVED**.
10. **RCA & CMMS Report**: The post-incident modal appears with a 5-Why Root Cause Analysis and SAP PM Work Order (`WO-PM-2026-F17-094`).
