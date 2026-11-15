from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class CustomTestCaseCreate(BaseModel):
    category: str
    prompt_original: str
    prompt_counterfactual: str
    attribute: Optional[str] = ""
    expected_property: Optional[str] = ""
    tags: Optional[List[str]] = []

class CustomTestCaseResponse(BaseModel):
    id: str
    category: str
    prompt_original: str
    prompt_counterfactual: str
    attribute: str
    expected_property: str
    tags: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TestSuiteRunRequest(BaseModel):
    model_id: str
    test_case_ids: Optional[List[str]] = None
