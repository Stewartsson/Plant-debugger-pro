import React, { useState } from 'react';
import { 
  AlertOctagon, 
  RotateCcw, 
  Volume2, 
  Sliders, 
  Waves, 
  Play, 
  Pause,
  Flame,
  Activity,
  Gauge
} from 'lucide-react';

interface FaultInjectorProps {
  onInjectClog: (pct: number) => void;
  onReset: () => void;
  onManualValveChange: (pct: number) => void;
  currentValvePct: number;
}

export const FaultInjector: React.FC<FaultInjectorProps> = ({
  onInjectClog,
  onReset,
  onManualValveChange,
  currentValvePct
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);

  const handleTogglePumpAudio = () => {
    if (isPlayingAudio && audioElement) {
      audioElement.pause();
      setIsPlayingAudio(false);
    } else {
      // Create new dynamic audio from simulator endpoint
      const audio = new Audio(`/api/sim/pump-audio?t=${Date.now()}`);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play().catch(e => console.log("Audio play blocked:", e));
      setAudioElement(audio);
      setIsPlayingAudio(true);
    }
  };

  const handleTriggerClog = (pct: number) => {
    setIsInjecting(true);
    onInjectClog(pct);
    setTimeout(() => setIsInjecting(false), 1200);
  };

  const getValveColor = (pct: number) => {
    if (pct === 0) return 'text-slate-400';
    if (pct < 40) return 'text-amber-400';
    if (pct < 90) return 'text-cyan-400';
    return 'text-emerald-400';
  };

  return (
    <div className="bg-industrial-800 border border-industrial-700 rounded-xl p-4 shadow-xl relative overflow-hidden">
      {/* Subtle top industrial accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500"></div>

      <div className="flex items-center justify-between pb-3 border-b border-industrial-700/80">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-amber-400" />
          Simulator Controls & Live Acoustic Stream
        </h2>
        <span className="text-[10px] font-mono text-slate-500 bg-industrial-900/80 px-2 py-0.5 rounded border border-industrial-700/60">
          Brownfield Physical Simulator
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3">
        {/* Scenario 1: Trigger Strainer Clog */}
        <div className={`bg-industrial-900 border rounded-lg p-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
          isInjecting 
            ? 'border-rose-500 neon-pulse-rose' 
            : 'border-industrial-700/80 hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-rose-400 group-hover:animate-bounce" />
                P-101 Low-Flow Incident
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-400 border border-rose-800/60 font-semibold">
                FAULT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              Injects heavy particulate cake into Suction Strainer F-17. Drops FT-101 flow to ~32 GPM.
            </p>
          </div>

          <button
            onClick={() => handleTriggerClog(85.0)}
            className="mt-3 w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-mono text-xs py-2 px-3 rounded-md font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-rose-600/30 active:scale-[0.98] group/btn relative overflow-hidden"
          >
            <div className="absolute inset-0 hazard-stripes-danger opacity-20 pointer-events-none"></div>
            <AlertOctagon className={`h-3.5 w-3.5 ${isInjecting ? 'animate-spin' : 'group-hover/btn:scale-110 transition-transform'}`} />
            <span>{isInjecting ? 'Injecting Fault...' : 'Inject 85% Strainer Clog'}</span>
          </button>
        </div>

        {/* Acoustic Audio Stream with Dancing Equalizer */}
        <div className={`bg-industrial-900 border rounded-lg p-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
          isPlayingAudio 
            ? 'border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
            : 'border-industrial-700/80 hover:border-cyan-500/50'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Volume2 className={`h-3.5 w-3.5 ${isPlayingAudio ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                Live Acoustic Stream
              </div>
              {isPlayingAudio && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  STREAMING
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              Genuine physics waveform: 60Hz motor hum + 5kHz cavitation crackle.
            </p>

            {/* Dancing Equalizer Spectrum Display */}
            <div className="mt-2.5 h-7 bg-industrial-950/90 rounded border border-industrial-800 px-3 flex items-end justify-between gap-1 overflow-hidden">
              {isPlayingAudio ? (
                <>
                  <div className="w-1.5 bg-cyan-400 rounded-t eq-bar-1"></div>
                  <div className="w-1.5 bg-cyan-300 rounded-t eq-bar-2"></div>
                  <div className="w-1.5 bg-emerald-400 rounded-t eq-bar-3"></div>
                  <div className="w-1.5 bg-amber-400 rounded-t eq-bar-4"></div>
                  <div className="w-1.5 bg-cyan-400 rounded-t eq-bar-5"></div>
                  <div className="w-1.5 bg-emerald-300 rounded-t eq-bar-2"></div>
                  <div className="w-1.5 bg-cyan-300 rounded-t eq-bar-1"></div>
                  <div className="w-1.5 bg-amber-300 rounded-t eq-bar-3"></div>
                  <div className="w-1.5 bg-cyan-400 rounded-t eq-bar-4"></div>
                </>
              ) : (
                <div className="w-full flex items-center justify-center gap-1 text-[10px] font-mono text-slate-500 py-1">
                  <Waves className="h-3 w-3 text-slate-600" />
                  <span>Acoustic FFT Standby</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleTogglePumpAudio}
            className={`mt-2.5 w-full font-mono text-xs py-2 px-3 rounded-md font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] ${
              isPlayingAudio
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white shadow-cyan-600/20'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Stop Audio
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Listen to Pump Audio
              </>
            )}
          </button>
        </div>

        {/* Manual Bypass BV-104 Throttle with Quick Presets */}
        <div className="bg-industrial-900 border border-industrial-700/80 hover:border-industrial-600 rounded-lg p-3 flex flex-col justify-between transition-all">
          <div>
            <div className="text-xs font-mono font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                Bypass BV-104 Test
              </span>
              <span className={`font-mono text-xs font-extrabold px-1.5 py-0.2 rounded bg-industrial-950 border border-industrial-700 ${getValveColor(currentValvePct)}`}>
                {currentValvePct}% {currentValvePct === 100 ? 'OPEN' : currentValvePct === 0 ? 'SHUT' : 'THROTTLED'}
              </span>
            </div>

            {/* Custom Range Slider with Visual Scale */}
            <div className="mt-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={currentValvePct}
                onChange={(e) => onManualValveChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-industrial-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>0% (SHUT)</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100% (OPEN)</span>
              </div>
            </div>

            {/* Quick Probe Presets */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[0, 10, 50, 100].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onManualValveChange(preset)}
                  className={`text-[10px] font-mono py-0.5 rounded border transition ${
                    currentValvePct === preset
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold'
                      : 'bg-industrial-950/60 text-slate-400 border-industrial-800 hover:text-slate-200'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onReset}
            className="mt-3 w-full bg-industrial-800 hover:bg-industrial-700 text-slate-300 hover:text-white font-mono text-xs py-1.5 px-3 rounded-md transition flex items-center justify-center gap-1.5 border border-industrial-700 active:scale-[0.98]"
          >
            <RotateCcw className="h-3 w-3 text-slate-400 group-hover:rotate-180 transition-transform" />
            Reset Simulator to Baseline
          </button>
        </div>
      </div>
    </div>
  );
};

