from typing import List, Optional
from datetime import datetime
from app.sim.models import SiteKnowledgeFact

class SiteKnowledgeRepository:
    """
    Conservative Tacit Knowledge Store.
    Only explicit human assertions become permanent plant knowledge.
    AI diagnoses or temporary test outcomes are NEVER silently promoted to permanent knowledge.
    """
    def __init__(self):
        self._facts: List[SiteKnowledgeFact] = [
            SiteKnowledgeFact(
                fact_id="FACT-101",
                asset_tag="F-17",
                assertion="Strainer F-17 is accessed from the west maintenance aisle. East-side access is restricted while P-101 is running due to rotating shaft guard clearance.",
                author="Chief Operator Dave Miller (Badge #4092)",
                created_at=datetime(2026, 8, 14, 9, 30),
                verified=True,
                context_tags=["safety", "access", "F-17", "aisle"]
            ),
            SiteKnowledgeFact(
                fact_id="FACT-102",
                asset_tag="BV-104",
                assertion="Bypass valve BV-104 handwheel has approximately 1.5 dead-turns of mechanical backlash before the internal throttle disc begins lifting off seat.",
                author="Lead Millwright Elena Rostova (Badge #3188)",
                created_at=datetime(2026, 9, 2, 14, 15),
                verified=True,
                context_tags=["valve", "calibration", "BV-104", "backlash"]
            ),
            SiteKnowledgeFact(
                fact_id="FACT-103",
                asset_tag="F-17",
                assertion="Local DP gauge indicator needle can occasionally stick on cold mornings; tap glass bezel gently with index finger before taking final visual reading.",
                author="Operator Sam Chen (Badge #5112)",
                created_at=datetime(2026, 9, 28, 7, 45),
                verified=True,
                context_tags=["gauge", "instrumentation", "F-17"]
            )
        ]

    def get_all_facts(self) -> List[SiteKnowledgeFact]:
        return list(self._facts)

    def get_facts_for_asset(self, asset_tag: str) -> List[SiteKnowledgeFact]:
        return [f for f in self._facts if f.asset_tag.upper() == asset_tag.upper()]

    def add_fact(self, asset_tag: str, assertion: str, author: str, tags: Optional[List[str]] = None) -> SiteKnowledgeFact:
        fact = SiteKnowledgeFact(
            fact_id=f"FACT-{len(self._facts) + 101}",
            asset_tag=asset_tag,
            assertion=assertion,
            author=author,
            created_at=datetime.utcnow(),
            verified=True,
            context_tags=tags or []
        )
        self._facts.append(fact)
        return fact

site_knowledge_repo = SiteKnowledgeRepository()
