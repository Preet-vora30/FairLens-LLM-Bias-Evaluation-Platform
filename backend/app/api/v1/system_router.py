from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ...db.database import get_db
from ...core.config import settings
from ...services.model_registry.registry import model_registry_manager
from ...services.metrics.weat_metrics import compute_weat_score

try:
    import torch
except Exception:
    torch = None
try:
    import psutil
except Exception:
    psutil = None

router = APIRouter(prefix="/system", tags=["System & Diagnostic"])

class WEATRequest(BaseModel):
    model_id: str
    target_X: List[str]  # e.g. ["math", "algebra", "geometry", "calculus"]
    target_Y: List[str]  # e.g. ["poetry", "art", "dance", "literature"]
    attribute_A: List[str]  # e.g. ["male", "man", "boy", "brother"]
    attribute_B: List[str]  # e.g. ["female", "woman", "girl", "sister"]
    n_permutations: Optional[int] = 1000
    seed: Optional[int] = 42

@router.get("/health")
def health_check():
    """Simple liveness probe for the FairLens AI backend."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

@router.get("/status")
def get_system_status():
    if psutil is not None:
        mem = psutil.virtual_memory()
        cpu_usage_pct = psutil.cpu_percent()
        ram_total_gb = round(mem.total / (1024**3), 2)
        ram_available_gb = round(mem.available / (1024**3), 2)
    else:
        cpu_usage_pct = None
        ram_total_gb = None
        ram_available_gb = None

    cuda_avail = bool(torch is not None and torch.cuda.is_available())
    device_name = torch.cuda.get_device_name(0) if cuda_avail and torch is not None else "CPU"

    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "cuda_available": cuda_avail,
        "device": device_name,
        "cpu_usage_pct": cpu_usage_pct,
        "ram_total_gb": ram_total_gb,
        "ram_available_gb": ram_available_gb,
        "loaded_models_count": model_registry_manager.get_loaded_models_count()
    }

@router.post("/weat/evaluate")
def run_weat_evaluation(payload: WEATRequest, db: Session = Depends(get_db)):
    from app.db.models import ModelRecord
    model_rec = db.query(ModelRecord).filter(ModelRecord.id == payload.model_id).first()
    if not model_rec:
        return {"error": f"Model {payload.model_id} not found."}

    adapter = model_registry_manager.get_adapter(
        model_id=model_rec.id,
        model_identifier=model_rec.model_identifier,
        architecture=model_rec.architecture,
        requested_device=model_rec.device
    )

    X_vecs = [adapter.get_embedding(w) for w in payload.target_X]
    Y_vecs = [adapter.get_embedding(w) for w in payload.target_Y]
    A_vecs = [adapter.get_embedding(w) for w in payload.attribute_A]
    B_vecs = [adapter.get_embedding(w) for w in payload.attribute_B]

    res = compute_weat_score(
        X=X_vecs,
        Y=Y_vecs,
        A=A_vecs,
        B=B_vecs,
        n_permutations=payload.n_permutations or 1000,
        seed=payload.seed or 42
    )
    return res


@router.get("/settings")
def get_system_settings(db: Session = Depends(get_db)):
    """Return stored application settings (data retention / runtime configuration)."""
    from app.db.models import SystemSetting
    rows = db.query(SystemSetting).all()
    return {row.key: row.value for row in rows}


@router.put("/settings/{key}")
async def update_system_setting(
    key: str,
    request: Request,
    value: Optional[Any] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Create or update a single application setting. Accepts value in JSON body or as ?value=... query param."""
    import json
    resolved = None
    has_body_value = False
    # Prefer JSON body when provided
    try:
        if "application/json" in request.headers.get("content-type", ""):
            raw = await request.body()
            if raw:
                text = None
                for enc in ("utf-8-sig", "utf-16", "utf-16-le", "utf-16-be"):
                    try:
                        text = raw.decode(enc)
                        break
                    except Exception:
                        continue
                if text is None:
                    text = raw.decode("utf-8", errors="replace")
                body = json.loads(text)
                has_body_value = True
                # Accept raw JSON value, or {"value": ...} envelope
                if isinstance(body, dict) and "value" in body and len(body) == 1:
                    resolved = body["value"]
                else:
                    resolved = body
    except Exception:
        has_body_value = False

    if not has_body_value and value is not None:
        resolved = value
        has_body_value = True
    if not has_body_value and "value" in request.query_params:
        resolved = request.query_params.get("value")
        has_body_value = True

    if not has_body_value:
        raise HTTPException(status_code=422, detail="A setting value must be provided in the request body or as a 'value' query parameter.")

    from app.db.models import SystemSetting
    existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not existing:
        existing = SystemSetting(key=key, value=resolved)
        db.add(existing)
    else:
        existing.value = resolved
    db.commit()
    return {"success": True, "key": key, "value": resolved}


@router.delete("/settings/{key}")
def delete_system_setting(key: str, db: Session = Depends(get_db)):
    """Delete a stored application setting (data retention control)."""
    from app.db.models import SystemSetting
    existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Setting {key} not found")
    db.delete(existing)
    db.commit()
    return {"success": True, "key": key}
