import React, { useState, useEffect } from 'react';
import { FileText, X, CheckCircle2, Wrench, Download, Printer } from 'lucide-react';

interface RCAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RCAModal: React.FC<RCAModalProps> = ({ isOpen, onClose }) => {
  const [rcaData, setRcaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/agent/rca')
        .then(r => r.json())
        .then(d => setRcaData(d))
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-industrial-800 border border-industrial-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-industrial-700 flex items-center justify-between bg-industrial-900">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wide">
                Post-Incident 5-Why Root Cause Analysis & CMMS Package
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Deterministic Close-Out · SAP PM / IBM Maximo Work Order Ready
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-industrial-700 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">Generating RCA Package...</div>
          ) : !rcaData ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">No active incident data available.</div>
          ) : (
            <>
              {/* Status Header */}
              <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-xs font-mono text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Incident ID: <strong>{rcaData.incident_id}</strong></span>
                </div>
                <span>Status: <strong>RESOLVED (Deterministic Recovery Verified)</strong></span>
              </div>

              {/* 5-Whys */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  1. Structured 5-Why Root Cause Analysis
                </h3>
                <div className="space-y-2">
                  {rcaData.five_whys?.map((item: any) => (
                    <div key={item.why_num} className="bg-industrial-900 p-3 rounded-lg border border-industrial-700 text-xs font-mono">
                      <div className="text-amber-400 font-bold">Why {item.why_num}: {item.question}</div>
                      <div className="text-slate-300 mt-1 pl-3 border-l-2 border-emerald-500">
                        {item.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Order Specification */}
              {rcaData.work_order && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-blue-400" />
                    2. SAP PM Maintenance Work Order Specification
                  </h3>
                  <div className="bg-industrial-900 p-4 rounded-xl border border-industrial-700 text-xs font-mono space-y-2.5">
                    <div className="grid grid-cols-2 gap-3 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">WORK ORDER ID:</span>
                        <strong className="text-cyan-300">{rcaData.work_order.work_order_id}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">NOTIFICATION TYPE:</span>
                        <span>{rcaData.work_order.sap_notification_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">EQUIPMENT:</span>
                        <span>{rcaData.work_order.equipment_description} ({rcaData.work_order.equipment_tag})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">PRIORITY:</span>
                        <span className="text-amber-400 font-bold">{rcaData.work_order.priority}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-industrial-700">
                      <span className="text-slate-500 block text-[10px] mb-1">REQUIRED MAINTENANCE ACTION:</span>
                      <p className="text-slate-200 leading-relaxed bg-industrial-950 p-2.5 rounded border border-industrial-700">
                        {rcaData.work_order.maintenance_action}
                      </p>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>LOTO Required: <strong className="text-rose-400">{rcaData.work_order.safety_loto_required}</strong></span>
                      <span>Estimated Downtime: <strong>{rcaData.work_order.estimated_downtime_hours} hrs</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-industrial-900 border-t border-industrial-700 flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 bg-industrial-700 hover:bg-industrial-600 text-slate-200 text-xs font-mono px-3 py-2 rounded-lg transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold px-4 py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
