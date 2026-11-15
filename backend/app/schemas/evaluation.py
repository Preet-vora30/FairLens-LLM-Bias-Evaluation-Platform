from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class EvaluationCreate(BaseModel):
    name: str
    model_ids: List[str]
    dataset_id: str
    categories: List[str]
    metrics: List[str]
    sample_limit: int = 50
    seed: int = 42

class EvaluationJobResponse(BaseModel):
    id: str
    name: str
    model_ids: List[str]
    dataset_id: str
    categories: List[str]
    metrics: List[str]
    sample_limit: int
    seed: int
    status: str
    progress: float
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EvaluationResultResponse(BaseModel):
    id: str
    evaluation_id: str
    model_id: str
    metric_name: str
    category: str
    score: float
    sample_count: int
    raw_data: Dict[str, Any]
    interpretation: str
    created_at: datetime

    class Config:
        from_attributes = True

class EvaluationEvidenceResponse(BaseModel):
    id: str
    evaluation_id: str
    model_id: str
    sample_id: str
    category: str
    input_text: str
    comparison_text: str
    raw_scores: Dict[str, Any]
    model_preference: str
    is_stereotypical: bool
    explanation: str
    created_at: datetime

    class Config:
        from_attributes = True
