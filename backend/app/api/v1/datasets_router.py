import os
import re
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import DatasetRecord
from app.schemas.datasets import DatasetResponse
from app.core.config import settings

router = APIRouter(prefix="/datasets", tags=["Datasets"])

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB limit for custom benchmark uploads
ALLOWED_EXTENSIONS = {".json", ".csv"}
REQUIRED_PAIR_KEYS = ("sentence", "sentence_more", "sentence_less", "context", "prompt_original", "prompt_counterfactual")


def _validate_custom_records(data, source_name: str) -> int:
    """Validate uploaded benchmark JSON structure. Returns valid sample count."""
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail=f"Custom dataset '{source_name}' must be a JSON array of paired records.")

    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail=f"Custom dataset '{source_name}' record #{idx} must be a JSON object.")
        has_pair = any(k in item for k in REQUIRED_PAIR_KEYS)
        has_text = any(isinstance(item.get(k), str) and item.get(k, "").strip() for k in REQUIRED_PAIR_KEYS)
        if not has_pair or not has_text:
            raise HTTPException(status_code=400, detail=f"Custom dataset '{source_name}' record #{idx} is missing required paired sentence fields.")

    return len(data)


@router.get("", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(DatasetRecord).all()


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    d = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    return d


@router.post("/{dataset_id}/prepare")
def prepare_dataset(dataset_id: str, db: Session = Depends(get_db)):
    d = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")

    if d.status == "error":
        raise HTTPException(status_code=409, detail=f"Dataset {d.name} is in an error state and cannot be prepared.")

    if os.path.exists(d.local_path):
        d.status = "ready"
        db.commit()
        return {"success": True, "message": f"Dataset {d.name} is verified and ready with {d.sample_count} samples."}
    else:
        raise HTTPException(status_code=400, detail="Local dataset fixture file is missing.")


@router.post("/upload")
async def upload_custom_dataset(
    file: UploadFile = File(...),
    name: str = "Uploaded Custom Benchmark",
    category: str = "general",
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(tuple(ALLOWED_EXTENSIONS)):
        raise HTTPException(status_code=400, detail="Only .json or .csv files are supported.")

    raw_contents = await file.read()
    if len(raw_contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Uploaded file exceeds the {MAX_UPLOAD_SIZE_BYTES} byte limit.")

    # Sanitize filename and store under a randomized cache key.
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename)
    short_id = str(uuid.uuid4())[:8]
    dataset_id = f"custom_{short_id}"
    file_id = f"{dataset_id}_{safe_name}"

    save_path = os.path.join(settings.DATASET_CACHE_DIR, file_id)
    with open(save_path, "wb") as f:
        f.write(raw_contents)

    sample_count = 0
    task_type = "custom"

    if file.filename.lower().endswith(".json"):
        try:
            parsed = json.loads(raw_contents.decode("utf-8-sig"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON format in uploaded dataset.")
        if isinstance(parsed, dict):
            # Support single-object payloads.
            parsed = [parsed]
        if not isinstance(parsed, list):
            raise HTTPException(status_code=400, detail="Custom dataset JSON must be an array of paired records.")
        sample_count = _validate_custom_records(parsed, file.filename)
    else:
        lines = raw_contents.decode("utf-8").strip().split("\n")
        # Skip CSV header row.
        sample_count = max(0, len(lines) - 1)

    record = DatasetRecord(
        id=dataset_id,
        name=name[:128],
        dataset_identifier=dataset_id,
        description=f"User uploaded dataset: {file.filename}",
        source_url="local://upload",
        version="1.0.0",
        license="User Provided",
        supported_tasks=[task_type],
        supported_categories=[category],
        sample_count=sample_count,
        status="ready",
        local_path=save_path
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"success": True, "dataset_id": record.id, "sample_count": record.sample_count}
