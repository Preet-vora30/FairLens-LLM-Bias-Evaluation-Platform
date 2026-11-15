# FairLens AI — Troubleshooting Guide

## 1. Backend will not start

- Confirm Python 3.11+ and dependencies: `pip install -r backend/requirements.txt`.
- Database: SQLite file at backend root; delete `fairlens.db` only for a clean reset.
- Port conflicts: set `BACKEND_PORT` in `backend/.env`.

## 2. Model loading failures

- Network access to Hugging Face required for real adapters.
- CPU-only fallback: set `DEFAULT_DEVICE=cpu` or request CPU in load endpoint.
- CUDA unavailable: load endpoint falls back to CPU.
- Memory: unload unused models via `POST /api/v1/models/{id}/unload`.

## 3. Evaluation failures

- Dataset fixture missing: run preparation for the dataset.
- Unsupported category: category must be in dataset `supported_categories`.
- Empty dataset after filtering: adjust sample limit/categories.

## 4. Report PDF export fails

- `weasyprint` requires native system libraries (pango, cairo). Install via system packages or use
  markdown/text export.

## 5. Frontend cannot reach backend

- Ensure backend runs on `127.0.0.1:8000`.
- Vite proxy: `/api` → `http://127.0.0.1:8000` (see `frontend/vite.config.ts`).
- Check backend health: `GET /api/v1/health`.

## 6. Known environment limitations

- Real model downloads are cached locally; never commit weights.
- Full-scale benchmark evaluation may exceed laptop resources; use small sample limits.
