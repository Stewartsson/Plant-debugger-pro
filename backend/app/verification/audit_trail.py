import hashlib
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

class AuditTrailEvent:
    def __init__(
        self,
        event_id: str,
        timestamp: str,
        event_type: str,
        details: str,
        payload: Dict[str, Any],
        asset_tag: Optional[str] = None,
        prev_hash: str = "0" * 64
    ):
        self.event_id = event_id
        self.timestamp = timestamp
        self.event_type = event_type
        self.details = details
        self.payload = payload
        self.asset_tag = asset_tag
        self.prev_hash = prev_hash
        self.block_hash = self.compute_hash()

    def compute_hash(self) -> str:
        payload_str = json.dumps(self.payload, sort_keys=True, default=str)
        raw = f"{self.event_id}|{self.timestamp}|{self.event_type}|{self.asset_tag}|{self.details}|{payload_str}|{self.prev_hash}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "details": self.details,
            "asset_tag": self.asset_tag,
            "payload": self.payload,
            "prev_hash": self.prev_hash,
            "block_hash": self.block_hash
        }

class CryptographicAuditTrail:
    """
    Unified Immutable Audit Trail for Industrial Incident Evidence.
    Maintains a cryptographically-chained SHA-256 ledger recording:
    - Pub/Sub anomaly deliveries with OIDC claims
    - ADK workflow pause/resume transitions
    - Field evidence photo/audio SHA-256 digests
    - ActionGuard boundary clamps
    - Deterministic recovery proofs
    """
    def __init__(self):
        self._chain: List[AuditTrailEvent] = []
        # Genesis block
        self._record_genesis()

    def _record_genesis(self):
        genesis = AuditTrailEvent(
            event_id="GENESIS-000000",
            timestamp=datetime.utcnow().isoformat(),
            event_type="AUDIT_TRAIL_INITIALIZED",
            details="Plant Debugger Pro Immutable Audit Ledger Genesis Block",
            payload={"system": "Plant Debugger Pro", "version": "2.0.0", "hash_algo": "SHA-256"},
            prev_hash="0" * 64
        )
        self._chain.append(genesis)

    def record_event(
        self,
        event_type: str,
        details: str,
        payload: Optional[Dict[str, Any]] = None,
        asset_tag: Optional[str] = None
    ) -> AuditTrailEvent:
        prev_hash = self._chain[-1].block_hash if self._chain else "0" * 64
        event = AuditTrailEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_type,
            details=details,
            payload=payload or {},
            asset_tag=asset_tag,
            prev_hash=prev_hash
        )
        self._chain.append(event)
        return event

    def get_ledger(self) -> List[Dict[str, Any]]:
        return [e.to_dict() for e in self._chain]

    def verify_integrity(self) -> Dict[str, Any]:
        """
        Traverses the full chain to verify that no historical entry, timestamp,
        or evidence hash has been modified or tampered with.
        """
        if not self._chain:
            return {"valid": False, "reason": "Empty chain"}

        for i in range(1, len(self._chain)):
            curr = self._chain[i]
            prev = self._chain[i - 1]

            if curr.prev_hash != prev.block_hash:
                return {
                    "valid": False,
                    "reason": f"Broken chain link at index {i}: expected {prev.block_hash[:8]}..., got {curr.prev_hash[:8]}..."
                }

            if curr.compute_hash() != curr.block_hash:
                return {
                    "valid": False,
                    "reason": f"Hash mismatch at index {i}: payload modified"
                }

        return {
            "valid": True,
            "total_blocks": len(self._chain),
            "head_hash": self._chain[-1].block_hash,
            "verified_at": datetime.utcnow().isoformat()
        }

audit_trail = CryptographicAuditTrail()
