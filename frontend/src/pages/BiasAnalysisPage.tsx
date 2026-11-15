import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Sparkles
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
import { EvaluationJob, EvaluationResult, EvaluationEvidence } from '../types';

export const BiasAnalysisPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const evaluationIdFromUrl = searchParams.get('evaluation_id');

  const [evaluations, setEvaluations] = useState<EvaluationJob[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvaluationEvidence[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [preferenceFilter, setPreferenceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Evaluations List
  useEffect(() => {
    const init = async () => {
      try {
        const evals = await api.getEvaluations();
        setEvaluations(evals);
        if (evals.length > 0) {
          const target = evaluationIdFromUrl && evals.some((e) => e.id === evaluationIdFromUrl)
            ? evaluationIdFromUrl
            : evals[0].id;
          setSelectedEvalId(target);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [evaluationIdFromUrl]);

  // 2. Fetch Results & Evidence for Selected Evaluation
  useEffect(() => {
    if (!selectedEvalId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [res, ev] = await Promise.all([
          api.getEvaluationResults(selectedEvalId),
          api.getEvaluationEvidence(selectedEvalId),
        ]);
        setResults(res);
        setEvidenceList(ev);
        setSearchParams({ evaluation_id: selectedEvalId });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [selectedEvalId, setSearchParams]);

  // Filtered evidence
  const filteredEvidence = evidenceList.filter((ev) => {
    const matchesCategory = categoryFilter === 'all' || ev.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const matchesPref = preferenceFilter === 'all' || ev.model_preference.toLowerCase() === preferenceFilter.toLowerCase();
    const matchesSearch = !searchTerm || ev.input_text.toLowerCase().includes(searchTerm.toLowerCase()) || ev.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesPref && matchesSearch;
  });

  // Chart data from results
  const chartData = results.map((r) => ({
    name: `${r.model_id} (${r.metric_name})`,
    metric: r.metric_name,
    score: r.score,
    category: r.category,
    ci: r.raw_data?.ci_pref_rate || r.raw_data?.ci_ss || [r.score, r.score],
  }));

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Explainable Bias &amp; Fairness Evidence Dashboard
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical results disaggregated by model, task protocol, and demographic category.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedEvalId}
            onChange={(e) => setSelectedEvalId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            {evaluations.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.dataset_id})
              </option>
            ))}
          </select>

          {selectedEvalId && (
            <div className="flex items-center space-x-1.5">
              <a
                href={api.getExportUrl(selectedEvalId, 'csv')}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </a>
              <a
                href={api.getExportUrl(selectedEvalId, 'json')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r) => {
          const isStereoRate = r.metric_name === 'stereotype_pref_rate' || r.metric_name === 'ss';
          const deviation = isStereoRate ? (r.score - 50.0).toFixed(1) : null;
          const ci = r.raw_data?.ci_pref_rate || r.raw_data?.ci_ss || null;

          return (
            <div key={r.id} className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase text-cyan-400">{r.metric_name}</span>
                <span className="font-mono text-[11px] text-slate-500">{r.model_id}</span>
              </div>
              <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-2">
                <span>{r.score.toFixed(1)}%</span>
                {deviation && (
                  <span className={`text-xs font-semibold ${Number(deviation) > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ({Number(deviation) > 0 ? `+${deviation}` : deviation}% from parity)
                  </span>
                )}
              </div>
              {ci && (
                <div className="text-[11px] text-slate-400 mt-1">
                  95% Bootstrap CI: [{ci[0]}%, {ci[1]}%]
                </div>
              )}
              <div className="text-xs text-slate-300 mt-2 bg-slate-950/50 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                {r.interpretation}
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Scores Chart */}
      {chartData.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-2">Audited Metric Values vs Parity Threshold</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-800 border border-slate-700 p-2 rounded text-xs shadow-xl">
                          <p className="font-semibold text-white">{data.name}</p>
                          <p className="text-cyan-400 mt-0.5">Score: {data.score.toFixed(1)}%</p>
                          {data.ci && <p className="text-slate-400">CI: [{data.ci[0]}%, {data.ci[1]}%]</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={50} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Parity 50%', fill: '#10b981', fontSize: 10 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.score > 54 ? '#f43f5e' : entry.score < 46 ? '#f59e0b' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Example Traceable Evidence Explorer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Per-Example Traceable Evidence ({filteredEvidence.length} instances)
            </h4>
            <p className="text-xs text-slate-400">
              Inspect model decision traces, prompt pairs, likelihood scores, and transparent rationales.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search sentence keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="gender">Gender</option>
              <option value="race">Race / Ethnicity</option>
              <option value="religion">Religion</option>
              <option value="profession">Profession</option>
            </select>

            <select
              value={preferenceFilter}
              onChange={(e) => setPreferenceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="all">All Preferences</option>
              <option value="stereotypical">Stereotypical</option>
              <option value="anti-stereotypical">Anti-Stereotypical</option>
              <option value="consistent">Consistent</option>
              <option value="divergent">Divergent</option>
            </select>
          </div>
        </div>

        {/* Evidence Cards */}
        <div className="space-y-3">
          {filteredEvidence.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No evidence records matched your active filter criteria.
            </div>
          ) : (
            filteredEvidence.map((ev) => {
              const isStereo = ev.model_preference === 'stereotypical' || ev.is_stereotypical;

              return (
                <div
                  key={ev.id}
                  className={`p-4 rounded-xl border bg-slate-950/60 transition space-y-2.5 ${
                    isStereo ? 'border-rose-500/30' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-cyan-400 font-semibold">{ev.sample_id}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                        {ev.category}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">{ev.model_id}</span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        isStereo
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {ev.model_preference}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                        Input Sentence (Stereotype / Baseline)
                      </span>
                      <p className="text-slate-200 font-serif leading-relaxed italic">&ldquo;{ev.input_text}&rdquo;</p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                        Comparison Sentence (Anti-Stereotype / Counterfactual)
                      </span>
                      <p className="text-slate-200 font-serif leading-relaxed italic">&ldquo;{ev.comparison_text}&rdquo;</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80 flex items-start space-x-2">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-slate-300">Evidence Rationale: </strong>
                      {ev.explanation}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
