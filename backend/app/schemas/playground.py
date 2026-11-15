from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class PlaygroundGenerateRequest(BaseModel):
    model_id: str
    prompt: str
    max_new_tokens: int = 64
    temperature: float = 0.7
    top_p: float = 0.9
    apply_neutral_prompt: bool = True

class PlaygroundGenerateResponse(BaseModel):
    model_id: str
    baseline_prompt: str
    baseline_response: str
    neutral_prompt: Optional[str] = None
    neutral_response: Optional[str] = None
    counterfactual_pairs: Optional[List[Dict[str, Any]]] = None
    bias_rationale: str
    generation_params: Dict[str, Any]
