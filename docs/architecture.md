# FairLens AI — System Architecture

## 1. Overview

FairLens AI is a Responsible AI evaluation platform for large language models. It combines a
FastAPI backend, a React/TypeScript dashboard, task-aware model adapters, established bias
benchmarks, and a mitigation studio into a single reproducible research environment.

```
fairlens-ai/
├── backend/                     # FastAPI + SQLAlchemy (SQLite) + ML services
│   └── app/
│       ├── api/v1/              # REST routers (health, models, datasets, evaluations, playground, mitigations, testsuites, reports, exports, system)
│       ├── core/                # Settings, config, security helpers
│       ├── db/                  # SQLAlchemy engine, models, init/migration
│       ├── schemas/             # Pydantic request/response contracts
│       ├── services/            # model registry, dataset registry, metrics, evaluation, mitigation, reporting
│       └── main.py              # Application factory
├── frontend/                    # React 19 + TypeScript + Vite + Tailwind + Recharts
├── datasets/                    # Benchmark fixtures, configs, cache, test fixtures
├── experiments/                 # Experiment configs and notes
├── reports/                     # Generated report artifacts
└── docs/                        # Methodology and responsible-AI documentation
```

## 2. Backend Design

### 2.1 API Layer

All routes are versioned under `/api/v1` and grouped by domain:

| Domain | Prefix | Purpose |
| :--- | :--- | :--- |
| Health | `/api/v1/health` | Liveness probe |
| System | `/api/v1/system` | Status diagnostics, WEAT computation |
| Models | `/api/v1/models` | Registry listing, load/unload |
| Datasets | `/api/v1/datasets` | Benchmark listing, prepare, upload |
| Evaluations | `/api/v1/evaluations` | Jobs, results, evidence, export |
| Playground | `/api/v1/playground` | Baseline vs neutralized generation |
| Mitigations | `/api/v1/mitigations` | CDA, neutralization, experiments |
| Test Suites | `/api/v1/testsuites` | Custom counterfactual cases |
| Reports | `/api/v1/reports` | Report compilation, retrieval, download, PDF |
| Exports | `/api/v1/exports` | Machine-readable experiment exports |

Conventions:

- Request and response models are defined with Pydantic v2 (`app/schemas/`).
- Errors use FastAPI HTTPException with human-readable detail messages.
- Long-running evaluations are dispatched to a background worker thread; job state is persisted.
- Exports are available as JSON or CSV.

### 2.2 Persistence

SQLite via SQLAlchemy ORM (`app/db/models.py`). Core tables:

- `models` — registered model metadata and runtime status.
- `datasets` — benchmark metadata and local cache paths.
- `evaluation_jobs` — job configuration snapshot and lifecycle status.
- `evaluation_results` — per-metric scores with raw data and interpretation.
- `evaluation_evidence` — per-example traces with raw scores and rationales.
- `mitigation_experiments` — baseline vs mitigated comparisons and utility impact.
- `custom_test_cases` — researcher-curated counterfactual cases.
- `reports` — generated report artifacts.
- `system_settings` — runtime configuration overrides.

Schema is initialized with `Base.metadata.create_all` and seeded via `app/db/init_db.py`.
No model weights or large datasets are stored in the database.

### 2.3 Service Layer

- `services/model_registry/` — model registry manager with lazy loading and task-aware adapters
  (`MaskedLMAdapter`, `Seq2SeqGenerativeAdapter`, deterministic reference adapter).
- `services/dataset_registry/` — benchmark loaders and validation.
- `services/metrics/` — StereoSet, CrowS-Pairs, WEAT, counterfactual, generation metrics.
- `services/evaluation/` — evaluation orchestration and background job worker.
- `services/mitigation/` — prompt neutralization, counterfactual augmentation, projection debiasing.
- `services/reporting/` — report generation and exports.

## 3. Frontend Design

React SPA with React Router. Pages map to functional backend flows:

- Overview Dashboard — KPI counts, real persisted results, parity charts, latest comparisons.
- Model Registry — load/unload, device selection, capability inspection.
- Dataset Explorer — benchmark metadata, upload, prepare.
- Evaluation Lab — multi-model, multi-benchmark audit configuration.
- Bias Analysis — persisted metric results and per-example evidence with filters.
- Prompt Playground — baseline vs neutralized generation, counterfactuals.
- Mitigation Studio — mitigation experiments and trade-offs.
- Research Reports — report compilation, viewing, export.
- Custom Test Suite — researcher-defined counterfactual cases.
- Settings & Status — hardware diagnostics, WEAT, responsible AI notes.

The frontend consumes only the versioned REST API via `src/services/api.ts`; the Vite dev server
proxies `/api` to the backend.

## 4. Security & Reliability Notes

- Environment-driven configuration via `app/core/config.py` (`.env`).
- Upload size limit (5 MB), extension allow-list, filename sanitization, randomized storage keys.
- No arbitrary code execution; datasets are parsed as data only.
- No secrets are exposed to the frontend; credentials (e.g., HF token) live in backend environment.
- Structured error handling with consistent HTTP status codes (400/404/409/413/500).

## 5. Data Flow for an Evaluation

1. User configures models, dataset, categories, metrics, sample limit, seed in Evaluation Lab.
2. `POST /api/v1/evaluations` persists a job and dispatches a background worker.
3. Worker loads adapters, loads dataset records, scores examples, computes metrics, persists results/evidence.
4. Client polls `GET /api/v1/evaluations/{id}` for status/progress.
5. Results persist; Bias Analysis and Reports read persisted records.
6. Exports via `GET /api/v1/evaluations/{id}/export?format=json|csv` and `GET /api/v1/exports/{experiment_id}`.

## 6. Extension Points

- New bias categories: add to evaluation category configuration, metrics, and frontend constants.
- New datasets: register metadata and loader in dataset registry.
- New models: register metadata and adapter in model registry.
- New metrics: add metric computation service and persist via evaluation orchestrator.
