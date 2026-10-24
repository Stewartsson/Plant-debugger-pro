import React, { useState } from 'react';
import { AlertOctagon, RotateCcw, Volume2, Sliders, Waves, Play, Pause } from 'lucide-react';

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

  return (
    <div className="bg-industrial-800 border border-industrial-700 rounded-xl p-4">
      <div className="flex items-center justify-between pb-3 border-b border-industrial-700">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-amber-400" />
          Simulator Controls & Live Acoustic Stream
        </h2>
        <span className="text-[10px] font-mono text-slate-500">Brownfield Physical Plant Simulator</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        {/* Scenario 1: Trigger Strainer Clog */}
        <div className="bg-industrial-900 border border-industrial-700/80 p-3 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-200">P-101 Low-Flow Incident</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Injects heavy particulate cake into Suction Strainer F-17. Drops FT-101 to ~32 GPM.
            </p>
          </div>
          <button
            onClick={() => onInjectClog(85.0)}
            className="mt-3 w-full bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs py-2 px-3 rounded-md font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            Inject 85% Strainer Clog
          </button>
        </div>

        {/* Acoustic Audio Stream */}
        <div className="bg-industrial-900 border border-industrial-700/80 p-3 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
              Live Pump Acoustic Casing Audio
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Generates genuine 3-sec physics waveform: 60Hz drive hum + 5kHz vapor cavitation crackle.
            </p>
          </div>
          <button
            onClick={handleTogglePumpAudio}
            className={`mt-3 w-full font-mono text-xs py-2 px-3 rounded-md font-semibold transition flex items-center justify-center gap-1.5 shadow-sm ${
              isPlayingAudio
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-cyan-600/90 hover:bg-cyan-500 text-white'
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

        {/* Manual Valve Slider or Reset */}
        <div className="bg-industrial-900 border border-industrial-700/80 p-3 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-200 flex items-center justify-between">
              <span>Bypass BV-104 Test</span>
              <span className="text-emerald-400">{currentValvePct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={currentValvePct}
              onChange={(e) => onManualValveChange(parseFloat(e.target.value))}
              className="w-full mt-2 accent-emerald-500 cursor-pointer"
            />
          </div>
          <button
            onClick={onReset}
            className="mt-3 w-full bg-industrial-700 hover:bg-industrial-600 text-slate-300 font-mono text-xs py-2 px-3 rounded-md transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Simulator to Baseline
          </button>
        </div>
      </div>
    </div>
  );
};
