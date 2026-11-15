import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import EvaluationJob, EvaluationResult, EvaluationEvidence

router = APIRouter(prefix="/exports", tags=["Exports"])


def export_evaluation_data(db: Session, evaluation_id: str, format: str = "json"):
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
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={evaluation_id}_evidence.csv"})

    data = {
        "experiment_id": evaluation_id,
        "job": {
            "id": job.id,
            "name": job.name,
            "models": job.model_ids,
            "dataset": job.dataset_id,
            "status": job.status,
            "created_at": str(job.created_at),
        },
        "results": [
            {
                "model_id": r.model_id,
                "metric": r.metric_name,
                "category": r.category,
                "score": r.score,
                "interpretation": r.interpretation,
                "raw": r.raw_data,
            }
            for r in results
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
                "explanation": ev.explanation,
            }
            for ev in evidence[:100]
        ],
    }
    return data


@router.get("/{experiment_id}")
def export_experiment(experiment_id: str, format: str = "json", db: Session = Depends(get_db)):
    """Export an experiment's results and evidence as JSON or CSV."""
    return export_evaluation_data(db, experiment_id, format=format)
