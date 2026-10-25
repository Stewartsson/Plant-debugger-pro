import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Radio, 
  Smartphone, 
  Monitor, 
  BookOpen, 
  FileText, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  currentRole: 'commander' | 'operator';
  onRoleChange: (role: 'commander' | 'operator') => void;
  incidentStatus: string;
  sustainedRecoverySeconds: number;
  wsConnected: boolean;
  onOpenKnowledge: () => void;
  onOpenRCA: () => void;
  onOpenAudit: () => void;
  onResetPlant: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  incidentStatus,
  sustainedRecoverySeconds,
  wsConnected,
  onOpenKnowledge,
  onOpenRCA,
  onOpenAudit,
  onResetPlant,
}) => {
  return (
    <header className="bg-industrial-800 border-b border-industrial-700 px-4 py-3 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
                Plant Debugger <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-medium border border-blue-500/30">PRO</span>
              </h1>
              {/* WS status */}
              <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${
                wsConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                {wsConnected ? 'LIVE 1Hz' : 'RECONNECTING'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">The Last Meter Has No API · Brownfield Diagnostic Engine</p>
          </div>
        </div>

        {/* Center: Deterministic Status Pill */}
        <div className="flex items-center gap-2">
          {incidentStatus === 'RESOLVED' && (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono font-semibold animate-pulse">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>DETERMINISTIC RECOVERY VERIFIED</span>
            </div>
          )}
          {incidentStatus === 'RECOVERING' && (
            <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full text-xs font-mono font-medium">
              <Activity className="h-4 w-4 text-amber-400 animate-spin" />
              <span>STABILIZING ({sustainedRecoverySeconds}/15s)</span>
            </div>
          )}
          {incidentStatus === 'INVESTIGATING' && (
            <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/40 text-rose-300 px-3 py-1 rounded-full text-xs font-mono font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>INCIDENT ACTIVE · ADK DIAGNOSING</span>
            </div>
          )}
          {incidentStatus === 'NORMAL' && (
            <div className="flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-full text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>PLANT NOMINAL (100 GPM)</span>
            </div>
          )}
        </div>

        {/* Right: Role Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* Role Switcher */}
          <div className="bg-industrial-900 border border-industrial-600 p-1 rounded-lg flex items-center text-xs font-medium">
            <button
              onClick={() => onRoleChange('commander')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentRole === 'commander'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Commander Console</span>
            </button>
            <button
              onClick={() => onRoleChange('operator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentRole === 'operator'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Field Operator</span>
            </button>
          </div>

          {/* Quick Actions */}
          <button
            onClick={onOpenKnowledge}
            title="Tacit Site Knowledge"
            className="flex items-center gap-1 bg-industrial-700 hover:bg-industrial-600 text-slate-200 px-2.5 py-1.5 rounded-lg border border-industrial-600 text-xs font-medium transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline">Knowledge</span>
          </button>

          <button
            onClick={onOpenRCA}
            title="Post-Incident 5-Why RCA & SAP Work Order"
            className="flex items-center gap-1 bg-industrial-700 hover:bg-industrial-600 text-slate-200 px-2.5 py-1.5 rounded-lg border border-industrial-600 text-xs font-medium transition"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">RCA / CMMS</span>
          </button>

          <button
            onClick={onOpenAudit}
            title="Unified Cryptographic Audit Trail"
            className="flex items-center gap-1 bg-industrial-700 hover:bg-industrial-600 text-slate-200 px-2.5 py-1.5 rounded-lg border border-industrial-600 text-xs font-medium transition"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden md:inline">Audit Trail</span>
          </button>

          <button
            onClick={onResetPlant}
            title="Reset Simulator to Normal"
            className="p-1.5 rounded-lg bg-industrial-700 hover:bg-industrial-600 text-slate-400 hover:text-white border border-industrial-600 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
