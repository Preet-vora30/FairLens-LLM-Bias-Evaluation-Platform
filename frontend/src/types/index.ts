export interface ModelRecord {
  id: string;
  name: string;
  model_identifier: string;
  architecture: string;
  family: string;
  supported_tasks: string[];
  status: 'registered' | 'downloaded' | 'loaded' | 'error';
  device: string;
  memory_mb: number;
  limitations?: string;
  created_at: string;
  loaded_at?: string | null;
}

export interface DatasetRecord {
  id: string;
  name: string;
  dataset_identifier: string;
  description: string;
  source_url: string;
  version: string;
  license: string;
  supported_tasks: string[];
  supported_categories: string[];
  sample_count: number;
  status: 'ready' | 'downloaded' | 'downloading' | 'error';
  local_path?: string;
  created_at: string;
}

export interface EvaluationJob {
  id: string;
  name: string;
  model_ids: string[];
  dataset_id: string;
  categories: string[];
  metrics: string[];
  sample_limit: number;
  seed: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface EvaluationResult {
  id: string;
  evaluation_id: string;
  model_id: string;
  metric_name: string;
  category: string;
  score: number;
  sample_count: number;
  raw_data: Record<string, any>;
  interpretation: string;
  created_at: string;
}

export interface EvaluationEvidence {
  id: string;
  evaluation_id: string;
  model_id: string;
  sample_id: string;
  category: string;
  input_text: string;
  comparison_text: string;
  raw_scores: Record<string, any>;
  model_preference: string;
  is_stereotypical: boolean;
  explanation: string;
  created_at: string;
}

export interface MitigationExperiment {
  id: string;
  name: string;
  strategy: 'prompt_neutralization' | 'counterfactual_augmentation' | 'representation_projection';
  baseline_model_id: string;
  dataset_id: string;
  category: string;
  baseline_scores: Record<string, any>;
  mitigated_scores: Record<string, any>;
  utility_impact: Record<string, any>;
  status: string;
  details: string;
  created_at: string;
}

export interface CustomTestCase {
  id: string;
  category: string;
  prompt_original: string;
  prompt_counterfactual: string;
  attribute: string;
  expected_property: string;
  tags: string[];
  created_at: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  evaluation_id?: string | null;
  format: string;
  content: string;
  summary_metrics: Record<string, any>;
  created_at: string;
}

export interface SystemStatus {
  status: string;
  project: string;
  version: string;
  cuda_available: boolean;
  device: string;
  cpu_usage_pct: number;
  ram_total_gb: number;
  ram_available_gb: number;
  loaded_models_count: number;
}
