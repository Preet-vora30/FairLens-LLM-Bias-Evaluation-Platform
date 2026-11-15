from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import MitigationExperiment
from app.schemas.mitigation import MitigationResponse

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.get("", response_model=List[MitigationResponse])
def list_experiments(db: Session = Depends(get_db)):
    """List persisted mitigation / intervention experiments."""
    return db.query(MitigationExperiment).order_by(MitigationExperiment.created_at.desc()).all()


@router.get("/{experiment_id}", response_model=MitigationResponse)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    """Retrieve a single persisted mitigation experiment by id."""
    exp = db.query(MitigationExperiment).filter(MitigationExperiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} not found")
    return exp
