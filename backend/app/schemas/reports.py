from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class ReportCreate(BaseModel):
    title: str
    evaluation_id: Optional[str] = None
    format: str = "markdown"

class ReportResponse(BaseModel):
    id: str
    title: str
    evaluation_id: Optional[str] = None
    format: str
    content: str
    summary_metrics: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
