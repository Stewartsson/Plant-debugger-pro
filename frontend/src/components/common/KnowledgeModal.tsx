import React, { useState, useEffect } from 'react';
import { SiteKnowledgeFact } from '../../types';
import { BookOpen, X, PlusCircle, CheckCircle, ShieldCheck } from 'lucide-react';

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({ isOpen, onClose }) => {
  const [facts, setFacts] = useState<SiteKnowledgeFact[]>([]);
  const [assetTag, setAssetTag] = useState('F-17');
  const [assertion, setAssertion] = useState('');
  const [author, setAuthor] = useState('Operator Dave Miller');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFacts = () => {
    fetch('/api/knowledge/facts')
      .then(r => r.json())
      .then(data => setFacts(data))
      .catch(e => console.error(e));
  };

  useEffect(() => {
    if (isOpen) {
      fetchFacts();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assertion.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/knowledge/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_tag: assetTag,
          assertion: assertion.trim(),
          author: author.trim(),
          tags: [assetTag, 'field-observation']
        })
      });
      setAssertion('');
      fetchFacts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-industrial-800 border border-industrial-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-industrial-700 flex items-center justify-between bg-industrial-900">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wide">
                Tacit Site Knowledge Repository
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">Conservative Operator Assertions · Fed into Future ADK Contexts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-industrial-700 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Info callout */}
          <div className="bg-blue-950/20 border border-blue-500/30 p-3 rounded-xl text-xs font-mono text-blue-200">
            <strong>Conservative Memory Policy:</strong> Only explicit human assertions become permanent plant knowledge. Gemini diagnoses, temporary sensor values, and work order results are <em>never</em> silently promoted.
          </div>

          {/* List of Facts */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase">
              Current Durable Plant Facts ({facts.length})
            </h3>
            {facts.map((f) => (
              <div key={f.fact_id} className="p-3 rounded-xl bg-industrial-900 border border-industrial-700 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {f.fact_id} · {f.asset_tag}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" /> Verified Human Fact
                  </span>
                </div>
                <p className="text-slate-200 text-[12px] leading-relaxed pt-1">
                  "{f.assertion}"
                </p>
                <div className="text-[10px] text-slate-400 pt-1 flex justify-between">
                  <span>Author: {f.author}</span>
                  <span>{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Author new fact form */}
          <form onSubmit={handleSubmit} className="p-3 bg-industrial-900/90 border border-industrial-700 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4 text-emerald-400" /> Author New Plant Site Fact
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Asset Tag:</label>
                <select
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="w-full bg-industrial-800 border border-industrial-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                >
                  <option value="F-17">F-17 (Duplex Strainer)</option>
                  <option value="BV-104">BV-104 (Manual Bypass)</option>
                  <option value="P-101">P-101 (Centrifugal Pump)</option>
                  <option value="FT-101">FT-101 (Flow Meter)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Operator / Badge ID:</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-industrial-800 border border-industrial-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">
                Tacit Assertion (Physical access, valve feel, gauge quirk, maintenance note):
              </label>
              <textarea
                value={assertion}
                onChange={(e) => setAssertion(e.target.value)}
                rows={2}
                placeholder="e.g., Bypass BV-104 handwheel stem gland nut tends to weep slightly when fully stroked; tighten 1/4 turn."
                className="w-full bg-industrial-800 border border-industrial-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !assertion.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-mono text-xs font-bold py-2 rounded-lg transition"
            >
              {isSubmitting ? 'Recording...' : 'Commit Fact to Site Knowledge'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
