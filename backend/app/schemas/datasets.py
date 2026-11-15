from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class DatasetBase(BaseModel):
    name: str
    dataset_identifier: str
    description: Optional[str] = ""
    source_url: Optional[str] = ""
    version: Optional[str] = "1.0.0"
    license: Optional[str] = "Academic / Research"
    supported_tasks: List[str]
    supported_categories: List[str]

class DatasetCreate(DatasetBase):
    id: str
    sample_count: int = 0
    local_path: Optional[str] = ""

class DatasetResponse(DatasetBase):
    id: str
    sample_count: int
    status: str
    local_path: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True
