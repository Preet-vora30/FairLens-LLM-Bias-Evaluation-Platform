import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .api.v1.router import api_v1_router


def get_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        debug=settings.DEBUG,
        docs_url="/docs",
        openapi_url="/openapi.json",
        redoc_url="/redoc",
    )
    # CORS configuration (local development friendly)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Include aggregated API v1 router
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)
    return app


app = get_application()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.BACKEND_HOST, port=settings.BACKEND_PORT)
