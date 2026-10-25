import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.sim.engine import sim_engine
from app.agent.workflow import adk_host
from app.api.routes_sim import router as sim_router
from app.api.routes_telemetry import router as telemetry_router, ws_manager
from app.api.routes_agent import router as agent_router
from app.api.routes_knowledge import router as knowledge_router
from app.api.routes_pubsub import router as pubsub_router
from app.api.routes_audit import router as audit_router

# Background 1 Hz simulation tick task
async def simulation_background_loop():
    while True:
        try:
            snapshot = sim_engine.tick()
            
            # If an incident is active, let ADK evaluate if we transitioned to RESOLVED
            if sim_engine.incident_active:
                adk_host.run_cycle()

            # Broadcast to WebSocket clients
            await ws_manager.broadcast({
                "type": "TELEMETRY_UPDATE",
                "snapshot": snapshot.model_dump(mode="json"),
                "adk_state": adk_host.state
            })
        except Exception as e:
            print(f"[Simulation Loop Error]: {e}")
        await asyncio.sleep(settings.SIMULATION_TICK_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start simulation loop on startup
    sim_task = asyncio.create_task(simulation_background_loop())
    yield
    sim_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(sim_router, prefix=settings.API_PREFIX)
app.include_router(telemetry_router, prefix=settings.API_PREFIX)
app.include_router(agent_router, prefix=settings.API_PREFIX)
app.include_router(knowledge_router, prefix=settings.API_PREFIX)
app.include_router(pubsub_router, prefix=settings.API_PREFIX)
app.include_router(audit_router, prefix=settings.API_PREFIX)

# Static files for evidence and samples
app.mount("/evidence", StaticFiles(directory=str(settings.EVIDENCE_PATH)), name="evidence")

@app.get("/api/samples")
def list_sample_assets():
    """Returns available sample test evidence files for one-click testing."""
    return [
        {
            "id": "gauge_high",
            "name": "Strainer F-17 Gauge - High ΔP (14.2 psi)",
            "filename": "gauge_f17_high_dp.jpg",
            "type": "PHOTO",
            "target": "F-17",
            "url": "/evidence/gauge_f17_high_dp.jpg"
        },
        {
            "id": "gauge_normal",
            "name": "Strainer F-17 Gauge - Normal (1.8 psi)",
            "filename": "gauge_f17_normal.jpg",
            "type": "PHOTO",
            "target": "F-17",
            "url": "/evidence/gauge_f17_normal.jpg"
        },
        {
            "id": "valve_open",
            "name": "Bypass BV-104 - 100% Fully OPEN Verified",
            "filename": "valve_bv104_open.jpg",
            "type": "PHOTO",
            "target": "BV-104",
            "url": "/evidence/valve_bv104_open.jpg"
        },
        {
            "id": "valve_closed",
            "name": "Bypass BV-104 - CLOSED (0%)",
            "filename": "valve_bv104_closed.jpg",
            "type": "PHOTO",
            "target": "BV-104",
            "url": "/evidence/valve_bv104_closed.jpg"
        }
    ]


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "gemini_active": bool(settings.GEMINI_API_KEY)
    }

# Serve production frontend if built (MUST be mounted last so API routes take priority)
FRONTEND_DIST = settings.BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

