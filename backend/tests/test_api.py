import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.init_db import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    db = SessionLocal()
    init_db(db)
    db.close()

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_system_status():
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200
    data = response.json()
    assert "ram_total_gb" in data
    assert "cuda_available" in data

def test_list_models():
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 3
    identifiers = [m["model_identifier"] for m in models]
    assert "distilbert/distilbert-base-uncased" in identifiers

def test_list_datasets():
    response = client.get("/api/v1/datasets")
    assert response.status_code == 200
    datasets = response.json()
    assert len(datasets) >= 3
    ids = [d["id"] for d in datasets]
    assert "ds_stereoset" in ids
    assert "ds_crows_pairs" in ids

def test_playground_generation():
    payload = {
        "model_id": "model_fast_reference",
        "prompt": "The applicant is a mother who worked as a receptionist.",
        "max_new_tokens": 32,
        "temperature": 0.5,
        "apply_neutral_prompt": True
    }
    response = client.post("/api/v1/playground/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "baseline_response" in data
    assert "neutral_response" in data
    assert len(data["counterfactual_pairs"]) > 0

def test_custom_test_suite_run():
    payload = {
        "model_id": "model_fast_reference"
    }
    response = client.post("/api/v1/testsuites/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_cases"] >= 3
    assert "consistency_rate" in data

def test_mitigation_experiment():
    payload = {
        "name": "Prompt Debiasing Test",
        "strategy": "prompt_neutralization",
        "baseline_model_id": "model_fast_reference",
        "dataset_id": "ds_crows_pairs",
        "category": "gender"
    }
    response = client.post("/api/v1/mitigations/experiments", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "baseline_scores" in data
    assert "mitigated_scores" in data
    assert data["strategy"] == "prompt_neutralization"

def test_evaluation_lifecycle_and_report():
    # 1. Create evaluation
    eval_payload = {
        "name": "Integration Test Audit",
        "model_ids": ["model_fast_reference"],
        "dataset_id": "ds_stereoset",
        "categories": ["gender", "race"],
        "metrics": ["ss", "lms", "icat"],
        "sample_limit": 5,
        "seed": 42
    }
    eval_resp = client.post("/api/v1/evaluations", json=eval_payload)
    assert eval_resp.status_code == 200
    job_id = eval_resp.json()["id"]

    # 2. Synchronously run evaluator on this job to test results
    from app.services.evaluation.evaluator import EvaluationOrchestrator
    db = SessionLocal()
    orchestrator = EvaluationOrchestrator(db)
    orchestrator.run_evaluation(job_id)
    db.close()

    # 3. Check results
    res_resp = client.get(f"/api/v1/evaluations/{job_id}/results")
    assert res_resp.status_code == 200
    results = res_resp.json()
    assert len(results) >= 1

    # 4. Check evidence
    ev_resp = client.get(f"/api/v1/evaluations/{job_id}/evidence")
    assert ev_resp.status_code == 200
    evidence = ev_resp.json()
    assert len(evidence) >= 1

    # 5. Export JSON
    exp_resp = client.get(f"/api/v1/evaluations/{job_id}/export?format=json")
    assert exp_resp.status_code == 200
    assert "results" in exp_resp.json()

    # 5b. Export CSV
    exp_csv_resp = client.get(f"/api/v1/evaluations/{job_id}/export?format=csv")
    assert exp_csv_resp.status_code == 200
    assert "text/csv" in exp_csv_resp.headers["content-type"]
    assert "Evidence_ID" in exp_csv_resp.text

    # 6. Generate Report
    rep_resp = client.post("/api/v1/reports", json={"title": "Test Report", "evaluation_id": job_id})
    assert rep_resp.status_code == 200
    report = rep_resp.json()
    assert "Abstract" in report["content"]

    # 7. Fetch saved report by id and download it
    rep_id = report.get("id") or f"rep_{job_id}"
    rep_get_resp = client.get(f"/api/v1/reports/{rep_id}")
    assert rep_get_resp.status_code == 200
    assert "Abstract" in rep_get_resp.json()["content"]

    rep_dl_resp = client.get(f"/api/v1/reports/{rep_id}/download")
    assert rep_dl_resp.status_code == 200
    assert "text/markdown" in rep_dl_resp.headers["content-type"]

    # 8. Export experiment via exports alias
    exp_alias_resp = client.get(f"/api/v1/exports/{job_id}?format=json")
    assert exp_alias_resp.status_code == 200
    assert "results" in exp_alias_resp.json()

    # 9. Unknown model should be rejected with 404
    bad_eval = client.post("/api/v1/evaluations", json={
        "name": "Bad Model Ref",
        "model_ids": ["model_does_not_exist"],
        "dataset_id": "ds_crows_pairs",
        "categories": ["gender"],
        "metrics": ["stereotype_pref_rate"],
        "sample_limit": 5,
        "seed": 42,
    })
    assert bad_eval.status_code == 404

    # 10. Malformed uploaded dataset should be rejected
    import io as _io
    files = {"file": ("bad.json", _io.BytesIO(b'{"not": "a valid paired record"}'), "application/json")}
    bad_upload = client.post("/api/v1/datasets/upload", files=files, data={"name": "Bad Upload", "category": "gender"})
    assert bad_upload.status_code == 400
