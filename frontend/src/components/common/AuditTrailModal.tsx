import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, RefreshCw, Hash, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ isOpen, onClose }) => {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAudit = () => {
    setLoading(true);
    fetch('/api/audit')
      .then(r => r.json())
      .then(d => setAuditData(d))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isChainValid = auditData?.integrity?.valid ?? false;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-industrial-800 border border-industrial-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-industrial-700 flex items-center justify-between bg-industrial-900">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wide">
                Unified Cryptographic Audit Trail
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                SHA-256 Chained Immutable Ledger · Tamper-Evident Evidence Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudit}
              title="Re-verify Chain"
              className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-slate-300 border border-industrial-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-industrial-700 text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Integrity Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
            isChainValid
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {isChainValid ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              )}
              <span>
                Chain Integrity: <strong>{isChainValid ? 'CRYPTOGRAPHICALLY SEALED (100% VALID)' : 'INTEGRITY BREACH'}</strong>
              </span>
            </div>
            <span>
              Total Blocks: <strong>{auditData?.total_records || 0}</strong> · Head: <code className="text-[10px] text-slate-400">{auditData?.integrity?.head_hash?.slice(0, 12)}...</code>
            </span>
          </div>

          {/* Ledger Table */}
          <div className="space-y-2">
            {auditData?.ledger?.map((evt: any, idx: number) => (
              <div
                key={evt.event_id}
                className="p-3 bg-industrial-900 border border-industrial-700 rounded-xl text-xs font-mono space-y-1.5"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      Block #{idx}
                    </span>
                    <strong className="text-purple-300 font-semibold">{evt.event_type}</strong>
                    {evt.asset_tag && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {evt.asset_tag}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-slate-200 text-[12px] leading-relaxed">
                  {evt.details}
                </p>

                {/* Hashes */}
                <div className="pt-1.5 border-t border-industrial-800 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div className="truncate">
                    <span className="text-slate-500">Prev Hash: </span>
                    <code className="text-slate-400">{evt.prev_hash}</code>
                  </div>
                  <div className="truncate text-right md:text-left">
                    <span className="text-slate-500">Block SHA-256: </span>
                    <code className="text-emerald-400 font-bold">{evt.block_hash}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
