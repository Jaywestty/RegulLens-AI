# app/main.py

from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
import time

from app.database import engine, Base
from app.logger import setup_logger
from auth import models as auth_models
from documents import models as doc_models
from auth.routes import router as auth_router
from documents.routes import router as doc_router
from generation.routes import router as query_router
from evaluation.routes import router as admin_router
from retrieval.opensearch import create_index
from documents.storage import ensure_bucket_exists

logger = setup_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Compliance Platform...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")
    create_index()
    logger.info("OpenSearch index ready.")
    ensure_bucket_exists()
    logger.info("Storage bucket ready.")
    logger.info("Platform started successfully.")
    yield
    logger.info("Shutting down platform.")


app = FastAPI(
    title="Enterprise Compliance Intelligence Platform",
    description="AI-powered policy and compliance assistant with hybrid RAG retrieval",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(doc_router)
app.include_router(query_router)
app.include_router(admin_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware runs on EVERY request before and after the route handler.
    
    Think of it like a checkpoint at the entrance and exit of your API.
    Every single request gets logged with its method, path, status, and duration.
    
    This is how you know:
    - Which endpoints are being called most
    - Which ones are slow
    - Which ones are returning errors
    
    Without this, your API is a black box.
    """
    start = time.time()
    
    response = await call_next(request)
    
    duration_ms = int((time.time() - start) * 1000)
    
    logger.info(
        f"method={request.method} "
        f"path={request.url.path} "
        f"status={response.status_code} "
        f"duration_ms={duration_ms}"
    )
    
    return response


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "version": "1.0.0"}