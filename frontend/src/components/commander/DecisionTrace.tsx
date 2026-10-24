import React from 'react';
import { DecisionTraceItem, FieldTask } from '../../types';
import { 
  GitCommit, 
  PauseCircle, 
  PlayCircle, 
  ShieldCheck, 
  Eye, 
  Volume2, 
  Sliders, 
  CheckCircle2, 
  Clock, 
  Camera,
  Hash
} from 'lucide-react';

interface DecisionTraceProps {
  trace: DecisionTraceItem[];
  workflowState: string;
  activeTask: FieldTask | null;
}

export const DecisionTrace: React.FC<DecisionTraceProps> = ({
  trace,
  workflowState,
  activeTask
}) => {
  return (
    <div className="bg-industrial-800 border border-industrial-700 rounded-xl p-4 flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-3 border-b border-industrial-700">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-blue-400" />
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            Google ADK Dynamic Decision Trace
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">STATE:</span>
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
            workflowState === 'PAUSED_AWAITING_INPUT'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
              : workflowState === 'RESUMED'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : workflowState === 'COMPLETED'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-700 text-slate-300'
          }`}>
            {workflowState}
          </span>
        </div>
      </div>

      {/* Trace Timeline */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-3">
        {trace.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <GitCommit className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-mono">No active incident cycle.</p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
              Trigger a strainer restriction in the simulator below to launch the autonomous ADK diagnostic loop.
            </p>
          </div>
        ) : (
          trace.map((item, idx) => {
            const isPause = item.phase === 'REQUEST_INPUT_PAUSE';
            const isResume = item.phase === 'FUNCTION_RESPONSE_RESUME';
            const isResolved = item.phase === 'RESOLVED';

            return (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                  isPause 
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
                    : isResume 
                    ? 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                    : isResolved
                    ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                    : 'bg-industrial-900 border-industrial-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    {isPause && <PauseCircle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />}
                    {isResume && <PlayCircle className="h-3.5 w-3.5 text-blue-400" />}
                    {isResolved && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                    {!isPause && !isResume && !isResolved && <Clock className="h-3.5 w-3.5 text-slate-400" />}
                    <span className="text-slate-100">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Step {item.step} · {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {item.details}
                </p>

                {/* Evidence or Task Metadata Badge */}
                {item.task && (
                  <div className="mt-2 p-2 rounded bg-industrial-950/70 border border-industrial-700/60 text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Target: <strong className="text-amber-400">{item.task.target_asset}</strong></span>
                      <span>Action: <strong className="text-slate-200">{item.task.task_type}</strong></span>
                    </div>
                    <div className="text-slate-400">
                      <span>Safety: {item.task.safety_notes?.join(' · ') || 'Standard PPE'}</span>
                    </div>
                  </div>
                )}

                {item.evidence && (
                  <div className="mt-2 p-2 rounded bg-industrial-950/70 border border-blue-500/20 text-[10px] space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
                      <CheckCircle2 className="h-3 w-3 text-blue-400" />
                      <span>Gemini Multimodal Interpretation:</span>
                    </div>
                    {item.evidence.condition && (
                      <div className="text-slate-300">Gauge Status: <strong className="text-rose-400">{item.evidence.condition} ({item.evidence.reading_psi} PSI)</strong></div>
                    )}
                    {item.evidence.position_state && (
                      <div className="text-slate-300">Valve Dial State: <strong className="text-emerald-400">{item.evidence.position_state}</strong></div>
                    )}
                    {item.evidence.classification && (
                      <div className="text-slate-300">Acoustic Casing: <strong className="text-amber-400">{item.evidence.classification}</strong></div>
                    )}
                    {item.evidence.explanation && (
                      <p className="text-slate-400 italic">"{item.evidence.explanation}"</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Active Pause Banner if Waiting */}
      {workflowState === 'PAUSED_AWAITING_INPUT' && activeTask && (
        <div className="mt-3 pt-3 border-t border-industrial-700/60 flex items-center justify-between text-xs font-mono bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 text-amber-200">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Awaiting Field Operator: <strong>{activeTask.title}</strong></span>
          </div>
          <span className="text-[11px] underline cursor-pointer text-amber-300 font-bold">
            Switch to Operator Tab
          </span>
        </div>
      )}
    </div>
  );
};
