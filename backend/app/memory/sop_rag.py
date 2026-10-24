from typing import List, Dict, Any

PLANT_SOPS = [
    {
        "id": "SOP-PR-04",
        "title": "Centrifugal Pump Low-Flow & Suction Restriction Troubleshooting",
        "category": "Standard Operating Procedure",
        "sections": {
            "1.0 Symptoms": "Discharge flow meter FT-101 registers < 65% of nominal setpoint (100 gpm) while pump motor remains energized.",
            "2.0 Initial Diagnostic Phase": "Do not trip pump immediately if discharge pressure is stable. Visually inspect suction duplex strainer F-17 local differential pressure indicator (dP). Clean condition is <= 2.0 psi; restriction threshold is >= 8.0 psi.",
            "3.0 Bounded Bypass Engagement": "If strainer dP indicates severe fouling, manual bypass valve BV-104 may be probed in increments of 10% to 25% to verify flow recovery without pump starvation. Confirm position mechanically.",
            "4.0 End-State Verification": "Full flow bypass (100% OPEN) requires physical verification photo of the valve indicator dial before placing incident into recovery monitoring.",
            "5.0 Safety Rules": "Wear Class 2 eye protection and high-vis safety vest. Never lean over rotating shaft guards. Verify line equalization prior to full valve stroke."
        }
    },
    {
        "id": "OEM-P101-MANUAL",
        "title": "Goulds Model 3196 Centrifugal Pump Operations & Maintenance",
        "category": "OEM Equipment Manual",
        "sections": {
            "NPSH Requirements": "Minimum NPSHr is 4.2 psi. Suction pressure below liquid vapor pressure causes immediate bubble formation and impeller pitting.",
            "Acoustic Characteristics": "Normal pump hum is dominated by 60Hz motor tone and 196Hz blade pass. Cavitation manifests as high-frequency crackle/rattle (4-8 kHz), sounding like pumping gravel."
        }
    }
]

class SOPKnowledgeRAG:
    """
    Standard Operating Procedure & OEM Manual Retrieval Engine.
    Provides authoritative, citation-grounded guidance for the planning agent.
    """
    def retrieve_relevant_procedures(self, query: str) -> List[Dict[str, Any]]:
        # In brownfield troubleshooting, we return matched SOP excerpts
        results = []
        for sop in PLANT_SOPS:
            results.append(sop)
        return results

    def format_context_for_prompt(self, asset_tag: str) -> str:
        sops = self.retrieve_relevant_procedures(asset_tag)
        formatted = "--- OFFICIAL PLANT SOPS & OEM PROCEDURES ---\n"
        for s in sops:
            formatted += f"[{s['id']}] {s['title']} ({s['category']}):\n"
            for sec_name, sec_text in s["sections"].items():
                formatted += f"  - {sec_name}: {sec_text}\n"
        return formatted

sop_rag = SOPKnowledgeRAG()
