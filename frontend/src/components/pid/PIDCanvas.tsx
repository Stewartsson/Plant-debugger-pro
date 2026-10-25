import React from 'react';
import { TelemetrySnapshot } from '../../types';
import { Activity, Gauge, Disc, AlertCircle } from 'lucide-react';

interface PIDCanvasProps {
  telemetry: TelemetrySnapshot | null;
  onSelectAsset?: (assetTag: string) => void;
}

export const PIDCanvas: React.FC<PIDCanvasProps> = ({ telemetry, onSelectAsset }) => {
  if (!telemetry) {
    return (
      <div className="h-72 bg-industrial-900 border border-industrial-700 rounded-xl flex items-center justify-center text-slate-500 font-mono text-sm">
        Connecting to Process Telemetry Stream...
      </div>
    );
  }

  const { pump, strainer, bypass_valve, flow_meter, suction_pressure, discharge_pressure } = telemetry;
  const isRestricted = flow_meter.flow_gpm < 65.0;
  const isRecovered = flow_meter.flow_gpm >= 95.0;
  const bypassOpen = bypass_valve.position_pct > 0;

  // Fluid line styling
  const mainFluidClass = isRestricted 
    ? 'stroke-amber-500 animate-fluid-restricted' 
    : 'stroke-cyan-400 animate-fluid';
    
  const bypassFluidClass = bypass_valve.position_pct > 0 
    ? (bypass_valve.position_pct > 50 ? 'stroke-emerald-400 animate-fluid-fast' : 'stroke-cyan-400 animate-fluid')
    : 'stroke-slate-700';

  return (
    <div className="bg-industrial-900 border border-industrial-700 rounded-xl p-4 relative overflow-hidden shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            Interactive P&ID Schematic · Feed System Loop 01
          </h2>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
          <span>Flow: <strong className={isRestricted ? 'text-rose-400' : 'text-cyan-300'}>{flow_meter.flow_gpm} GPM</strong></span>
          <span>Bypass: <strong className={bypassOpen ? 'text-emerald-400' : 'text-slate-400'}>{bypass_valve.position_pct}%</strong></span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <svg 
          viewBox="0 0 950 360" 
          className="w-full min-w-[750px] h-[340px] select-none"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="pid-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1f2937" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pid-grid)" />

          {/* ================= PIPING PATHS ================= */}
          {/* 1. Main Suction from Tank to Strainer F-17 */}
          <path d="M 80 180 L 220 180" fill="none" strokeWidth="6" className={mainFluidClass} strokeLinecap="round" />

          {/* 2. Strainer F-17 to Pump Suction Tee */}
          <path d="M 310 180 L 460 180" fill="none" strokeWidth="6" className={isRestricted && bypass_valve.position_pct === 0 ? 'stroke-rose-500/70' : mainFluidClass} strokeLinecap="round" />

          {/* 3. Pump P-101 Suction to Pump Impeller */}
          <path d="M 460 180 L 530 180" fill="none" strokeWidth="6" className={mainFluidClass} strokeLinecap="round" />

          {/* 4. Bypass Line (Split before F-17 at (170,180), loops up to (170,70), across through BV-104, into (460,70), down into (460,180)) */}
          <path d="M 170 180 L 170 70 L 460 70 L 460 180" fill="none" strokeWidth="5" className={bypassFluidClass} strokeLinecap="round" />

          {/* 5. Pump Discharge from (580, 180) to (880, 180) through FT-101 */}
          <path d="M 580 180 L 880 180" fill="none" strokeWidth="6" className={mainFluidClass} strokeLinecap="round" />


          {/* ================= EQUIPMENT NODES ================= */}

          {/* 1. Feed Storage Tank T-100 */}
          <g transform="translate(20, 120)" className="cursor-pointer">
            <rect x="0" y="0" width="60" height="120" rx="8" fill="#1c2331" stroke="#374151" strokeWidth="2" />
            {/* Liquid Level */}
            <rect x="2" y="30" width="56" height="88" rx="6" fill="#0ea5e9" fillOpacity="0.25" />
            <line x1="2" y1="30" x2="58" y2="30" stroke="#38bdf8" strokeWidth="2" />
            <text x="30" y="55" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">T-100</text>
            <text x="30" y="70" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">FEED TANK</text>
            <text x="30" y="100" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">14.7 psi</text>
          </g>

          {/* 2. Suction Pressure Transmitter PT-101 */}
          <g transform="translate(190, 195)" className="cursor-pointer">
            <line x1="0" y1="-15" x2="0" y2="0" stroke="#4b5563" strokeWidth="2" />
            <circle cx="0" cy="16" r="16" fill="#111827" stroke={suction_pressure.condition === 'ALERT' ? '#f43f5e' : '#38bdf8'} strokeWidth="2" />
            <text x="0" y="14" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">PT-101</text>
            <text x="0" y="24" fill={suction_pressure.pressure_psi < 10.0 ? '#f43f5e' : '#38bdf8'} fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {suction_pressure.pressure_psi}
            </text>
            <text x="0" y="44" fill="#64748b" fontSize="7" textAnchor="middle" fontFamily="monospace">SUCTION PSI</text>
          </g>

          {/* 3. Duplex Suction Strainer F-17 (Brownfield: Local gauge only!) */}
          <g 
            transform="translate(220, 140)" 
            className="cursor-pointer group"
            onClick={() => onSelectAsset && onSelectAsset('F-17')}
          >
            {/* Strainer Body */}
            <rect x="0" y="10" width="90" height="60" rx="4" fill="#1e293b" stroke={strainer.differential_pressure_psi > 6.0 ? '#ef4444' : '#475569'} strokeWidth="2" />
            {/* Basket mesh pattern */}
            <line x1="15" y1="20" x2="75" y2="60" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="15" y1="60" x2="75" y2="20" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
            
            <text x="45" y="36" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">F-17</text>
            <text x="45" y="48" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">DUPLEX STRAINER</text>

            {/* Local Differential Pressure Indicator Dial (NO REMOTE API) */}
            <g transform="translate(45, -15)">
              <line x1="0" y1="25" x2="0" y2="5" stroke="#94a3b8" strokeWidth="2" />
              {strainer.differential_pressure_psi > 6.0 && (
                <circle cx="0" cy="-5" r="24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" opacity="0.6" />
              )}
              <circle cx="0" cy="-5" r="18" fill="#0f172a" stroke={strainer.differential_pressure_psi > 6.0 ? '#ef4444' : '#22c55e'} strokeWidth="2" />
              {/* Dial needle */}
              <line 
                x1="0" 
                y1="-5" 
                x2={strainer.differential_pressure_psi > 6.0 ? "10" : "-8"} 
                y2={strainer.differential_pressure_psi > 6.0 ? "-12" : "-12"} 
                stroke={strainer.differential_pressure_psi > 6.0 ? '#ef4444' : '#22c55e'} 
                strokeWidth="2.5" 
              />
              <text x="0" y="-1" fill="#f1f5f9" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">ΔP</text>
              <rect x="-40" y="-36" width="80" height="14" rx="3" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
              <text x="0" y="-26" fill="#a5b4fc" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">ANALOG GAUGE (NO API)</text>
            </g>

            {/* Fouled status badge */}
            {strainer.differential_pressure_psi > 6.0 && (
              <g transform="translate(15, 80)">
                <rect x="0" y="0" width="60" height="16" rx="3" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
                <text x="30" y="11" fill="#fecdd3" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CLOGGED</text>
              </g>
            )}
          </g>

          {/* 4. Manual Bypass Throttle Valve BV-104 (Brownfield: Handwheel only!) */}
          <g 
            transform="translate(275, 45)" 
            className="cursor-pointer group"
            onClick={() => onSelectAsset && onSelectAsset('BV-104')}
          >
            {/* Valve Symbol: Two opposed triangles */}
            <polygon points="0,25 30,10 30,40" fill={bypassOpen ? '#10b981' : '#475569'} stroke="#334155" strokeWidth="1" />
            <polygon points="60,25 30,10 30,40" fill={bypassOpen ? '#10b981' : '#475569'} stroke="#334155" strokeWidth="1" />
            
            {/* Valve stem & Handwheel */}
            <line x1="30" y1="25" x2="30" y2="0" stroke="#94a3b8" strokeWidth="2.5" />
            <ellipse cx="30" cy="-3" rx="14" ry="4" fill="#334155" stroke={bypassOpen ? '#34d399' : '#94a3b8'} strokeWidth="2" />
            
            <text x="30" y="55" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BV-104</text>
            <text x="30" y="66" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">MANUAL BYPASS</text>
            
            {/* Position badge */}
            <rect x="7" y="-24" width="46" height="14" rx="3" fill={bypassOpen ? '#064e3b' : '#1e293b'} stroke={bypassOpen ? '#10b981' : '#475569'} strokeWidth="1" />
            <text x="30" y="-14" fill={bypassOpen ? '#6ee7b7' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {bypass_valve.position_pct}% {bypassOpen ? 'OPEN' : 'SHUT'}
            </text>
          </g>

          {/* 5. Centrifugal Feed Pump P-101 */}
          <g 
            transform="translate(530, 140)" 
            className="cursor-pointer group"
            onClick={() => onSelectAsset && onSelectAsset('P-101')}
          >
            {/* Cavitation vibrating aura */}
            {pump.is_cavitating && (
              <circle cx="40" cy="40" r="48" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" className="animate-spin" opacity="0.75" />
            )}

            {/* Pump volute casing */}
            <circle cx="40" cy="40" r="40" fill="#1e293b" stroke={pump.is_cavitating ? '#ef4444' : '#38bdf8'} strokeWidth="3" className={pump.is_cavitating ? 'animate-pulse' : ''} />
            {/* Discharge nozzle */}
            <polygon points="65,10 80,10 80,40 65,40" fill="#1e293b" stroke={pump.is_cavitating ? '#ef4444' : '#38bdf8'} strokeWidth="2" />
            
            {/* Rotating Impeller blades */}
            <g transform="translate(40, 40)">
              <circle cx="0" cy="0" r="8" fill="#64748b" />
              <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: pump.is_cavitating ? '0.7s' : (isRecovered ? '1.2s' : '2.0s') }}>
                <path d="M 0 0 Q 15 -10 25 0" stroke={pump.is_cavitating ? '#f87171' : '#38bdf8'} strokeWidth="2.5" fill="none" />
                <path d="M 0 0 Q -15 10 -25 0" stroke={pump.is_cavitating ? '#f87171' : '#38bdf8'} strokeWidth="2.5" fill="none" />
                <path d="M 0 0 Q 10 15 0 25" stroke={pump.is_cavitating ? '#f87171' : '#38bdf8'} strokeWidth="2.5" fill="none" />
                <path d="M 0 0 Q -10 -15 0 -25" stroke={pump.is_cavitating ? '#f87171' : '#38bdf8'} strokeWidth="2.5" fill="none" />
              </g>
            </g>

            <text x="40" y="98" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">P-101</text>
            <text x="40" y="110" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">FEED PUMP ({pump.motor_amps} A)</text>

            {/* Cavitation alert indicator */}
            {pump.is_cavitating && (
              <g transform="translate(10, -22)">
                <rect x="0" y="0" width="60" height="15" rx="3" fill="#881337" stroke="#f43f5e" strokeWidth="1" className="animate-pulse" />
                <text x="30" y="10" fill="#fecdd3" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CAVITATING</text>
              </g>
            )}
          </g>

          {/* 6. Discharge Pressure Transmitter PT-102 */}
          <g transform="translate(680, 195)" className="cursor-pointer">
            <line x1="0" y1="-15" x2="0" y2="0" stroke="#4b5563" strokeWidth="2" />
            <circle cx="0" cy="16" r="16" fill="#111827" stroke="#38bdf8" strokeWidth="2" />
            <text x="0" y="14" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">PT-102</text>
            <text x="0" y="24" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">{discharge_pressure.pressure_psi}</text>
            <text x="0" y="44" fill="#64748b" fontSize="7" textAnchor="middle" fontFamily="monospace">DISCH PSI</text>
          </g>

          {/* 7. Discharge Flow Transmitter FT-101 (Central Telemetry Anomaly Origin) */}
          <g transform="translate(760, 140)" className="cursor-pointer">
            {/* Orifice flange plate */}
            <rect x="0" y="30" width="16" height="20" fill="#334155" stroke="#64748b" strokeWidth="1" />
            <line x1="8" y1="30" x2="8" y2="0" stroke="#64748b" strokeWidth="2" />
            
            {isRestricted && (
              <circle cx="8" cy="-16" r="26" fill="none" stroke="#f43f5e" strokeWidth="1.5" className="animate-ping" opacity="0.6" />
            )}
            <circle cx="8" cy="-16" r="20" fill="#0f172a" stroke={isRestricted ? '#f43f5e' : '#10b981'} strokeWidth="2" />
            <text x="8" y="-20" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FT-101</text>
            <text x="8" y="-7" fill={isRestricted ? '#f43f5e' : '#34d399'} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {flow_meter.flow_gpm}
            </text>
            <text x="8" y="6" fill="#94a3b8" fontSize="7" textAnchor="middle" fontFamily="monospace">GPM</text>

            <text x="8" y="65" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FT-101</text>
            <text x="8" y="77" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">FLOW METER</text>

            {isRestricted && (
              <g transform="translate(-25, 90)">
                <rect x="0" y="0" width="66" height="16" rx="3" fill="#881337" stroke="#f43f5e" strokeWidth="1" className="animate-pulse" />
                <text x="33" y="11" fill="#fecdd3" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">LOW FLOW</text>
              </g>
            )}
          </g>

          {/* Destination Header */}
          <g transform="translate(880, 160)">
            <rect x="0" y="0" width="40" height="40" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="20" y="20" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">UNIT 04</text>
            <text x="20" y="30" fill="#64748b" fontSize="7" textAnchor="middle" fontFamily="monospace">REACTOR</text>
          </g>

        </svg>
      </div>

      {/* Legend & Telemetry Summary Bar */}
      <div className="mt-2 pt-2 border-t border-industrial-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded bg-cyan-400"></span>
            <span>Nominal Fluid (100 GPM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded bg-emerald-400"></span>
            <span>Bypass Line (BV-104)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded bg-rose-500"></span>
            <span>Local Restriction (F-17)</span>
          </div>
        </div>
        <div className="text-slate-500">
          💡 Click equipment nodes to view brownfield instrumentation metadata
        </div>
      </div>
    </div>
  );
};
