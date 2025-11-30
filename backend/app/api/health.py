# backend/app/api/health.py
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    services: dict

@router.get("/system/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    """
    # TODO: Add real health checks for DB, cache, queue, etc.
    return {
        "status": "ok",
        "services": {
            "database": "ok",
            "cache": "ok",
            "queue": "ok",
            "llm_service": "ok"
        }
    }
