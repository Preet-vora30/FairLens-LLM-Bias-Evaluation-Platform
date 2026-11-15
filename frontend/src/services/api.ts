import {
  ModelRecord,
  DatasetRecord,
  EvaluationJob,
  EvaluationResult,
  EvaluationEvidence,
  MitigationExperiment,
  CustomTestCase,
  ReportRecord,
  SystemStatus
} from '../types';

const BASE_URL = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errorMsg = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // System
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${BASE_URL}/system/status`);
    return handleResponse<SystemStatus>(res);
  },

  async runWEAT(data: {
    model_id: string;
    target_X: string[];
    target_Y: string[];
    attribute_A: string[];
    attribute_B: string[];
    n_permutations?: number;
  }) {
    const res = await fetch(`${BASE_URL}/system/weat/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Models
  async getModels(): Promise<ModelRecord[]> {
    const res = await fetch(`${BASE_URL}/models`);
    return handleResponse<ModelRecord[]>(res);
  },

  async loadModel(modelId: string, device?: string) {
    const res = await fetch(`${BASE_URL}/models/${modelId}/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: device || 'cpu' }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async unloadModel(modelId: string) {
    const res = await fetch(`${BASE_URL}/models/${modelId}/unload`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Datasets
  async getDatasets(): Promise<DatasetRecord[]> {
    const res = await fetch(`${BASE_URL}/datasets`);
    return handleResponse<DatasetRecord[]>(res);
  },

  async prepareDataset(datasetId: string) {
    const res = await fetch(`${BASE_URL}/datasets/${datasetId}/prepare`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async uploadDataset(file: File, name: string, category: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('category', category);

    const res = await fetch(`${BASE_URL}/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<{ success: boolean; dataset_id: string; sample_count: number }>(res);
  },

  // Evaluations
  async getEvaluations(): Promise<EvaluationJob[]> {
    const res = await fetch(`${BASE_URL}/evaluations`);
    return handleResponse<EvaluationJob[]>(res);
  },

  async createEvaluation(data: {
    name: string;
    model_ids: string[];
    dataset_id: string;
    categories: string[];
    metrics: string[];
    sample_limit: number;
    seed: number;
  }): Promise<EvaluationJob> {
    const res = await fetch(`${BASE_URL}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<EvaluationJob>(res);
  },

  async getEvaluation(id: string): Promise<EvaluationJob> {
    const res = await fetch(`${BASE_URL}/evaluations/${id}`);
    return handleResponse<EvaluationJob>(res);
  },

  async cancelEvaluation(id: string) {
    const res = await fetch(`${BASE_URL}/evaluations/${id}/cancel`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getEvaluationResults(id: string): Promise<EvaluationResult[]> {
    const res = await fetch(`${BASE_URL}/evaluations/${id}/results`);
    return handleResponse<EvaluationResult[]>(res);
  },

  async getEvaluationEvidence(id: string, category?: string, preference?: string): Promise<EvaluationEvidence[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (preference) params.append('preference', preference);

    const res = await fetch(`${BASE_URL}/evaluations/${id}/evidence?${params.toString()}`);
    return handleResponse<EvaluationEvidence[]>(res);
  },

  getExportUrl(id: string, format: 'json' | 'csv'): string {
    return `${BASE_URL}/evaluations/${id}/export?format=${format}`;
  },

  // Playground
  async playgroundGenerate(data: {
    model_id: string;
    prompt: string;
    max_new_tokens?: number;
    temperature?: number;
    apply_neutral_prompt?: boolean;
  }) {
    const res = await fetch(`${BASE_URL}/playground/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Mitigation
  async augmentText(text: string, category: string = 'gender') {
    const res = await fetch(`${BASE_URL}/mitigations/augment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category }),
    });
    return handleResponse<any>(res);
  },

  async neutralizePrompt(text: string) {
    const res = await fetch(`${BASE_URL}/mitigations/neutralize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse<any>(res);
  },

  async getMitigationExperiments(): Promise<MitigationExperiment[]> {
    const res = await fetch(`${BASE_URL}/mitigations/experiments`);
    return handleResponse<MitigationExperiment[]>(res);
  },

  async runMitigationExperiment(data: {
    name: string;
    strategy: string;
    baseline_model_id: string;
    dataset_id: string;
    category?: string;
  }): Promise<MitigationExperiment> {
    const res = await fetch(`${BASE_URL}/mitigations/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<MitigationExperiment>(res);
  },

  // Test Suites
  async getTestCases(): Promise<CustomTestCase[]> {
    const res = await fetch(`${BASE_URL}/testsuites`);
    return handleResponse<CustomTestCase[]>(res);
  },

  async createTestCase(data: {
    category: string;
    prompt_original: string;
    prompt_counterfactual: string;
    attribute?: string;
    expected_property?: string;
    tags?: string[];
  }): Promise<CustomTestCase> {
    const res = await fetch(`${BASE_URL}/testsuites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<CustomTestCase>(res);
  },

  async runTestSuite(model_id: string, test_case_ids?: string[]) {
    const res = await fetch(`${BASE_URL}/testsuites/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id, test_case_ids }),
    });
    return handleResponse<any>(res);
  },

  // Reports
  async getReports(): Promise<ReportRecord[]> {
    const res = await fetch(`${BASE_URL}/reports`);
    return handleResponse<ReportRecord[]>(res);
  },

  async generateReport(title: string, evaluation_id?: string): Promise<ReportRecord> {
    const res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, evaluation_id }),
    });
    return handleResponse<ReportRecord>(res);
  },

  getReportDownloadUrl(reportId: string): string {
    return `${BASE_URL}/reports/${reportId}/download`;
  },
};
