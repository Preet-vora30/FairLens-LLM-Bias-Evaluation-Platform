import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FairLens AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'fairlens.db')}"
    MODEL_CACHE_DIR: str = os.path.join(BASE_DIR, "cache", "models")
    DATASET_CACHE_DIR: str = os.path.join(BASE_DIR, "cache", "datasets")
    BENCHMARKS_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "datasets", "benchmarks")
    REPORTS_DIR: str = os.path.join(BASE_DIR, "reports")
    
    # ML & Hardware
    DEFAULT_DEVICE: str = "cpu"
    ALLOW_CUDA: bool = True
    BATCH_SIZE: int = 8
    MAX_SEQUENCE_LENGTH: int = 128
    SEED: int = 42
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
os.makedirs(settings.DATASET_CACHE_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
os.makedirs(settings.BENCHMARKS_DIR, exist_ok=True)
