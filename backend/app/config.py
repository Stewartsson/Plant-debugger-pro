import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
EVIDENCE_DIR = STORAGE_DIR / "evidence"
AUDIO_DIR = STORAGE_DIR / "audio"

EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "Plant Debugger Pro"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    SIMULATION_TICK_SECONDS: float = 1.0
    
    BASE_DIR: Path = BASE_DIR
    EVIDENCE_PATH: Path = EVIDENCE_DIR
    AUDIO_PATH: Path = AUDIO_DIR
    
    # Safety bounds
    MAX_VALVE_DELTA_PCT: float = 25.0  # Max single move to prevent water hammer
    MAX_ACTION_BUDGET: int = 5         # Max steps before supervisor escalation
    MIN_SUSTAINED_RECOVERY_SECONDS: int = 15  # Deterministic stability requirement

settings = Settings()
