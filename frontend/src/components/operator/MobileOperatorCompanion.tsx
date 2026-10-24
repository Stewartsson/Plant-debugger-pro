import React, { useState, useEffect } from 'react';
import { FieldTask, SampleAsset } from '../../types';
import { 
  Camera, 
  Volume2, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  Upload, 
  Mic, 
  BookOpen, 
  HardHat, 
  Info,
  Hash,
  Play
} from 'lucide-react';

interface MobileOperatorCompanionProps {
  activeTask: FieldTask | null;
  workflowState: string;
  onSubmitEvidence: (
    taskId: string, 
    notes: string, 
    confirmedPct: number | null, 
    file: File | null,
    sampleUrl?: string
  ) => Promise<void>;
  onOpenKnowledge: () => void;
}

export const MobileOperatorCompanion: React.FC<MobileOperatorCompanionProps> = ({
  activeTask,
  workflowState,
  onSubmitEvidence,
  onOpenKnowledge
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [valveSliderVal, setValveSliderVal] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sampleAssets, setSampleAssets] = useState<SampleAsset[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleAsset | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Load sample assets for one-click testing
  useEffect(() => {
    fetch('/api/samples')
      .then(r => r.json())
      .then(data => setSampleAssets(data))
      .catch(e => console.log('Samples fetch err:', e));
  }, []);

  // Update default slider value when activeTask changes
  useEffect(() => {
    if (activeTask && activeTask.allowed_delta_pct !== null && activeTask.allowed_delta_pct !== undefined) {
      setValveSliderVal(activeTask.allowed_delta_pct);
    }
  }, [activeTask]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedSample(null);
    }
  };

  const handleSelectSample = (sample: SampleAsset) => {
    setSelectedSample(sample);
    setSelectedFile(null);
    setPreviewUrl(sample.url);
  };

  const handleSubmit = async () => {
    if (!activeTask) return;
    setIsSubmitting(true);
    try {
      await onSubmitEvidence(
        activeTask.task_id,
        operatorNotes,
        activeTask.task_type === 'BOUNDED_ADJUSTMENT' ? valveSliderVal : null,
        selectedFile,
        selectedSample ? selectedSample.url : undefined
      );
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedSample(null);
      setOperatorNotes('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Audio grab from simulator
  const handleGrabAudio = async () => {
    try {
      const resp = await fetch('/api/sim/pump-audio');
      const blob = await resp.blob();
      const file = new File([blob], 'pump_casing_acoustic.wav', { type: 'audio/wav' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      setSelectedSample(null);
      setOperatorNotes('Recorded 3-second casing acoustic sample via contact mic.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-industrial-900 border border-industrial-700 rounded-2xl overflow-hidden shadow-2xl pb-6">
      {/* Mobile Top Bar */}
      <div className="bg-industrial-800 border-b border-industrial-700 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wide">
              Field Operator Portal
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">Logged in as: Tech #4092 (West Wing)</p>
          </div>
        </div>

        <button
          onClick={onOpenKnowledge}
          className="flex items-center gap-1 bg-industrial-700 hover:bg-industrial-600 text-slate-200 px-2 py-1 rounded text-[11px] font-mono border border-industrial-600"
        >
          <BookOpen className="h-3 w-3 text-blue-400" />
          <span>Site Notes</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {/* If no task is active */}
        {!activeTask ? (
          <div className="bg-industrial-800/80 border border-industrial-700 rounded-xl p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-mono font-bold text-slate-200">No Dispatched Work Orders</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Google ADK is currently monitoring plant telemetry or evaluating hypotheses. 
              Execution will pause and ping your mobile device when physical field action is required.
            </p>
          </div>
        ) : (
          /* Active Work Order Card */
          <div className="bg-industrial-800 border-2 border-amber-500/60 rounded-xl p-4 shadow-lg space-y-3">
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                WORK ORDER #{activeTask.task_id}
              </span>
              <span className="text-xs font-mono font-bold text-white bg-slate-700 px-2.5 py-0.5 rounded">
                ASSET: {activeTask.target_asset}
              </span>
            </div>

            {/* Instruction Title */}
            <div>
              <h3 className="text-sm font-bold text-slate-100 leading-snug">
                {activeTask.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed bg-industrial-900/60 p-2.5 rounded-lg border border-industrial-700/60">
                {activeTask.instruction}
              </p>
            </div>

            {/* Safety & Tacit Knowledge Notes */}
            {activeTask.safety_notes && activeTask.safety_notes.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2.5 text-[11px] font-mono text-amber-200 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-300">Safety & Access Protocol:</strong>
                  {activeTask.safety_notes.join(' · ')}
                </div>
              </div>
            )}

            {/* Multimodal Action & Evidence Form */}
            <div className="pt-2 border-t border-industrial-700 space-y-3">
              {/* PHOTO Task Type */}
              {activeTask.evidence_type === 'PHOTO' && (
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-cyan-400" />
                      Capture Field Evidence Photo
                    </span>
                    <span className="text-[10px] text-slate-500">SHA-256 Validated</span>
                  </label>

                  {/* Camera Upload Button */}
                  <div className="flex gap-2">
                    <label className="flex-1 bg-industrial-700 hover:bg-industrial-600 text-slate-200 text-xs font-mono py-2.5 px-3 rounded-lg border border-industrial-600 flex items-center justify-center gap-2 cursor-pointer transition">
                      <Upload className="h-4 w-4 text-blue-400" />
                      <span>Take Photo / Upload</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* One-Click Sample Asset Selector (For Testing/Demos) */}
                  {sampleAssets.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">
                        Or select quick demo field photo:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {sampleAssets
                          .filter(s => s.target === activeTask.target_asset)
                          .map((sample) => (
                            <button
                              key={sample.id}
                              type="button"
                              onClick={() => handleSelectSample(sample)}
                              className={`text-[10px] font-mono p-1.5 rounded text-left truncate border transition ${
                                selectedSample?.id === sample.id
                                  ? 'bg-blue-600 text-white border-blue-400'
                                  : 'bg-industrial-900 hover:bg-industrial-700 text-slate-300 border-industrial-700'
                              }`}
                            >
                              📷 {sample.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Image Preview */}
                  {previewUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-industrial-600 relative bg-black">
                      <img src={previewUrl} alt="Field Evidence" className="w-full h-44 object-contain" />
                      <div className="absolute bottom-1 right-1 bg-black/70 text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded">
                        ✓ Evidence Ready
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AUDIO Task Type */}
              {activeTask.evidence_type === 'AUDIO' && (
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4 text-cyan-400" />
                    Record 5s Pump Casing Acoustic Sample
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGrabAudio}
                      className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-mono py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      <Mic className="h-4 w-4" />
                      Record from Pump Contact Sensor
                    </button>
                  </div>

                  {previewUrl && (
                    <div className="p-2 bg-industrial-900 rounded-lg border border-industrial-700 flex items-center justify-between">
                      <span className="text-xs font-mono text-emerald-400">✓ 3.0s WAV Sample Recorded</span>
                      <audio controls src={previewUrl} className="h-7 w-44" />
                    </div>
                  )}
                </div>
              )}

              {/* BOUNDED ADJUSTMENT (Valve Slider) */}
              {activeTask.task_type === 'BOUNDED_ADJUSTMENT' && (
                <div className="space-y-2 bg-industrial-900 p-3 rounded-lg border border-industrial-700">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-emerald-400" />
                      Manual Bypass Handwheel Setting
                    </label>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {valveSliderVal}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={valveSliderVal}
                    onChange={(e) => setValveSliderVal(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0% (Closed)</span>
                    <span className="text-emerald-400 font-bold">Target: {activeTask.allowed_delta_pct || 10}%</span>
                    <span>100% (Full Bypass)</span>
                  </div>

                  <p className="text-[10px] text-amber-300 font-mono italic">
                    ⚠️ Compensate for 1.5 turns backlash before setting position (Fact #102).
                  </p>
                </div>
              )}

              {/* Operator Field Notes */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Operator Field Observation Notes (Optional):
                </label>
                <input
                  type="text"
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  placeholder="e.g., Tapped bezel gently per Fact #103; needle moved to 14 psi."
                  className="w-full bg-industrial-900 border border-industrial-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (activeTask.evidence_type === 'PHOTO' && !previewUrl && !selectedSample)}
                className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition ${
                  isSubmitting || (activeTask.evidence_type === 'PHOTO' && !previewUrl && !selectedSample)
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? 'Uploading & Resuming ADK...' : 'Submit Evidence & Resume ADK'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
