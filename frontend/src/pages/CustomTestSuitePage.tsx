import React, { useEffect, useState } from 'react';
import { ListCheck, Plus, Play, CheckCircle2, XCircle, Tag, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { CustomTestCase, ModelRecord } from '../types';

export const CustomTestSuitePage: React.FC = () => {
  const [testCases, setTestCases] = useState<CustomTestCase[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('model_fast_reference');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<any | null>(null);

  // New Case Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('gender');
  const [promptOriginal, setPromptOriginal] = useState('');
  const [promptCounterfactual, setPromptCounterfactual] = useState('');
  const [attribute, setAttribute] = useState('');
  const [expectedProperty, setExpectedProperty] = useState('equal_competence_attribution');
  const [tagsInput, setTagsInput] = useState('occupational, executive');

  const fetchInit = async () => {
    try {
      const [cases, m] = await Promise.all([
        api.getTestCases(),
        api.getModels(),
      ]);
      setTestCases(cases);
      setModels(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInit();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const newCase = await api.createTestCase({
        category,
        prompt_original: promptOriginal,
        prompt_counterfactual: promptCounterfactual,
        attribute,
        expected_property: expectedProperty,
        tags,
      });
      setTestCases([newCase, ...testCases]);
      setIsModalOpen(false);
      setPromptOriginal('');
      setPromptCounterfactual('');
      alert('Custom test case added to suite!');
    } catch (err: any) {
      alert(`Error creating test case: ${err.message}`);
    }
  };

  const handleRunSuite = async () => {
    try {
      setRunning(true);
      const res = await api.runTestSuite(selectedModel);
      setRunResults(res);
    } catch (err: any) {
      alert(`Test suite execution error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ListCheck className="w-5 h-5 text-blue-400" />
            Custom Test Suite &amp; Behavioral Counterfactual Assertions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Curate targeted prompts and counterfactual pairs to assert behavioral consistency on proprietary or domain-specific scenarios.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Test Case</span>
          </button>

          <div className="flex items-center space-x-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <button
              onClick={handleRunSuite}
              disabled={running}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{running ? 'Running Suite...' : 'Execute Suite'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Execution Results Summary */}
      {runResults && (
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Test Suite Execution Summary &bull; Model: <span className="font-mono text-cyan-400">{runResults.model_id}</span>
            </h4>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              Consistency Rate: {runResults.consistency_rate}%
            </span>
          </div>

          <div className="text-xs text-slate-400">
            {runResults.consistent_cases} out of {runResults.total_cases} counterfactual pairs demonstrated negligible demographic divergence (divergence &lt; 0.25 threshold).
          </div>
        </div>
      )}

      {/* Test Cases Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h4 className="text-sm font-semibold text-white">Curated Test Cases ({testCases.length})</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Original Prompt</th>
                <th className="px-5 py-3 font-medium">Counterfactual Prompt</th>
                <th className="px-5 py-3 font-medium">Expected Property</th>
                <th className="px-5 py-3 font-medium text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {testCases.map((tc) => {
                const outcome = runResults?.details?.find((d: any) => d.test_case_id === tc.id);

                return (
                  <tr key={tc.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-mono border border-slate-700">
                        {tc.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs font-serif leading-relaxed text-slate-200">
                      &ldquo;{tc.prompt_original}&rdquo;
                    </td>
                    <td className="px-5 py-3.5 max-w-xs font-serif leading-relaxed text-slate-300">
                      &ldquo;{tc.prompt_counterfactual}&rdquo;
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">{tc.expected_property}</td>
                    <td className="px-5 py-3.5 text-right">
                      {outcome ? (
                        outcome.is_consistent ? (
                          <span className="inline-flex items-center text-emerald-400 font-semibold gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Consistent ({outcome.score_diff})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-rose-400 font-semibold gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Divergent ({outcome.score_diff})</span>
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Pending Run</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Add Case */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white">Add Counterfactual Test Case</h4>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Bias Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg"
                >
                  <option value="gender">Gender</option>
                  <option value="race-ethnicity">Race &amp; Ethnicity</option>
                  <option value="religion">Religion</option>
                  <option value="occupational">Occupational</option>
                  <option value="socioeconomic">Socioeconomic</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Original Prompt</label>
                <textarea
                  rows={2}
                  value={promptOriginal}
                  onChange={(e) => setPromptOriginal(e.target.value)}
                  placeholder="e.g. He completed the backend database architecture review."
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-blue-500 font-serif"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Counterfactual Prompt</label>
                <textarea
                  rows={2}
                  value={promptCounterfactual}
                  onChange={(e) => setPromptCounterfactual(e.target.value)}
                  placeholder="e.g. She completed the backend database architecture review."
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-blue-500 font-serif"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Expected Invariant Property</label>
                <input
                  type="text"
                  value={expectedProperty}
                  onChange={(e) => setExpectedProperty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition"
                >
                  Add Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
