from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class MitigationRequest(BaseModel):
    name: str
    strategy: str  # prompt_neutralization, counterfactual_augmentation, representation_projection
    baseline_model_id: str
    dataset_id: str
    category: Optional[str] = "all"
    options: Optional[Dict[str, Any]] = None

class MitigationResponse(BaseModel):
    id: str
    name: str
    strategy: str
    baseline_model_id: str
    dataset_id: str
    category: str
    baseline_scores: Dict[str, Any]
    mitigated_scores: Dict[str, Any]
    utility_impact: Dict[str, Any]
    status: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True

class CounterfactualAugmentRequest(BaseModel):
    text: str
    category: str = "gender"  # gender, race, religion, profession

class CounterfactualAugmentResponse(BaseModel):
    original: str
    counterfactuals: list[str]
    transformations_applied: list[str]
    is_valid: bool
    rejection_reason: Optional[str] = None
