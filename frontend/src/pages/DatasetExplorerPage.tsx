import React, { useEffect, useState } from 'react';
import { Database, FileCheck, Upload, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { DatasetRecord } from '../types';

export const DatasetExplorerPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('gender');
  const [uploading, setUploading] = useState(false);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      const data = await api.getDatasets();
      setDatasets(data);
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handlePrepare = async (datasetId: string) => {
    try {
      setPreparingId(datasetId);
      const res = await api.prepareDataset(datasetId);
      alert(res.message);
      await fetchDatasets();
    } catch (err: any) {
      alert(`Preparation error: ${err.message}`);
    } finally {
      setPreparingId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) {
      alert('Please select a file and enter a dataset name.');
      return;
    }
    try {
      setUploading(true);
      const res = await api.uploadDataset(uploadFile, uploadName, uploadCategory);
      alert(`Dataset uploaded successfully with ${res.sample_count} samples.`);
      setUploadFile(null);
      setUploadName('');
      await fetchDatasets();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Custom Benchmark Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-400" />
          Upload Custom Evaluation Benchmark
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Upload research prompts or paired counterfactual test cases (.json or .csv). Custom files are validated for schema integrity.
        </p>

        <form onSubmit={handleUpload} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Dataset Name (e.g. Legal Fairness Suite)"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="gender">Gender Stereotypes</option>
            <option value="race-ethnicity">Race &amp; Ethnicity</option>
            <option value="religion">Religious Bias</option>
            <option value="occupational">Occupational Coreference</option>
            <option value="counterfactual">Counterfactual Pairs</option>
          </select>
          <input
            type="file"
            accept=".json,.csv"
            onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
            className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            {uploading ? 'Processing File...' : 'Upload & Validate'}
          </button>
        </form>
      </div>

      {/* Benchmark Datasets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {datasets.map((d) => (
          <div
            key={d.id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-white tracking-tight">{d.name}</h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono text-cyan-400">{d.dataset_identifier}</span>
                    <span>&bull;</span>
                    <span>v{d.version}</span>
                    <span>&bull;</span>
                    <span>{d.license}</span>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {d.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">{d.description}</p>

              {/* Supported Categories Pills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {d.supported_categories.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Verified Samples: <strong className="text-white font-mono">{d.sample_count}</strong></span>
                {d.source_url && (
                  <a
                    href={d.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                  >
                    <span>Benchmark Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => handlePrepare(d.id)}
                disabled={preparingId === d.id}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{preparingId === d.id ? 'Verifying Local Storage...' : 'Verify Local Benchmark Cache'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
