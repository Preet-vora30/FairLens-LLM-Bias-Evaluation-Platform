# FairLens AI: Project Overview & Architecture Guide

**FairLens AI** is an open-source, research-oriented **Responsible AI & NLP evaluation platform**. It audits Large Language Models (LLMs) and masked language models for social, demographic, and occupational biases, explains the statistical evidence behind flagged examples, and tests mitigation strategies to reduce bias without degrading model language capabilities.

---

## 1. What the Project Does

Language models trained on vast web corpora frequently encode, amplify, and reflect societal stereotypes (e.g., disproportionately associating specific genders, races, religions, or ages with stereotypical professions or attributes).

FairLens AI answers a critical research question:
> *"Does a given language model systematically exhibit bias against demographic groups, and can we mitigate this bias without destroying general language modeling utility?"*

### Key Capabilities & Workflows:
1. **Model Registry & Adapters**: Supports Hugging Face models, local checkpoints (BERT, DistilBERT, T5, Qwen), and a deterministic baseline reference adapter for testing without GPU/Torch dependencies.
2. **Benchmark-Driven Evaluation**:
   - **StereoSet**: Measures Language Modeling Score (LMS), Stereotype Score (SS), and Idealized Cat Score (ICAT).
   - **CrowS-Pairs**: Evaluates subtle sentence-pair preferences across nine social categories.
   - **WinoBias**: Tests coreference resolution accuracy differences between pro-stereotypical and anti-stereotypical contexts.
   - **Custom Benchmarks**: Ingests researcher-supplied CSV or JSON counterfactual datasets.
3. **Statistical Significance Testing**: Calculates 95% bootstrap confidence intervals, Cohen's $d$ effect sizes, and Word Embedding Association Test (WEAT) permutation tests.
4. **Per-Instance Evidence Explorer**: Inspects side-by-side sentence log-likelihoods, token probabilities, and differential scores ($\Delta \text{score}$) for every evaluated sample.
5. **Prompt Playground**: Allows interactive side-by-side prompt generation testing (baseline vs. neutralized prompts, counterfactual gender/name swaps).
6. **Mitigation Studio**: Evaluates debiasing interventions:
   - *Prompt Neutralization* (instruction and prompt-level rewriting)
   - *Counterfactual Augmentation* (balancing dataset pairs)
   - *Representation Debiasing* (geometric projection / subspace removal on internal embeddings)
   - *Utility Trade-off Analysis* (verifying language modeling preservation)
7. **Research Reporting**: Automatically compiles reproducible markdown summaries, JSON/CSV exports, and PDF research reports.

---

## 2. Inputs (What Goes Into the System)

| Input Category | Format / Source | Details & Examples |
| :--- | :--- | :--- |
| **Models** | Model Checkpoint / HF ID | • Hugging Face ID (e.g., `distilbert-base-uncased`, `bert-base-uncased`, `t5-small`, `qwen`).<br>• Local checkpoints.<br>• Deterministic Reference Adapter (zero-dependency testing). |
| **Benchmarks & Datasets** | Built-in or User Upload (JSON/CSV) | • **StereoSet**: Intersentence and intrasentence triplets (context, stereotype, anti-stereotype, unrelated).<br>• **CrowS-Pairs**: Minimal sentence pairs across gender, race, religion, profession, age, disability, and socioeconomic categories.<br>• **WinoBias**: Coreference occupational pairs (Type 1 & Type 2).<br>• **Custom Datasets**: User-uploaded counterfactual pairs or tuples. |
| **Evaluation Parameters** | Web UI / API Request | • Target demographic categories (e.g., `gender`, `race`, `religion`, `profession`).<br>• Selected metrics suite.<br>• Sample limit (e.g., 50, 100, full dataset).<br>• Random seed (e.g., 42 for reproducibility). |
| **Interactive Prompts** | Freeform text in UI | Text prompts tested in the Prompt Playground for open-ended generation and prompt debiasing. |
| **Mitigation Settings** | Hyperparameters | Subspace projection dimension, augmentation factors, and neutralization templates. |

---

## 3. Outputs (What Comes Out of the System)

| Output Category | Metric / Format | Description |
| :--- | :--- | :--- |
| **StereoSet Metrics** | **LMS**, **SS**, **ICAT** | • **LMS (Language Modeling Score)**: % of instances model prefers meaningful text over nonsensical text (~100% ideal).<br>• **SS (Stereotype Score)**: % of instances model prefers stereotypical over anti-stereotypical sentence (ideal = **50.0%**; >50% indicates stereotype preference).<br>• **ICAT (Idealized Cat Score)**: Composite utility-fairness score: $\text{ICAT} = \text{LMS} \times \frac{\min(\text{SS}, 100 - \text{SS})}{50}$. |
| **CrowS-Pairs Metrics** | **Preference Rate (%)** | Percentage of sentence pairs where the model assigns higher pseudo-log-likelihood to the stereotypical sentence (ideal = 50.0%). |
| **WinoBias Metrics** | **Pro/Anti Error Disparity** | Gap in coreference error rates between pro-stereotyped and anti-stereotyped occupational pairs. |
| **Statistical Metrics** | **Bootstrap CIs & WEAT** | 95% bootstrap confidence intervals, permutation $p$-values, and Cohen's $d$ effect sizes. |
| **Evidence & Disparities** | Instance-Level Data | Per-example sentence log-likelihoods, token probabilities, difference scores, and flagged bias candidates. |
| **Visualizations** | Interactive UI Charts | Category breakdown bar charts, radar comparison charts, multi-model comparison plots, and pre- vs post-mitigation delta charts. |
| **Debiased Generation** | Generated Text | Side-by-side comparison of baseline completions vs. neutralized/debiased completions. |
| **Exportable Artifacts** | Markdown, CSV, JSON, PDF | Downloadable comprehensive research reports, structured evaluation logs, and raw metrics tables. |

---

## 4. Technology Stack

```
               +-------------------------------------------+
               |                 FRONTEND                  |
               | React 19 • TypeScript • Vite • Tailwind   |
               | Recharts • React Router v7 • Lucide Icons |
               +-------------------------------------------+
                                     │  (HTTP / REST API)
                                     ▼
               +-------------------------------------------+
               |                 BACKEND                   |
               | FastAPI • Pydantic v2 • SQLAlchemy • Uvicorn|
               +-------------------------------------------+
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
+---------------------------------+             +----------------------------------+
|           ML & METRICS          |             |             STORAGE              |
| PyTorch • Hugging Face          |             | SQLite (fairlens.db)             |
| NumPy • SciPy • Scikit-learn    |             | Local Model & Dataset Caches     |
| Pandas (Bootstrap, WEAT, CIs)   |             | Markdown / CSV / PDF (WeasyPrint)|
+---------------------------------+             +----------------------------------+
```

### Detailed Layer Breakdown:

- **Frontend**:
  - **Framework**: React 19 + TypeScript
  - **Build Tool**: Vite
  - **Styling**: Tailwind CSS (v4) with `clsx` and `tailwind-merge`
  - **Data Visualization**: Recharts (radar charts, bar charts, line plots)
  - **Icons & Routing**: Lucide React, React Router v7
- **Backend**:
  - **API Framework**: FastAPI (asynchronous REST API with automatic OpenAPI documentation)
  - **Server**: Uvicorn ASGI server
  - **Validation**: Pydantic v2 & Pydantic-Settings
  - **ORM & Database**: SQLAlchemy 2.0 with SQLite database (`fairlens.db`)
- **Machine Learning & NLP**:
  - **Model Adapters**: PyTorch, Hugging Face Transformers (Masked LM, Seq2Seq, and Causal LM adapters)
  - **Fallback / Reference**: Deterministic heuristic adapter for lightweight testing without GPU or PyTorch
  - **Statistical Tools**: SciPy, Scikit-learn, NumPy, Pandas (permutation tests, bootstrapping, vector geometry)
- **Document & Report Generation**:
  - Python-Markdown, WeasyPrint (HTML to PDF rendering), CSV/JSON exporters

---

## 5. How to Run the Project

### Running Services:
- **Backend API**:
  ```bash
  cd backend
  .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
  ```
  API Docs: `http://127.0.0.1:8000/docs`

- **Frontend Application**:
  ```bash
  cd frontend
  npm run dev
  ```
  App URL: `http://localhost:5173`

