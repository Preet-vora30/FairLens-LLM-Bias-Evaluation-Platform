from fastapi import APIRouter
from .system_router import router as system_router
from .health_router import router as health_router
from .models_router import router as models_router
from .datasets_router import router as datasets_router
from .evaluations_router import router as evaluations_router
from .playground_router import router as playground_router
from .mitigations_router import router as mitigations_router
from .testsuites_router import router as testsuites_router
from .reports_router import router as reports_router
from .exports_router import router as exports_router
from .experiments_router import router as experiments_router
from .counterfactuals_router import router as counterfactuals_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(models_router)
api_v1_router.include_router(datasets_router)
api_v1_router.include_router(evaluations_router)
api_v1_router.include_router(playground_router)
api_v1_router.include_router(mitigations_router)
api_v1_router.include_router(testsuites_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(exports_router)
api_v1_router.include_router(experiments_router)
api_v1_router.include_router(counterfactuals_router)
