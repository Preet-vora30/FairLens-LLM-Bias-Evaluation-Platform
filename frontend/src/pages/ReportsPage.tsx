import React, { useEffect, useState } from 'react';
import { FileText, Download, Plus, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { ReportRecord, EvaluationJob } from '../types';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationJob[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // New Report Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Comprehensive Bias & Fairness Evaluation Audit');
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const fetchInit = async () => {
    try {
      const [reps, evals] = await Promise.all([
        api.getReports(),
        api.getEvaluations(),
      ]);
      setReports(reps);
      setEvaluations(evals);
      if (reps.length > 0) {
        setSelectedReport(reps[0]);
      }
      if (evals.length > 0) {
        setSelectedEvalId(evals[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInit();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const rep = await api.generateReport(newTitle, selectedEvalId || undefined);
      setReports([rep, ...reports]);
      setSelectedReport(rep);
      setIsModalOpen(false);
      alert('Research report successfully compiled!');
    } catch (err: any) {
      alert(`Report compilation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Research Paper &amp; Reproducible Audit Reports
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-generate standards-compliant research reports containing abstract, methodology, empirical metrics, evidence, and citations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Compile New Audit Report</span>
        </button>
      </div>

      {/* Main Layout: List & Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reports Index */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 max-h-[750px] overflow-y-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Archived Audit Reports ({reports.length})
          </h4>
          {reports.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No reports compiled yet. Click &quot;Compile New Audit Report&quot; to synthesize results.
            </div>
          ) : (
            reports.map((r) => {
              const isSelected = selectedReport?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`p-3 rounded-lg border cursor-pointer transition space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-sm shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <h5 className="text-xs font-semibold text-white line-clamp-1">{r.title}</h5>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-cyan-400">{r.id}</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Report Content Viewer */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          {!selectedReport ? (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select an audit report from the left column to view the complete academic manuscript.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedReport.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Report ID: <span className="font-mono text-cyan-400">{selectedReport.id}</span></p>
                </div>

                <a
                  href={api.getReportDownloadUrl(selectedReport.id)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition border border-slate-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .md</span>
                </a>
              </div>

              {/* Rendered Markdown Body */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed max-h-[600px] overflow-y-auto whitespace-pre-wrap select-text">
                {selectedReport.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for New Report */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white">Compile Research Audit Report</h4>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Report Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Source Completed Evaluation</label>
                <select
                  value={selectedEvalId}
                  onChange={(e) => setSelectedEvalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {evaluations.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.dataset_id})
                    </option>
                  ))}
                </select>
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
                  disabled={generating}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
                >
                  {generating ? 'Compiling Report...' : 'Compile & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
