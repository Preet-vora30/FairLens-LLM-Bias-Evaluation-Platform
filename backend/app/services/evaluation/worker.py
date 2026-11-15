import threading
from app.db.database import SessionLocal
from app.services.evaluation.evaluator import EvaluationOrchestrator

def launch_evaluation_worker(job_id: str):
    def _worker():
        db = SessionLocal()
        try:
            orchestrator = EvaluationOrchestrator(db)
            orchestrator.run_evaluation(job_id)
        finally:
            db.close()

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    return thread
