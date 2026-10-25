import React from 'react';
import { DecisionTraceItem, FieldTask } from '../../types';
import { 
  GitCommit, 
  PauseCircle, 
  PlayCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Cpu,
  Radio,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface DecisionTraceProps {
  trace: DecisionTraceItem[];
  workflowState: string;
  activeTask: FieldTask | null;
  onSwitchToOperator?: () => void;
}

export const DecisionTrace: React.FC<DecisionTraceProps> = ({
  trace,
  workflowState,
  activeTask,
  onSwitchToOperator
}) => {
  const isPaused = workflowState === 'PAUSED_AWAITING_INPUT';

  return (
    <div className={`bg-industrial-800 border rounded-xl p-4 flex flex-col h-[520px] relative overflow-hidden transition-all duration-300 ${
      isPaused ? 'border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.2)]' : 'border-industrial-700 shadow-xl'
    }`}>
      {/* Laser Scanning Line when ADK is paused awaiting reality */}
      {isPaused && <div className="laser-scan-line"></div>}

      {/* Holographic background shimmer */}
      <div className="shimmer-overlay"></div>

      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-industrial-700/80 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-500/15 border border-blue-400/40 flex items-center justify-center text-blue-400">
            <Cpu className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Google ADK Dynamic Decision Trace
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">Autonomous Diagnostic State Machine</p>
          </div>
        </div>

        {/* State Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">STATUS:</span>
          <div className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full transition-all ${
            isPaused
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : workflowState === 'RESUMED'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
              : workflowState === 'COMPLETED'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {isPaused && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>}
            {workflowState === 'RESUMED' && <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>}
            {workflowState === 'COMPLETED' && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
            <span>{workflowState}</span>
          </div>
        </div>
      </div>

      {/* Trace Timeline with Glowing Neural Circuit */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-3 relative z-10">
        {trace.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono">
            <div className="h-12 w-12 rounded-full bg-industrial-900 border border-industrial-700 flex items-center justify-center text-slate-600 mb-3">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-400">Waiting for Plant Anomaly Event</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
              Click <strong className="text-rose-400">"Inject 85% Strainer Clog"</strong> in the simulator panel to trigger telemetry deviation and initialize the ADK diagnostic workflow.
            </p>
          </div>
        ) : (
          trace.map((item, idx) => {
            const isStepPaused = item.phase === 'REQUEST_INPUT_PAUSE';
            const isResume = item.phase === 'FUNCTION_RESPONSE_RESUME';
            const isResolved = item.phase === 'RESOLVED';

            return (
              <div 
                key={idx} 
                className={`p-3.5 rounded-xl border text-xs font-mono transition-all duration-300 relative overflow-hidden ${
                  isStepPaused 
                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : isResume 
                    ? 'bg-blue-950/30 border-blue-500/40 text-blue-200 shadow-[0_0_12px_rgba(56,189,248,0.12)]'
                    : isResolved
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.2)]'
                    : 'bg-industrial-900/90 border-industrial-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                {/* Background moving caution stripes for active paused task */}
                {isStepPaused && <div className="absolute inset-0 hazard-stripes pointer-events-none opacity-40"></div>}

                <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                  <div className="flex items-center gap-2 font-bold">
                    {isStepPaused && (
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-6 w-6 rounded-full bg-amber-400/30 radar-ring"></span>
                        <span className="absolute h-6 w-6 rounded-full bg-amber-400/20 radar-ring-delayed"></span>
                        <PauseCircle className="h-4 w-4 text-amber-400 relative z-10 animate-pulse" />
                      </div>
                    )}
                    {isResume && <PlayCircle className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />}
                    {isResolved && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                    {!isStepPaused && !isResume && !isResolved && <Clock className="h-3.5 w-3.5 text-slate-400" />}
                    
                    <span className="text-slate-100 font-semibold tracking-tight">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono bg-industrial-950/60 px-2 py-0.5 rounded border border-industrial-700/50">
                    Step {item.step} · {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed relative z-10 pl-6 border-l-2 border-industrial-700/60">
                  {item.details}
                </p>

                {/* Dispatched Field Task Callout */}
                {item.task && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-industrial-950/90 border border-amber-500/30 text-[10px] space-y-1 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono">
                        Target Asset: <strong className="text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">{item.task.target_asset}</strong>
                      </span>
                      <span className="text-cyan-300 font-semibold">ACTION: {item.task.task_type}</span>
                    </div>
                    {item.task.safety_notes && (
                      <div className="text-amber-200/90 text-[10px] pt-1 border-t border-industrial-800 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                        <span>Safety Protocol: {item.task.safety_notes.join(' · ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Multimodal AI Vision/Audio Result Badge */}
                {item.evidence && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-industrial-950/90 border border-cyan-500/30 text-[10px] space-y-1 relative z-10">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                      <span>Gemini Multimodal Interpretation:</span>
                    </div>
                    {item.evidence.condition && (
                      <div className="text-slate-200">
                        Gauge Reading: <strong className="text-rose-400 font-mono font-bold">{item.evidence.condition} ({item.evidence.reading_psi} PSI)</strong>
                      </div>
                    )}
                    {item.evidence.position_state && (
                      <div className="text-slate-200">
                        Valve Stem Index: <strong className="text-emerald-400 font-mono font-bold">{item.evidence.position_state}</strong>
                      </div>
                    )}
                    {item.evidence.classification && (
                      <div className="text-slate-200">
                        Acoustic Signature: <strong className="text-amber-400 font-mono font-bold">{item.evidence.classification}</strong>
                      </div>
                    )}
                    {item.evidence.explanation && (
                      <p className="text-slate-400 italic pt-1 border-t border-industrial-800">
                        "{item.evidence.explanation}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Awaiting Reality Banner */}
      {isPaused && activeTask && (
        <div className="mt-3 pt-3 border-t border-industrial-700/80 relative z-10">
          <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 flex items-center justify-between text-xs font-mono shadow-[0_0_20px_rgba(245,158,11,0.25)] neon-pulse-amber">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="absolute h-5 w-5 rounded-full bg-amber-400/40 radar-ring"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping"></span>
              </div>
              <div>
                <span className="text-[10px] text-amber-400/90 font-bold block uppercase tracking-wider">Awaiting Field Evidence</span>
                <span className="text-slate-100 font-bold">{activeTask.title}</span>
              </div>
            </div>

            <button
              onClick={onSwitchToOperator}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-industrial-900 font-mono font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-md hover:scale-105 active:scale-95"
            >
              <span>Provide Evidence</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
