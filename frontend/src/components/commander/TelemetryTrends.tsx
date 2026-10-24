import React from 'react';
import { TelemetrySnapshot } from '../../types';
import { Gauge, Zap, Waves, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TelemetryTrendsProps {
  telemetry: TelemetrySnapshot | null;
}

export const TelemetryTrends: React.FC<TelemetryTrendsProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  const { pump, strainer, flow_meter, suction_pressure, discharge_pressure } = telemetry;
  const isFlowLow = flow_meter.flow_gpm < 65.0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Discharge Flow (FT-101) */}
      <div className={`p-3 rounded-xl border transition-all ${
        isFlowLow 
          ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' 
          : 'bg-industrial-800 border-industrial-700 text-slate-200'
      }`}>
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Gauge className="h-3.5 w-3.5 text-blue-400" /> FT-101
          </span>
          <span className="text-[10px] text-slate-400">TARGET: 100 GPM</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-mono tracking-tight ${isFlowLow ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
            {flow_meter.flow_gpm.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">GPM</span>
        </div>
        <div className="mt-2 w-full bg-industrial-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${isFlowLow ? 'bg-rose-500' : 'bg-cyan-400'}`}
            style={{ width: `${Math.min(100, (flow_meter.flow_gpm / 110) * 100)}%` }}
          ></div>
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-400">
          <span>ALARM &lt; 65</span>
          <span className={isFlowLow ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            {isFlowLow ? 'TRIPPED' : 'NORMAL'}
          </span>
        </div>
      </div>

      {/* 2. Suction Pressure (PT-101) */}
      <div className={`p-3 rounded-xl border transition-all ${
        pump.is_cavitating
          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
          : 'bg-industrial-800 border-industrial-700 text-slate-200'
      }`}>
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Waves className="h-3.5 w-3.5 text-cyan-400" /> PT-101
          </span>
          <span className="text-[10px] text-slate-400">NPSH: 4.2 PSI</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-mono tracking-tight ${pump.is_cavitating ? 'text-amber-400' : 'text-slate-100'}`}>
            {suction_pressure.pressure_psi.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">PSI</span>
        </div>
        <div className="mt-2 w-full bg-industrial-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${pump.is_cavitating ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, (suction_pressure.pressure_psi / 20) * 100)}%` }}
          ></div>
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-400">
          <span>CAVITATION RISK</span>
          <span className={pump.is_cavitating ? 'text-amber-400 font-bold animate-pulse' : 'text-emerald-400'}>
            {pump.is_cavitating ? 'DETECTED' : 'NONE'}
          </span>
        </div>
      </div>

      {/* 3. Strainer F-17 Local Differential Pressure */}
      <div className={`p-3 rounded-xl border transition-all ${
        strainer.differential_pressure_psi > 6.0 
          ? 'bg-rose-950/20 border-rose-500/30' 
          : 'bg-industrial-800 border-industrial-700'
      }`}>
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> F-17 LOCAL ΔP
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/50 text-purple-300 border border-purple-500/30">
            NO REMOTE API
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-mono tracking-tight ${
            strainer.differential_pressure_psi > 6.0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {strainer.differential_pressure_psi.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">PSI (ΔP)</span>
        </div>
        <div className="mt-2 w-full bg-industrial-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              strainer.differential_pressure_psi > 6.0 ? 'bg-rose-500' : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(100, (strainer.differential_pressure_psi / 25) * 100)}%` }}
          ></div>
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-400">
          <span>CLEAN: &le; 2 PSI</span>
          <span className={strainer.differential_pressure_psi > 6.0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            {strainer.differential_pressure_psi > 6.0 ? 'RESTRICTED' : 'CLEAN'}
          </span>
        </div>
      </div>

      {/* 4. Motor Amps & Vibration (P-101) */}
      <div className="p-3 rounded-xl border bg-industrial-800 border-industrial-700 text-slate-200">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Zap className="h-3.5 w-3.5 text-yellow-400" /> P-101 DRIVE
          </span>
          <span className="text-[10px] text-slate-400">2950 RPM</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-yellow-300">
            {pump.motor_amps.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">AMPS</span>
        </div>
        <div className="mt-2 w-full bg-industrial-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (pump.motor_amps / 50) * 100)}%` }}
          ></div>
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-400">
          <span>VIBRATION: {pump.vibration_mm_s} mm/s</span>
          <span className="text-emerald-400 font-bold">RUNNING</span>
        </div>
      </div>
    </div>
  );
};
