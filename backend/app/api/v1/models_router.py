import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import ModelRecord
from app.schemas.models import ModelResponse, ModelLoadRequest
from app.services.model_registry.registry import model_registry_manager

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("", response_model=List[ModelResponse])
def list_models(db: Session = Depends(get_db)):
    models = db.query(ModelRecord).all()
    # Update dynamic loaded status
    for m in models:
        if model_registry_manager.is_loaded(m.id):
            m.status = "loaded"
        elif m.status == "loaded":
            m.status = "registered"
    return models

@router.get("/{model_id}", response_model=ModelResponse)
def get_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    if model_registry_manager.is_loaded(m.id):
        m.status = "loaded"
    return m

@router.post("/{model_id}/load")
def load_model(model_id: str, req: ModelLoadRequest = None, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

    device = req.device if req and req.device else m.device
    try:
        model_registry_manager.get_adapter(
            model_id=m.id,
            model_identifier=m.model_identifier,
            architecture=m.architecture,
            requested_device=device
        )
        m.status = "loaded"
        m.device = device
        m.loaded_at = datetime.datetime.utcnow()
        db.commit()
        return {"success": True, "message": f"Model {m.name} successfully loaded on {device}"}
    except Exception as e:
        m.status = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@router.post("/{model_id}/unload")
def unload_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

    model_registry_manager.unload_adapter(m.id)
    m.status = "registered"
    db.commit()
    return {"success": True, "message": f"Model {m.name} unloaded from memory"}
