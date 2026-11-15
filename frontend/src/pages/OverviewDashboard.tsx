import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Database,
  FlaskConical,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info,
  Layers,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { ModelRecord, DatasetRecord, EvaluationJob, EvaluationResult, MitigationExperiment, SystemStatus } from '../types';

export const OverviewDashboard: React.FC = () => {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationJob[]>([]);
  const [mitigations, setMitigations] = useState<MitigationExperiment[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [resultsByEval, setResultsByEval] = useState<Record<string, EvaluationResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [m, d, e, mit, s] = await Promise.all([
        api.getModels(),
        api.getDatasets(),
        api.getEvaluations(),
        api.getMitigationExperiments(),
        api.getSystemStatus(),
      ]);
      setModels(m);
      setDatasets(d);
      setEvaluations(e);
      setMitigations(mit);
      setStatus(s);

      // Load persisted results for every completed evaluation so charts reflect real measurements.
      const completed = e.filter((job) => job.status === 'completed');
      const resultsMap: Record<string, EvaluationResult[]> = {};
      await Promise.all(
        completed.map(async (job) => {
          try {
            const res = await api.getEvaluationResults(job.id);
            resultsMap[job.id] = res;
          } catch {
            resultsMap[job.id] = [];
          }
        })
      );
      setResultsByEval(resultsMap);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completedEvals = useMemo(() => evaluations.filter((e) => e.status === 'completed'), [evaluations]);

  // Real stereotype-preference observations aggregated per bias category.
  const benchmarkComparisonData = useMemo(
    () =>
      byCategoryFromResults(resultsByEval).map((r) => ({
        category: r.category,
        rate: Number(r.rate.toFixed(1)),
        sample_count: r.sample_count,
        deviation: ((Number(r.rate) - 50.0) * 100).toFixed(1) + '%',
        flagged: Number(r.rate) > 55,
      })),
    [resultsByEval]
  );

  // Latest multi-model comparison derived from the most recent completed evaluation.
  const latestComparison = useMemo(() => {
    const candidates = completedEvals
      .filter((e) => e.model_ids.length > 1)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (candidates.length === 0) return null;
    const job = candidates[0];
    const results = resultsByEval[job.id] || [];
    const preferenceResults = results.filter(
      (r) => r.metric_name === 'ss' || r.metric_name === 'stereotype_pref_rate'
    );
    if (preferenceResults.length === 0) return null;

    const metricNames = Array.from(new Set(preferenceResults.map((r) => r.metric_name)));
    const comparisonData = metricNames.map((metric) => ({
      metric,
      rows: preferenceResults
        .filter((r) => r.metric_name === metric)
        .map((r) => ({
          model: r.model_id,
          rate: r.score,
          ci: r.raw_data?.ci_pref_rate || r.raw_data?.ci_ss || [r.score, r.score],
        })),
    }));

    return { evaluation: job, comparisonData };
  }, [completedEvals, resultsByEval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading research dashboard metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/50 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3 shadow-lg">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white font-semibold">Measurement Integrity Principle: </strong>
          Stereotype Preference Rates measure algorithmic probability differentials over paired benchmark templates.
          Statistical preference does not automatically equate to intentional real-world harm. Always disaggregate by demographic category.
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="ml-auto flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Registered Models</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{models.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{models.filter((m) => m.status === 'loaded').length}</span> loaded in memory
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Evaluations Conducted</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{evaluations.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">{completedEvals.length}</span> verified completed
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mitigation Experiments</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{mitigations.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-cyan-400 font-semibold">{mitigations.filter((m) => m.status === 'completed').length}</span> completed interventions
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Benchmark Datasets</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{datasets.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">StereoSet, CrowS-Pairs, WinoBias</div>
        </div>
      </div>

      {/* Main Charts & Parity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parity Bar Chart (real persisted results) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Stereotype Preference Rate by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Reference threshold: 50.0% (Equally likely preference / zero demographic skew)</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
              Ideal: 50.0%
            </span>
          </div>

          {benchmarkComparisonData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkComparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-xs shadow-xl">
                            <p className="font-semibold text-white">{data.category}</p>
                            <p className="text-cyan-400 mt-1">Measured Score: {data.rate}%</p>
                            <p className="text-slate-400">Ideal Parity: 50.0%</p>
                            <p className="text-amber-400">Deviation: {data.deviation}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={50} stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Parity 50%', fill: '#10b981', fontSize: 10 }} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {benchmarkComparisonData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.rate > 55 ? '#f43f5e' : entry.rate < 45 ? '#f59e0b' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-6">
              <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
              <p>No persisted stereotype preference results yet.</p>
              <p className="mt-1">Run an evaluation from the Evaluation Lab to populate this chart with real measurements.</p>
              <Link to="/evaluations" className="mt-3 text-blue-400 hover:text-blue-300 font-medium text-xs">
                Launch New Audit &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Quick Launch & Hardware Summary */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Quick Evaluation Launch</h3>
            <p className="text-xs text-slate-400 mt-1">Configure and execute an automated bias audit across registered models.</p>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
                <div className="font-medium text-slate-200">Active Test Target:</div>
                <div className="text-blue-400 mt-0.5">StereoSet &bull; CrowS-Pairs &bull; WinoBias</div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
                <div className="font-medium text-slate-200">Hardware Runtime:</div>
                <div className="text-emerald-400 mt-0.5">
                  PyTorch CPU Threading &bull; CUDA {status?.cuda_available ? 'Enabled' : 'Not Detected'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              to="/evaluations"
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-md shadow-blue-500/20"
            >
              <span>Launch New Audit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Latest Model Comparison */}
      {latestComparison && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Latest Multi-Model Comparison
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Experiment: {latestComparison.evaluation.name} &bull; Dataset: {latestComparison.evaluation.dataset_id}
              </p>
            </div>
            <Link to={`/analysis?evaluation_id=${latestComparison.evaluation.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1">
              Open in Bias Analysis
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Metric</th>
                  {latestComparison.comparisonData[0]?.rows.map((row) => (
                    <th key={row.model} className="px-5 py-3 font-medium text-center">{row.model}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {latestComparison.comparisonData.map((group) => (
                  <tr key={group.metric}>
                    <td className="px-5 py-3.5 font-semibold text-white font-mono">{group.metric}</td>
                    {group.rows.map((row) => (
                      <td key={row.model} className="px-5 py-3.5 text-center font-mono">{row.rate.toFixed(1)}%</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Evaluations Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Evaluation Audits</h3>
            <p className="text-xs text-slate-400">Historical records of model benchmark runs and reproducibility parameters.</p>
          </div>
          <Link to="/analysis" className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1">
            <span>View All Evidence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-medium">Experiment Name</th>
                <th className="px-5 py-3 font-medium">Dataset</th>
                <th className="px-5 py-3 font-medium">Models Tested</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No evaluations executed yet. Click &quot;Launch New Audit&quot; to begin.
                  </td>
                </tr>
              ) : (
                evaluations.slice(0, 5).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-semibold text-white">{ev.name}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">{ev.dataset_id}</td>
                    <td className="px-5 py-3.5">{ev.model_ids.join(', ')}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          ev.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ev.status === 'running'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${ev.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/analysis?evaluation_id=${ev.id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsible AI note */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-start space-x-3">
        <Scale className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Fairness vs. Harm:</strong> Bias metrics quantify statistical associations and preference patterns
          in model representations and outputs. They do not, by themselves, establish real-world harm or discriminatory intent.
          Reported effect sizes and confidence intervals accompany every persisted metric.
        </div>
      </div>
    </div>
  );
};

// Helper kept outside the component to satisfy memo hooks rules.
function byCategoryFromResults(resultsByEval: Record<string, EvaluationResult[]>): Array<{ category: string; rate: number; sample_count: number }> {
  const byCategory = new Map<string, { sum: number; count: number; sample_count: number }>();
  Object.values(resultsByEval)
    .flat()
    .forEach((r) => {
      const isPreferenceMetric = r.metric_name === 'ss' || r.metric_name === 'stereotype_pref_rate';
      if (!isPreferenceMetric) return;
      const category = r.category || 'overall';
      if (category === 'overall') return;
      const bucket = byCategory.get(category) || { sum: 0.0, count: 0, sample_count: 0 };
      bucket.sum += r.score;
      bucket.count += 1;
      bucket.sample_count += r.sample_count || 0;
      byCategory.set(category, bucket);
    });

  return Array.from(byCategory.entries()).map(([category, b]) => ({
    category,
    rate: b.sum / b.count,
    sample_count: b.sample_count,
  }));
}
