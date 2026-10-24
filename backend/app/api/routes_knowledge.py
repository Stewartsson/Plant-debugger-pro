from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.memory.site_knowledge import site_knowledge_repo
from app.memory.sop_rag import PLANT_SOPS

router = APIRouter(prefix="/knowledge", tags=["Site Knowledge & SOPs"])

class NewFactRequest(BaseModel):
    asset_tag: str
    assertion: str
    author: str
    tags: Optional[List[str]] = None

@router.get("/facts")
def get_site_facts():
    return site_knowledge_repo.get_all_facts()

@router.post("/facts")
def add_site_fact(req: NewFactRequest):
    fact = site_knowledge_repo.add_fact(
        asset_tag=req.asset_tag,
        assertion=req.assertion,
        author=req.author,
        tags=req.tags
    )
    return {
        "status": "FACT_RECORDED",
        "fact": fact
    }

@router.get("/sops")
def get_plant_sops():
    return PLANT_SOPS
