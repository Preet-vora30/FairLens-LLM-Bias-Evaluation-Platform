import React, { useEffect, useState } from 'react';
import { Cpu, CheckCircle2, AlertCircle, HardDrive, Zap, Trash2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { ModelRecord } from '../types';

export const ModelRegistryPage: React.FC = () => {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deviceMap, setDeviceMap] = useState<Record<string, string>>({});

  const fetchModels = async () => {
    try {
      const data = await api.getModels();
      setModels(data);
      const devState: Record<string, string> = {};
      data.forEach((m) => {
        devState[m.id] = m.device;
      });
      setDeviceMap(devState);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleLoad = async (modelId: string) => {
    try {
      setActionLoading(modelId);
      await api.loadModel(modelId, deviceMap[modelId] || 'cpu');
      await fetchModels();
    } catch (err: any) {
      alert(`Error loading model: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnload = async (modelId: string) => {
    try {
      setActionLoading(modelId);
      await api.unloadModel(modelId);
      await fetchModels();
    } catch (err: any) {
      alert(`Error unloading model: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Guidance */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          Pretrained Model Registry &amp; Architecture Adapters
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          FairLens AI enforces <strong>task-aware model adapters</strong>. Masked Language Models (BERT, DistilBERT) are evaluated
          via token pseudo-likelihood and masked prediction; encoder models are never presented as conversational generators. Generative models
          (FLAN-T5) are evaluated via open-ended generation and prompt-based completions.
        </p>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {models.map((m) => {
          const isLoaded = m.status === 'loaded';
          const isLoadingThis = actionLoading === m.id;

          return (
            <div
              key={m.id}
              className={`bg-slate-900/90 border rounded-xl p-5 transition flex flex-col justify-between ${
                isLoaded ? 'border-blue-500/50 shadow-md shadow-blue-500/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">{m.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{m.model_identifier}</p>
                  </div>
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                      isLoaded
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isLoaded ? <CheckCircle2 className="w-3 h-3" /> : null}
                    <span>{m.status}</span>
                  </span>
                </div>

                {/* Specs / Tags */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block uppercase font-semibold">Architecture</span>
                    <span className="text-slate-200 font-mono text-[11px]">{m.architecture}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block uppercase font-semibold">Model Family</span>
                    <span className="text-slate-200 font-medium">{m.family}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block uppercase font-semibold">Est. Memory</span>
                    <span className="text-slate-200 font-mono">{m.memory_mb} MB</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block uppercase font-semibold">Assigned Device</span>
                    <select
                      value={deviceMap[m.id] || m.device}
                      onChange={(e) => setDeviceMap({ ...deviceMap, [m.id]: e.target.value })}
                      disabled={isLoaded}
                      className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="cpu" className="bg-slate-900">CPU</option>
                      <option value="cuda" className="bg-slate-900">CUDA</option>
                    </select>
                  </div>
                </div>

                {/* Limitations Warning Box */}
                {m.limitations && (
                  <div className="mt-3.5 bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-slate-400">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p>{m.limitations}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {m.supported_tasks.join(' &bull; ')}
                </span>
                {isLoaded ? (
                  <button
                    onClick={() => handleUnload(m.id)}
                    disabled={isLoadingThis}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Unload Model</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleLoad(m.id)}
                    disabled={isLoadingThis}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-blue-500/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isLoadingThis ? 'Loading...' : 'Load into Memory'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
