# FairLens AI: Explainable Bias and Fairness Evaluation Platform for Large Language Models

**FairLens AI** is a complete, research-oriented Responsible AI platform that evaluates pretrained
large language models for social and representational bias, explains flagged findings, compares
models under a consistent methodology, and runs mitigation experiments before and after intervention.

> **Measurement integrity:** Stereotype preference statistics measure statistical associations and
> benchmark-defined preferences in model behavior. They are **not** treated as conclusive proof of
> discriminatory intent or real-world harm.

---

## 1. Features

- **Model registry** with task-aware adapters (Masked LM, Seq2Seq generation, deterministic reference),
  lazy loading, CPU/CUDA selection, and memory metadata.
- **Benchmarks**: StereoSet (LMS / SS / ICAT), CrowS-Pairs (stereotype preference rate), WinoBias
  (occupational coreference), plus user-uploaded custom paired benchmarks.
- **Metrics**: bootstrap confidence intervals, effect sizes, permutation tests (WEAT), counterfactual
  consistency, generation indicators.
- **Evaluation Lab**: reproducible multi-model experiments with categories, metrics, sample limits,
  seeds, background jobs, progress, cancellation, evidence, and exports.
- **Bias Analysis**: persisted results, per-example evidence explorer, filters, charts.
- **Prompt Playground**: baseline vs neutralized generation, counterfactual prompt pairs.
- **Mitigation Studio**: prompt neutralization, counterfactual data augmentation, representation-level
  projection experiments, baseline/mitigated comparisons, utility trade-offs.
- **Research Reports**: auto-generated markdown reports, JSON/CSV exports, optional PDF.
- **Custom Test Suite**: researcher-curated counterfactual cases.
- **Settings & Status**: hardware diagnostics, WEAT, Responsible AI notes.

## 2. Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Recharts, React Router, Lucide |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy, SQLite, Uvicorn |
| ML | PyTorch (CPU-first), Hugging Face Transformers, scikit-learn, pandas, numpy |
| Metrics | Bootstrap CIs, permutation tests, effect sizes |
| Reports | Markdown, JSON, CSV, optional PDF (WeasyPrint) |

## 3. System Requirements

- Backend: Python 3.11+, 8 GB RAM (CPU), network access for first-time model download.
- Frontend: Node.js 18+, npm.
- Hardware: CPU-only supported; CUDA optional.

## 4. Installation

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Frontend
cd frontend
npm install
npm run dev
```

## 5. Configuration

`backend/.env.example`:

```
PROJECT_NAME="FairLens AI"
ENVIRONMENT="development"
DEBUG=True
API_V1_STR="/api/v1"
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

DATABASE_URL="sqlite:///./fairlens.db"
MODEL_CACHE_DIR="./cache/models"
DATASET_CACHE_DIR="./cache/datasets"
REPORTS_DIR="./reports"

DEFAULT_DEVICE="cpu"
ALLOW_CUDA=True
BATCH_SIZE=8
MAX_SEQUENCE_LENGTH=128
SEED=42
```

Add optional `HF_TOKEN` for higher rate limits on Hugging Face Hub.

## 6. Running

- Backend: `uvicorn app.main:app --host 127.0.0.1 --port 8000` → docs at `http://127.0.0.1:8000/docs`
- Frontend: `npm run dev` → `http://localhost:5173`
- API base: `http://127.0.0.1:8000/api/v1`

## 7. First Evaluation Walkthrough

1. Open Model Registry, load `DistilBERT Base Uncased` (or the deterministic reference adapter).
2. Open Dataset Explorer, prepare a benchmark.
3. Open Evaluation Lab, select models + dataset, choose categories/metrics, launch.
4. Open Bias Analysis to inspect results and evidence.
5. Open Reports and compile/export.

## 8. Testing

```bash
cd backend
python -m pytest -q
```

Frontend build check: `cd frontend && npm run build`.

## 9. Project Documentation

- `docs/architecture.md`
- `docs/evaluation_methodology.md`
- `docs/metrics.md`
- `docs/responsible_ai.md`
- `docs/troubleshooting.md`
- `docs/research_paper_outline.md`

## 10. Known Limitations

- CPU-only inference on laptops; GPU recommended for larger models.
- Encoder models evaluated via pseudo-likelihood; not conversational generators.
- Benchmark coverage is a small, carefully curated subset.
- Mitigation results are task-specific and measured, not universal.

## 11. License

See `LICENSE`.
