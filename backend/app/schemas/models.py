from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class ModelBase(BaseModel):
    name: str
    model_identifier: str
    architecture: str
    family: str
    supported_tasks: List[str]
    limitations: Optional[str] = ""

class ModelCreate(ModelBase):
    id: str

class ModelResponse(ModelBase):
    id: str
    status: str
    device: str
    memory_mb: float
    created_at: datetime
    loaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ModelLoadRequest(BaseModel):
    device: Optional[str] = "cpu"
