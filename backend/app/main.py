# backend/app/main.py
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from .api import health, jobs, models, chat
from .database import create_db_and_tables

# --- Application State ---
# A simple flag to indicate if the database has been initialized.
# Used by the /ready endpoint.
app_state = {"db_ready": False}

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Lifespan Management (Startup & Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    """
    logger.info("--- Starting up RepoInsight API ---")
    logger.info("Initializing database...")
    try:
        create_db_and_tables()
        app_state["db_ready"] = True
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # The app will start, but /ready will return false.

    yield

    logger.info("--- Shutting down RepoInsight API ---")


# --- FastAPI App Initialization ---
app = FastAPI(
    title="RepoInsight API",
    description="API for analyzing and understanding code repositories.",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
# Allows the frontend to communicate with this API.
# The origin should be configured via an environment variable.
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
# Include the routers for different parts of the API.
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])

# TODO: Add GraphQL endpoint
# from .graphql import router as graphql_router
# app.include_router(graphql_router, prefix="/graphql")

# TODO: Add WebSocket endpoint for real-time updates
# @app.websocket("/ws/jobs/{job_id}")
# async def websocket_endpoint(websocket: WebSocket, job_id: str):
#     await manager.connect(websocket)
#     try:
#         while True:
#             # Logic to send updates for the job
#             await websocket.send_json({"status": "in_progress"})
#             await asyncio.sleep(5)
#     except WebSocketDisconnect:
#         manager.disconnect(websocket)


# --- Root and Readiness Endpoints ---
@app.get("/", tags=["Root"])
async def read_root():
    """
    Root endpoint providing a welcome message.
    """
    return {"message": "Welcome to the RepoInsight API"}


@app.get("/ready", tags=["Health"])
async def ready(response: Response):
    """
    Readiness probe to check if the service is ready to accept traffic.
    It's considered ready only if the database has been initialized.
    """
    if app_state["db_ready"]:
        return {"status": "ready"}
    else:
        response.status_code = 503  # Service Unavailable
        return {"status": "not_ready", "reason": "Database not initialized"}
