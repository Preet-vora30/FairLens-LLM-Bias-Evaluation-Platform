import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Play, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';
import { ModelRecord, DatasetRecord, EvaluationJob } from '../types';

export const EvaluationLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [activeJobs, setActiveJobs] = useState<EvaluationJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('Comparative Bias Audit - ' + new Date().toLocaleDateString());
  const [selectedModels, setSelectedModels] = useState<string[]>(['model_fast_reference']);
  const [selectedDataset, setSelectedDataset] = useState<string>('ds_crows_pairs');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['gender', 'race-color']);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['stereotype_pref_rate']);
  const [sampleLimit, setSampleLimit] = useState<number>(20);
  const [seed, setSeed] = useState<number>(42);
  const [submitting, setSubmitting] = useState(false);

  const fetchInitData = async () => {
    try {
      const [m, d, j] = await Promise.all([
        api.getModels(),
        api.getDatasets(),
        api.getEvaluations(),
      ]);
      setModels(m);
      setDatasets(d);
      setActiveJobs(j.filter((job) => job.status === 'running' || job.status === 'pending'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitData();
    const interval = setInterval(async () => {
      try {
        const j = await api.getEvaluations();
        setActiveJobs(j.filter((job) => job.status === 'running' || job.status === 'pending'));
      } catch (err) {
        // silent poll
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleModelToggle = (id: string) => {
    if (selectedModels.includes(id)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter((m) => m !== id));
      }
    } else {
      setSelectedModels([...selectedModels, id]);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModels.length === 0 || !selectedDataset) {
      alert('Please select at least one model and a dataset.');
      return;
    }

    try {
      setSubmitting(true);
      const newJob = await api.createEvaluation({
        name,
        model_ids: selectedModels,
        dataset_id: selectedDataset,
        categories: selectedCategories,
        metrics: selectedMetrics,
        sample_limit: sampleLimit,
        seed,
      });

      // Poll briefly then navigate to analysis
      setTimeout(() => {
        navigate(`/analysis?evaluation_id=${newJob.id}`);
      }, 1500);
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Running Jobs Banner */}
      {activeJobs.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Active Evaluation In Progress ({activeJobs.length} active)</span>
          </div>
          {activeJobs.map((job) => (
            <div key={job.id} className="bg-slate-900 p-3 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white">{job.name}</span>
                <span className="text-slate-400 ml-2 font-mono">[{job.dataset_id}]</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                </div>
                <span className="font-mono text-cyan-400">{job.progress.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleLaunch} className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-400" />
            Configure New Bias &amp; Parity Evaluation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select one or more pretrained language models, an established benchmark dataset, and experimental parameters.
          </p>
        </div>

        {/* Experiment Title */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
            Evaluation Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
            required
          />
        </div>

        {/* Step 1: Select Models */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
            1. Select Models to Evaluate (Multi-select for model comparison)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {models.map((m) => {
              const isChecked = selectedModels.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => handleModelToggle(m.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition flex items-start space-x-3 ${
                    isChecked
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-sm shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-1 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <div>
                    <h5 className="text-sm font-semibold text-white">{m.name}</h5>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{m.architecture} &bull; {m.device}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Dataset */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
            2. Select Evaluation Benchmark
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {datasets.map((d) => {
              const isSelected = selectedDataset === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDataset(d.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition flex items-start space-x-3 ${
                    isSelected
                      ? 'bg-cyan-600/15 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="dataset"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <div>
                    <h5 className="text-sm font-semibold text-white">{d.name}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{d.description}</p>
                    <div className="mt-1.5 flex gap-1">
                      {d.supported_categories.map((c) => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Hyperparameters & Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Evaluation Sample Limit: <strong className="text-blue-400">{sampleLimit}</strong> samples
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={sampleLimit}
              onChange={(e) => setSampleLimit(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Smaller limits evaluate faster on CPU systems.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Reproducibility Random Seed
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Fixed seed guarantees bootstrap confidence interval reproducibility.</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{submitting ? 'Initializing Job...' : 'Execute Audit Pipeline'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
