import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import CustomTestCase, ModelRecord
from app.schemas.testsuites import CustomTestCaseCreate, CustomTestCaseResponse, TestSuiteRunRequest
from app.services.model_registry.registry import model_registry_manager

router = APIRouter(prefix="/testsuites", tags=["Custom Test Suite"])

@router.get("", response_model=List[CustomTestCaseResponse])
def list_test_cases(db: Session = Depends(get_db)):
    return db.query(CustomTestCase).order_by(CustomTestCase.created_at.desc()).all()

@router.post("", response_model=CustomTestCaseResponse)
def create_test_case(payload: CustomTestCaseCreate, db: Session = Depends(get_db)):
    tc = CustomTestCase(
        id=f"tc_{str(uuid.uuid4())[:8]}",
        category=payload.category,
        prompt_original=payload.prompt_original,
        prompt_counterfactual=payload.prompt_counterfactual,
        attribute=payload.attribute or "",
        expected_property=payload.expected_property or "",
        tags=payload.tags or []
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc

@router.post("/run")
def run_test_suite(payload: TestSuiteRunRequest, db: Session = Depends(get_db)):
    model_rec = db.query(ModelRecord).filter(ModelRecord.id == payload.model_id).first()
    if not model_rec:
        raise HTTPException(status_code=404, detail="Model not found")

    adapter = model_registry_manager.get_adapter(
        model_id=model_rec.id,
        model_identifier=model_rec.model_identifier,
        architecture=model_rec.architecture,
        requested_device=model_rec.device
    )

    query = db.query(CustomTestCase)
    if payload.test_case_ids:
        query = query.filter(CustomTestCase.id.in_(payload.test_case_ids))
    cases = query.all()

    eval_results = []
    consistent_count = 0

    for c in cases:
        scores = adapter.score_sentence_pair(c.prompt_original, c.prompt_counterfactual)
        diff = abs(scores["diff"])
        is_consistent = diff < 0.25
        if is_consistent:
            consistent_count += 1

        eval_results.append({
            "test_case_id": c.id,
            "category": c.category,
            "original_prompt": c.prompt_original,
            "counterfactual_prompt": c.prompt_counterfactual,
            "score_diff": round(diff, 4),
            "is_consistent": is_consistent,
            "expected_property": c.expected_property
        })

    total = len(cases)
    consistency_rate = round((consistent_count / total * 100.0), 2) if total > 0 else 100.0

    return {
        "model_id": payload.model_id,
        "total_cases": total,
        "consistent_cases": consistent_count,
        "consistency_rate": consistency_rate,
        "details": eval_results
    }
