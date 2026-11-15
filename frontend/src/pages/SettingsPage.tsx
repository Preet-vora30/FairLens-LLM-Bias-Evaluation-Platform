import React, { useEffect, useState } from 'react';
import { Settings, Cpu, HardDrive, ShieldCheck, Zap, RefreshCw, Scale, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { SystemStatus, ModelRecord } from '../types';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // WEAT test form
  const [weatModel, setWeatModel] = useState('model_fast_reference');
  const [targetX, setTargetX] = useState('math, algebra, geometry, calculus, computation');
  const [targetY, setTargetY] = useState('poetry, art, dance, literature, novel');
  const [attrA, setAttrA] = useState('male, man, boy, brother, he, his, father');
  const [attrB, setAttrB] = useState('female, woman, girl, sister, she, her, mother');
  const [weatLoading, setWeatLoading] = useState(false);
  const [weatResult, setWeatResult] = useState<any | null>(null);

  const fetchStatus = async () => {
    try {
      const [s, m] = await Promise.all([
        api.getSystemStatus(),
        api.getModels(),
      ]);
      setStatus(s);
      setModels(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunWEAT = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setWeatLoading(true);
      const splitTerms = (s: string) => s.split(',').map((w) => w.trim()).filter(Boolean);
      const res = await api.runWEAT({
        model_id: weatModel,
        target_X: splitTerms(targetX),
        target_Y: splitTerms(targetY),
        attribute_A: splitTerms(attrA),
        attribute_B: splitTerms(attrB),
        n_permutations: 1000,
      });
      setWeatResult(res);
    } catch (err: any) {
      alert(`WEAT error: ${err.message}`);
    } finally {
      setWeatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Hardware Diagnostics */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Hardware Compute &amp; System Health Diagnostics
          </h3>
          <button
            onClick={fetchStatus}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">PyTorch Compute Device</span>
            <span className="text-xl font-bold text-cyan-400 mt-1 block">{status?.device || 'CPU'}</span>
            <span className="text-[11px] text-slate-500">CUDA Acceleration: {status?.cuda_available ? 'Available' : 'Disabled / CPU-only'}</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Host System Memory</span>
            <span className="text-xl font-bold text-white mt-1 block font-mono">{status?.ram_total_gb} GB</span>
            <span className="text-[11px] text-emerald-400">{status?.ram_available_gb} GB available</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">CPU Workload</span>
            <span className="text-xl font-bold text-white mt-1 block font-mono">{status?.cpu_usage_pct}%</span>
            <span className="text-[11px] text-slate-500">Active utilization</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Active Memory Adapters</span>
            <span className="text-xl font-bold text-indigo-400 mt-1 block font-mono">{status?.loaded_models_count}</span>
            <span className="text-[11px] text-slate-500">Models in memory</span>
          </div>
        </div>
      </div>

      {/* WEAT Embedding Association Tester */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            Word Embedding Association Test (WEAT) Calculator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Measures representational geometric bias in text embeddings (Caliskan et al., Science 2017) using permutation significance testing.
          </p>
        </div>

        <form onSubmit={handleRunWEAT} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Model</label>
              <select
                value={weatModel}
                onChange={(e) => setWeatModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Set X (e.g. Math / Science)</label>
              <input
                type="text"
                value={targetX}
                onChange={(e) => setTargetX(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Set Y (e.g. Arts / Humanities)</label>
              <input
                type="text"
                value={targetY}
                onChange={(e) => setTargetY(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Attribute Set A (e.g. Male terms)</label>
              <input
                type="text"
                value={attrA}
                onChange={(e) => setAttrA(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Attribute Set B (e.g. Female terms)</label>
              <input
                type="text"
                value={attrB}
                onChange={(e) => setAttrB(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={weatLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {weatLoading ? 'Running 1,000 Permutations...' : 'Compute WEAT Effect Size & Permutation p-value'}
          </button>
        </form>

        {weatResult && (
          <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 text-xs space-y-2 mt-3">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Effect Size (Cohen&apos;s d): <strong className="text-cyan-400 text-sm">{weatResult.effect_size}</strong></span>
              <span className="text-slate-400">Permutation p-value: <strong className="text-emerald-400 text-sm">{weatResult.p_value}</strong></span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{weatResult.interpretation}</p>
          </div>
        )}
      </div>

      {/* Responsible AI Manifesto */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Responsible AI Measurement Manifesto
        </h3>
        <div className="text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            &bull; <strong>Construct Validity Distinction:</strong> Statistical likelihood preferences on benchmark templates are not synonymous with harmful intent. Models reflect distributional properties of pretraining datasets.
          </p>
          <p>
            &bull; <strong>No Black-Box Scoring:</strong> Every flagged result preserves the full input context, counterfactual sentence, assigned likelihoods, and deterministic rationale.
          </p>
          <p>
            &bull; <strong>Privacy by Design:</strong> FairLens AI operates local-first. No prompt text or model representations are transmitted to third-party endpoints.
          </p>
        </div>
      </div>
    </div>
  );
};
