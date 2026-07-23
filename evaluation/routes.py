# app/evaluation/routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from auth.routes import require_admin
from documents.models import QueryLog, Document, DocumentStatus

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),   # _ means we need the auth check but not the user object
):
    """
    System-wide performance dashboard.

    This endpoint answers:
    - How much is the system being used? (query volume)
    - How fast is it? (latency)
    - Is it hallucinating? (hallucination rate)
    - Are retrievals confident? (retrieval score)
    - How many documents are indexed? (document stats)

    In a real product, you'd feed this into Grafana or Datadog.
    For portfolio purposes, this endpoint demonstrates observability awareness.
    """
    total_queries = db.query(func.count(QueryLog.id)).scalar() or 0
    avg_latency = db.query(func.avg(QueryLog.latency_ms)).scalar() or 0
    avg_retrieval = db.query(func.avg(QueryLog.retrieval_score)).scalar() or 0

    hallucination_count = (
        db.query(func.count(QueryLog.id))
        .filter(QueryLog.hallucination_flagged == True)
        .scalar() or 0
    )
    hallucination_rate = (
        round((hallucination_count / total_queries) * 100, 2)
        if total_queries > 0 else 0.0
    )

    total_docs = db.query(func.count(Document.id)).scalar() or 0
    ready_docs = (
        db.query(func.count(Document.id))
        .filter(Document.status == DocumentStatus.READY)
        .scalar() or 0
    )

    return {
        "query_volume": total_queries,
        "average_latency_ms": round(float(avg_latency), 1),
        "average_retrieval_score": round(float(avg_retrieval), 1),
        "hallucination_rate_percent": hallucination_rate,
        "total_documents": total_docs,
        "ready_documents": ready_docs,
    }


@router.get("/recent-queries")
def get_recent_queries(
    limit: int = 20,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    """Returns the most recent queries for manual review."""
    logs = (
        db.query(QueryLog)
        .order_by(QueryLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "query": log.query_text,
            "latency_ms": log.latency_ms,
            "retrieval_score": log.retrieval_score,
            "hallucination_flagged": log.hallucination_flagged,
            "created_at": log.created_at,
        }
        for log in logs
    ]