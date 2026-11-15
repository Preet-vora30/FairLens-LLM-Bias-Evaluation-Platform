import uuid
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import EvaluationJob, EvaluationResult, EvaluationEvidence, ModelRecord, DatasetRecord
from app.schemas.evaluation import EvaluationCreate, EvaluationJobResponse, EvaluationResultResponse, EvaluationEvidenceResponse
from app.services.evaluation.worker import launch_evaluation_worker

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

@router.get("", response_model=List[EvaluationJobResponse])
def list_evaluations(db: Session = Depends(get_db)):
    return db.query(EvaluationJob).order_by(EvaluationJob.created_at.desc()).all()

@router.post("", response_model=EvaluationJobResponse)
def create_evaluation(payload: EvaluationCreate, db: Session = Depends(get_db)):
    job_id = f"eval_{str(uuid.uuid4())[:8]}"
    job = EvaluationJob(
        id=job_id,
        name=payload.name,
        model_ids=payload.model_ids,
        dataset_id=payload.dataset_id,
        categories=payload.categories,
        metrics=payload.metrics,
        sample_limit=payload.sample_limit,
        seed=payload.seed,
        status="pending",
        progress=0.0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Validate referential integrity before dispatching the background job.
    for mid in payload.model_ids:
        m = db.query(ModelRecord).filter(ModelRecord.id == mid).first()
        if not m:
            job.status = "failed"
            job.error_message = f"Model {mid} not found in registry."
            db.commit()
            raise HTTPException(status_code=404, detail=f"Model {mid} not found")

    dataset = db.query(DatasetRecord).filter(DatasetRecord.id == payload.dataset_id).first()
    if not dataset:
        job.status = "failed"
        job.error_message = f"Dataset {payload.dataset_id} not found."
        db.commit()
        raise HTTPException(status_code=404, detail=f"Dataset {payload.dataset_id} not found")

    if payload.categories and "all" not in payload.categories:
        unknown = [c for c in payload.categories if c not in (dataset.supported_categories or [])]
        if unknown:
            job.status = "failed"
            job.error_message = f"Categories {unknown} are not supported by dataset {dataset.dataset_identifier}."
            db.commit()
            raise HTTPException(status_code=400, detail=f"Unsupported categories for dataset {dataset.dataset_identifier}: {unknown}")

    launch_evaluation_worker(job.id)
    return job

@router.get("/{evaluation_id}", response_model=EvaluationJobResponse)
def get_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    job = db.query(EvaluationJob).filter(EvaluationJob.id == evaluation_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found")
    return job

@router.post("/{evaluation_id}/cancel")
def cancel_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    job = db.query(EvaluationJob).filter(EvaluationJob.id == evaluation_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found")
    if job.status == "running" or job.status == "pending":
        job.status = "cancelled"
        db.commit()
    return {"success": True, "message": "Evaluation job cancelled."}

@router.get("/{evaluation_id}/results", response_model=List[EvaluationResultResponse])
def get_evaluation_results(evaluation_id: str, db: Session = Depends(get_db)):
    return db.query(EvaluationResult).filter(EvaluationResult.evaluation_id == evaluation_id).all()

@router.get("/{evaluation_id}/evidence", response_model=List[EvaluationEvidenceResponse])
def get_evaluation_evidence(
    evaluation_id: str,
    category: Optional[str] = None,
    preference: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(EvaluationEvidence).filter(EvaluationEvidence.evaluation_id == evaluation_id)
    if category and category != "all":
        query = query.filter(EvaluationEvidence.category == category)
    if preference:
        query = query.filter(EvaluationEvidence.model_preference == preference)
    return query.limit(limit).all()

@router.get("/{evaluation_id}/export")
def export_evaluation(evaluation_id: str, format: str = "json", db: Session = Depends(get_db)):
    job = db.query(EvaluationJob).filter(EvaluationJob.id == evaluation_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found")

    results = db.query(EvaluationResult).filter(EvaluationResult.evaluation_id == evaluation_id).all()
    evidence = db.query(EvaluationEvidence).filter(EvaluationEvidence.evaluation_id == evaluation_id).all()

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Evidence_ID", "Model_ID", "Category", "Preference", "Input_Text", "Comparison_Text", "Explanation"])
        for ev in evidence:
            writer.writerow([ev.sample_id, ev.model_id, ev.category, ev.model_preference, ev.input_text, ev.comparison_text, ev.explanation])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={evaluation_id}_evidence.csv"}
        )

    # JSON export
    data = {
        "job": {
            "id": job.id,
            "name": job.name,
            "models": job.model_ids,
            "dataset": job.dataset_id,
            "status": job.status,
            "created_at": str(job.created_at)
        },
        "results": [
            {
                "model_id": r.model_id,
                "metric": r.metric_name,
                "category": r.category,
                "score": r.score,
                "interpretation": r.interpretation,
                "raw": r.raw_data
            } for r in results
        ],
        "evidence_sample": [
            {
                "sample_id": ev.sample_id,
                "model_id": ev.model_id,
                "category": ev.category,
                "preference": ev.model_preference,
                "input": ev.input_text,
                "comparison": ev.comparison_text,
                "scores": ev.raw_scores,
                "explanation": ev.explanation
            } for ev in evidence[:100]
        ]
    }
    return data
