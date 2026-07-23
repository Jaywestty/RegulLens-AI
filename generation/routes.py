# generation/routes.py

import time
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from loguru import logger

from app.database import get_db
from auth.routes import get_current_user
from auth.models import User
from documents.models import QueryLog
from retrieval.retrieval import hybrid_search
from generation.prompt import build_prompt
from generation.llm import generate_answer

router = APIRouter(prefix="/query", tags=["Query"])


class QueryRequest(BaseModel):
    question: str


class SourceInfo(BaseModel):
    filename: str
    page_number: int
    relevance_score: float


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    latency_ms: int
    retrieval_ms: int
    generation_ms: int


@router.post("/", response_model=QueryResponse)
def query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full RAG pipeline with per-step latency tracking.
    
    We now track three time values:
    - retrieval_ms: how long OpenSearch took to find relevant chunks
    - generation_ms: how long Groq took to generate the answer
    - latency_ms: total end-to-end time
    
    This matters because if your system is slow, you need to know
    whether to optimize the search layer or the LLM call.
    They have completely different solutions.
    """
    total_start = time.time()

    logger.info(f"Query received | user={current_user.email} | question={request.question[:80]}")

    # ── Retrieval ─────────────────────────────────────────────────────────
    retrieval_start = time.time()
    chunks = hybrid_search(
        query=request.question,
        user_role=current_user.role,
        top_k=5,
    )
    retrieval_ms = int((time.time() - retrieval_start) * 1000)

    if not chunks:
        logger.warning(f"No chunks found | user={current_user.email} | question={request.question[:80]}")
        return QueryResponse(
            answer="No relevant documents were found for your question. Please contact HR directly.",
            sources=[],
            latency_ms=int((time.time() - total_start) * 1000),
            retrieval_ms=retrieval_ms,
            generation_ms=0,
        )

    logger.info(f"Retrieval complete | chunks={len(chunks)} | retrieval_ms={retrieval_ms}")

    # ── Generation ────────────────────────────────────────────────────────
    generation_start = time.time()
    prompt = build_prompt(request.question, chunks)
    answer = generate_answer(prompt)
    generation_ms = int((time.time() - generation_start) * 1000)

    logger.info(f"Generation complete | generation_ms={generation_ms}")

    # ── Totals ────────────────────────────────────────────────────────────
    latency_ms = int((time.time() - total_start) * 1000)
    avg_score = sum(c["score"] for c in chunks) / len(chunks)

    # ── Log to database ───────────────────────────────────────────────────
    log = QueryLog(
        user_id=current_user.id,
        query_text=request.question,
        answer_text=answer,
        retrieval_score=int(avg_score * 100),
        latency_ms=latency_ms,
    )
    db.add(log)
    db.commit()

    logger.info(
        f"Query complete | user={current_user.email} | "
        f"retrieval_ms={retrieval_ms} | generation_ms={generation_ms} | "
        f"total_ms={latency_ms}"
    )

    sources = [
        SourceInfo(
            filename=c["filename"],
            page_number=c["page_number"],
            relevance_score=c["score"],
        )
        for c in chunks
    ]

    return QueryResponse(
        answer=answer,
        sources=sources,
        latency_ms=latency_ms,
        retrieval_ms=retrieval_ms,
        generation_ms=generation_ms,
    )