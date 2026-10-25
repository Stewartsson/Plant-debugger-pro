# Plant Debugger Pro
### *The Last Meter Has No API: Physical Operator + Google ADK Autonomous Diagnostic Platform*

Plant Debugger Pro bridges the gap between central automation (DCS/SCADA) and physical brownfield reality. In operating industrial facilities, the critical observations and actions needed for troubleshooting—analog differential pressure gauges, manual bypass valves, pump acoustic emissions, and aisle clearance constraints—remain outside digital APIs.

Rather than treating human operators as passive approval-button clickers, Plant Debugger Pro uses **Google ADK + Gemini** to dynamically own the diagnostic objective, pausing execution (`RequestInput -> PAUSE`) when physical evidence is required, and resuming (`FunctionResponse -> RESUME`) to re-plan.

---

## 🌟 Architecture & Key Advancements

1. **Google Cloud Pub/Sub Webhook (`/api/pubsub/anomaly`)**:
   - Simulator publishes events to Google Cloud Pub/Sub topic `plant-anomaly-events`.
   - Pushes with OIDC authentication to `/api/pubsub/anomaly`, recording a verified alert in the Audit Trail and kicking off ADK.
2. **Unified Cryptographic Audit Trail (`/api/audit`)**:
   - SHA-256 chained, tamper-evident block ledger recording every telemetry anomaly, ADK prompt, field evidence hash, and recovery proof.
3. **Pluggable GCP Persistence (Firestore & Cloud Storage)**:
   - Configurable via Devpost environment flags:
     ```bash
     DECISION_ENGINE=adk ADK_FALLBACK_POLICY=false ADK_SESSION_BACKEND=firestore VISION_ENGINE=gemini VISION_FALLBACK_POLICY=false FIELD_STATE_BACKEND=firestore FIELD_EVIDENCE_BACKEND=gcs
     ```
   - Supports both Google Cloud managed backends (Firestore + GCS) and resilient local in-memory fallbacks for zero-cloud testing.
4. **Isolated Private Simulator (`services/plant-sim/`)**:
   - Standalone microservice container for Cloud Run. Hidden fault labels remain strictly isolated from the ADK diagnostic planner.
5. **Tri-Modal Sensory Diagnostics ("Ears & Eyes in the Field")**:
   - **Analog Gauge Vision**: Gemini reads local uninstrumented $\Delta P$ needle gauges on duplex strainers with bounding boxes.
   - **Mechanical Valve Verification**: Vision-verified stem dial positions for manual handwheel bypass valves (`BV-104`).
   - **Acoustic Audio Diagnostic**: Gemini Audio evaluates 5-second pump casing audio recordings to detect impeller cavitation (4-8 kHz bubble collapse crackle) vs. normal laminar hum.
6. **Real-Time Hydraulic & Acoustic Physics Engine**:
   - Discrete 1 Hz hydraulic equations: Bernoulli & Darcy-Weisbach flow resistance, pump affinity head-flow curves ($H$-$Q$), Net Positive Suction Head ($NPSH_A$ vs $NPSH_R$), and dynamic 44.1 kHz PCM audio synthesis.
7. **Digital Permit-to-Work (e-PTW) & ActionGuard 2.0**:
   - Deterministic safety interlocks: Rate-of-change clamping (max $\Delta 25\%$ to prevent water hammer), differential pressure cracking thresholds, and step budgets.
8. **Dual-Memory Engine (Tacit Site Knowledge + Plant SOP RAG)**:
   - Conservative human assertions (never hallucinated) combined with standard operating procedures (`SOP-PR-04`), grounding work orders in both institutional knowledge and field realities.
9. **Interactive Animated P&ID Canvas**:
   - Live fluid particle animation (cyan for nominal flow, red/amber for restrictions, dynamic diversion when bypass opens) and real-time instrumentation overlays.
10. **Automated Post-Incident 5-Why RCA & CMMS Work Order**:
    - Upon deterministic recovery verification ($\ge 15\text{s}$ nominal flow), automatically generates a 5-Why Root Cause Analysis and SAP PM / IBM Maximo maintenance order (`WO-PM-2026-F17-094`).

---

## 🏗️ Google Cloud Architecture

```
[Users & Plant Edge]
  ├── Commander Console (Operations Lead)
  ├── Field Operator Mobile Companion (Glove-Friendly)
  └── Plant Edge: P-101 (Pump), F-17 (Strainer), BV-104 (Bypass), FT-101 (Flow)

[Public Application Layer - Cloud Run: plant-debugger]
  ├── Commander UI & Operator Mobile UI (React + Tailwind)
  ├── FastAPI REST & WebSocket Server (1 Hz Telemetry)
  ├── Google ADK Workflow Host (Resumable Dynamic State Machine)
  └── Evidence Ingestion & Cryptographic Audit Ledger

[Private Simulation Layer - Cloud Run: plant-sim]
  ├── Physics Dynamics & Hydraulic Equations
  ├── Hidden Fault Label Isolation
  └── Cloud Pub/Sub Anomaly Publisher (plant-anomaly-events)

[AI & Reasoning Layer - Vertex AI & Gemini]
  ├── Gemini Planner (Hypothesis Generation & SOP Grounding)
  ├── Gemini Vision (Analog Gauge & Valve Dial Verification)
  └── Gemini Audio (Acoustic Cavitation Analysis)

[Google Cloud Data Layer]
  ├── Firestore (Field Ops State, ADK Sessions & Site Knowledge)
  ├── Cloud Storage (SHA-256 Sealed Field Evidence Photos)
  ├── Cloud Pub/Sub (plant-anomaly-events with OIDC Push)
  └── Secret Manager (Credentials & API Keys)
```

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Node.js 18+ & npm
- Docker (optional)
- Google Cloud SDK (optional for GCP deployment)

### 2. Run Locally (Single Port)
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

### 3. Run with Docker Compose (Both Microservices)
```bash
docker-compose up --build
```
- Plant Debugger: `http://localhost:8000`
- Plant Simulator: `http://localhost:8001`

### 4. Run the Automated 13-Stage Verification Suite
```bash
cd backend
python test_e2e_cycle.py
```

### 5. Deploy to Google Cloud Run (Terraform or Script)
```bash
# Via One-Click Script
./deploy-gcp.sh

# Or via Terraform
cd terraform
terraform init
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

---

## 🧪 13-Stage Verification Walkthrough

Run `python backend/test_e2e_cycle.py` to verify the full autonomous lifecycle:
1. **Health Check**: Validates `/api/health`.
2. **Baseline State**: Confirms nominal flow (100 GPM) on `FT-101`.
3. **Fault Injection**: Injects 85% particulate restriction on `F-17`.
4. **ADK Dynamic Pause**: Enters `PAUSED_AWAITING_INPUT` on uninstrumented `F-17` gauge.
5. **Gauge Vision**: Gemini Vision reads needle ($14.2 \text{ psi}$ HIGH restriction).
6. **Acoustic Diagnostic**: Gemini Audio analyzes pump casing WAV; detects cavitation ($4.8\text{--}7.5 \text{ kHz}$).
7. **Bounded Experimentation**: Operator adjusts `BV-104` to 10%; flow partially recovers ($52 \text{ GPM}$).
8. **Incomplete Recovery Dynamic Plan**: ADK commands 100% full open with verification photo.
9. **Valve Position Verification**: Gemini Vision verifies physical `100% OPEN` notch.
10. **Deterministic Telemetry Recovery**: Verifier counts 15s sustained nominal flow $\rightarrow$ `RESOLVED`.
11. **RCA & CMMS Generation**: Produces 5-Why Analysis and SAP PM Work Order.
12. **Cryptographic Audit Trail**: Validates SHA-256 block ledger with 0 tampering.
13. **Cloud Pub/Sub Push Ingestion**: Verifies `/api/pubsub/anomaly` OIDC webhook delivery.
