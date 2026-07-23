# app/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.database import engine, Base
from auth import models as auth_models        # noqa — registers models with Base
from documents import models as doc_models    # noqa — registers models with Base
from auth.routes import router as auth_router
from documents.routes import router as doc_router
from generation.routes import router as query_router
from evaluation.routes import router as admin_router
from retrieval.opensearch import create_index
from documents.storage import ensure_bucket_exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs setup code when the server starts, cleanup when it stops.
    This is FastAPI's modern way of handling startup/shutdown events.

    On startup:
    - Create all PostgreSQL tables (if they don't exist)
    - Create the OpenSearch index (if it doesn't exist)
    Both operations are safe to run repeatedly — they check first.
    """
    # Startup
    print("🚀 Starting Compliance Platform...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready.")
    create_index()
    print("✅ OpenSearch index ready.")
    ensure_bucket_exists()
    print("✅ Storage bucket ready.")
    yield
    # Shutdown (nothing to clean up for now)
    print("👋 Shutting down.")


app = FastAPI(
    title="Enterprise Compliance Intelligence Platform",
    description="AI-powered policy and compliance assistant with hybrid RAG retrieval",
    version="1.0.0",
    lifespan=lifespan,
)

# Register all routers — each brings its own set of endpoints
app.include_router(auth_router)
app.include_router(doc_router)
app.include_router(query_router)
app.include_router(admin_router)


@app.get("/health", tags=["System"])
def health_check():
    """
    A simple liveness check. 
    Render uses this to know your app is running.
    If this endpoint stops responding, Render restarts the container.
    """
    return {"status": "healthy", "version": "1.0.0"}