import React, { useState, useEffect } from 'react';
import { TelemetrySnapshot, FieldTask, DecisionTraceItem } from './types';
import { Header } from './components/common/Header';
import { PIDCanvas } from './components/pid/PIDCanvas';
import { TelemetryTrends } from './components/commander/TelemetryTrends';
import { DecisionTrace } from './components/commander/DecisionTrace';
import { FaultInjector } from './components/commander/FaultInjector';
import { MobileOperatorCompanion } from './components/operator/MobileOperatorCompanion';
import { KnowledgeModal } from './components/common/KnowledgeModal';
import { RCAModal } from './components/common/RCAModal';
import { AuditTrailModal } from './components/common/AuditTrailModal';
import { ArrowRight, Radio, HardHat, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [role, setRole] = useState<'commander' | 'operator'>('commander');
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [workflowState, setWorkflowState] = useState<string>('IDLE');
  const [activeTask, setActiveTask] = useState<FieldTask | null>(null);
  const [decisionTrace, setDecisionTrace] = useState<DecisionTraceItem[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  
  // Modals
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [isRCAOpen, setIsRCAOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Poll or WebSocket for Telemetry
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: any = null;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setWsConnected(true);
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TELEMETRY_UPDATE') {
              setTelemetry(data.snapshot);
              if (data.adk_state) setWorkflowState(data.adk_state);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          // Try reconnect after 3s
          setTimeout(connectWS, 3000);
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        setWsConnected(false);
      }
    };

    connectWS();

    // Secondary HTTP fallback polling every 1 sec
    pollInterval = setInterval(() => {
      fetch('/api/telemetry/snapshot')
        .then(r => r.json())
        .then(data => {
          if (!wsConnected) setTelemetry(data);
        })
        .catch(() => {});

      // Fetch ADK state
      fetch('/api/agent/state')
        .then(r => r.json())
        .then(data => {
          setWorkflowState(data.workflow_state);
          setActiveTask(data.active_task);
          setDecisionTrace(data.decision_trace || []);
        })
        .catch(() => {});
    }, 1000);

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [wsConnected]);

  // Actions
  const handleInjectClog = async (pct: number) => {
    try {
      await fetch('/api/sim/inject-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clog_pct: pct, incident_id: 'INC-P101-001' })
      });
      // Switch view or inform user
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPlant = async () => {
    try {
      await fetch('/api/sim/reset', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualValveChange = async (pct: number) => {
    try {
      await fetch('/api/sim/set-valve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_pct: pct })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitEvidence = async (
    taskId: string,
    notes: string,
    confirmedPct: number | null,
    file: File | null,
    sampleUrl?: string
  ) => {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('operator_notes', notes);
    if (confirmedPct !== null) {
      formData.append('confirmed_action_pct', confirmedPct.toString());
    }

    if (file) {
      formData.append('file', file);
    } else if (sampleUrl) {
      // Fetch sample blob and append
      try {
        const resp = await fetch(sampleUrl);
        const blob = await resp.blob();
        formData.append('file', blob, sampleUrl.split('/').pop() || 'sample.jpg');
      } catch (e) {
        console.error('Failed to attach sample asset:', e);
      }
    }

    const resp = await fetch('/api/agent/submit-evidence', {
      method: 'POST',
      body: formData
    });
    const result = await resp.json();

    // Check if deterministic recovery achieved
    if (result.next_state === 'COMPLETED' || telemetry?.incident_status === 'RESOLVED') {
      setIsRCAOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans">
      <Header
        currentRole={role}
        onRoleChange={setRole}
        incidentStatus={telemetry?.incident_status || 'NORMAL'}
        sustainedRecoverySeconds={telemetry?.sustained_recovery_seconds || 0}
        wsConnected={wsConnected}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onOpenRCA={() => setIsRCAOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onResetPlant={handleResetPlant}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {role === 'commander' ? (
          /* Commander Console View */
          <div className="space-y-4">
            {/* Live KPI & Instrumentation Trend Bar */}
            <TelemetryTrends telemetry={telemetry} />

            {/* Interactive Animated Process P&ID Canvas */}
            <PIDCanvas telemetry={telemetry} />

            {/* Bottom Split: ADK Decision Graph (Left) & Simulator Controls (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <DecisionTrace
                  trace={decisionTrace}
                  workflowState={workflowState}
                  activeTask={activeTask}
                  onSwitchToOperator={() => setRole('operator')}
                />
              </div>

              <div className="lg:col-span-5 space-y-4">
                <FaultInjector
                  onInjectClog={handleInjectClog}
                  onReset={handleResetPlant}
                  onManualValveChange={handleManualValveChange}
                  currentValvePct={telemetry?.bypass_valve.position_pct || 0}
                />

                {/* Highly Animated Field Operator Action Card when workflow is paused */}
                {workflowState === 'PAUSED_AWAITING_INPUT' && activeTask && (
                  <div className="bg-amber-950/30 border-2 border-amber-500 rounded-xl p-4 shadow-[0_0_25px_rgba(245,158,11,0.3)] relative overflow-hidden neon-pulse-amber">
                    {/* Laser sweep animation */}
                    <div className="laser-scan-line"></div>
                    {/* Diagonal hazard stripes */}
                    <div className="absolute inset-0 hazard-stripes opacity-15 pointer-events-none"></div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Radio className="h-3 w-3 text-amber-400 animate-pulse" />
                            Pending Physical Field Action
                          </span>
                        </div>

                        <button
                          onClick={() => setRole('operator')}
                          className="group inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-extrabold px-3 py-1 rounded-md transition-all shadow-md hover:shadow-amber-500/50 active:scale-95"
                        >
                          <HardHat className="h-3.5 w-3.5 text-slate-900" />
                          <span>Switch to Operator</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>

                      <div className="mt-2 bg-industrial-950/90 border border-amber-500/40 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                              {activeTask.target_asset}
                            </span>
                            {activeTask.title}
                          </h4>
                          <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            {activeTask.evidence_type} REQUIRED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono mt-1.5 leading-relaxed bg-black/40 p-2 rounded border border-industrial-800">
                          {activeTask.instruction}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Field Operator Companion View */
          <div className="py-2">
            <MobileOperatorCompanion
              activeTask={activeTask}
              workflowState={workflowState}
              onSubmitEvidence={handleSubmitEvidence}
              onOpenKnowledge={() => setIsKnowledgeOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <KnowledgeModal isOpen={isKnowledgeOpen} onClose={() => setIsKnowledgeOpen(false)} />
      <RCAModal isOpen={isRCAOpen} onClose={() => setIsRCAOpen(false)} />
      <AuditTrailModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
    </div>
  );
};
