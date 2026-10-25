from fastapi import APIRouter
from app.verification.audit_trail import audit_trail

router = APIRouter(prefix="/audit", tags=["Cryptographic Audit Trail"])

@router.get("")
def get_audit_trail():
    """
    Returns the unified, immutable Audit Trail ledger.
    Every event contains an incremental SHA-256 block hash linked to its predecessor.
    """
    ledger = audit_trail.get_ledger()
    integrity = audit_trail.verify_integrity()
    return {
        "integrity": integrity,
        "total_records": len(ledger),
        "ledger": ledger
    }

@router.get("/verify")
def verify_audit_trail_integrity():
    """
    Traverses the cryptographic chain from genesis to head block,
    validating payload signatures and tamper-resistance.
    """
    return audit_trail.verify_integrity()
