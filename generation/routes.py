# app/generation/routes.py

import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

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


from typing import List


@router.post("/", response_model=QueryResponse)
def query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    The complete RAG pipeline — five steps, one endpoint:

    Step 1: Retrieve relevant chunks from OpenSearch (role-filtered)
    Step 2: Build a context-aware prompt
    Step 3: Generate an answer using the LLM
    Step 4: Log everything for evaluation
    Step 5: Return the answer with citations

    Every step is timed so we can monitor performance in the dashboard.
    """
    start = time.time()

    # ── Step 1: Retrieve ──────────────────────────────────────────────────
    chunks = hybrid_search(
        query=request.question,
        user_role=current_user.role,
        top_k=5,
    )

    if not chunks:
        return QueryResponse(
            answer="No relevant documents were found for your question. Please contact HR directly.",
            sources=[],
            latency_ms=int((time.time() - start) * 1000),
        )

    # ── Step 2: Build Prompt ──────────────────────────────────────────────
    prompt = build_prompt(request.question, chunks)

    # ── Step 3: Generate ──────────────────────────────────────────────────
    answer = generate_answer(prompt)

    # ── Step 4: Calculate latency and log ─────────────────────────────────
    latency_ms = int((time.time() - start) * 1000)
    avg_score = sum(c["score"] for c in chunks) / len(chunks)

    log = QueryLog(
        user_id=current_user.id,
        query_text=request.question,
        answer_text=answer,
        retrieval_score=int(avg_score * 100),
        latency_ms=latency_ms,
    )
    db.add(log)
    db.commit()

    # ── Step 5: Return ────────────────────────────────────────────────────
    sources = [
        SourceInfo(
            filename=c["filename"],
            page_number=c["page_number"],
            relevance_score=c["score"],
        )
        for c in chunks
    ]

    return QueryResponse(answer=answer, sources=sources, latency_ms=latency_ms)