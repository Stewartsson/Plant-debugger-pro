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
                />
              </div>

              <div className="lg:col-span-5 space-y-4">
                <FaultInjector
                  onInjectClog={handleInjectClog}
                  onReset={handleResetPlant}
                  onManualValveChange={handleManualValveChange}
                  currentValvePct={telemetry?.bypass_valve.position_pct || 0}
                />

                {/* Quick Operator Task Callout if paused */}
                {workflowState === 'PAUSED_AWAITING_INPUT' && activeTask && (
                  <div className="bg-amber-950/20 border-2 border-amber-500/60 rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wide">
                        Pending Field Action
                      </span>
                      <button
                        onClick={() => setRole('operator')}
                        className="text-xs font-mono font-bold text-amber-300 underline"
                      >
                        Switch to Operator Mode &rarr;
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100">{activeTask.title}</h4>
                    <p className="text-[11px] text-slate-300 font-mono mt-1">
                      {activeTask.instruction}
                    </p>
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
