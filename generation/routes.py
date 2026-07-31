# generation/routes.py

import time
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from loguru import logger

from app.database import get_db
from auth.routes import get_current_user
from auth.models import User
from documents.models import QueryLog, Conversation
from retrieval.retrieval import hybrid_search
from generation.prompt import build_prompt
from generation.llm import generate_answer
from generation.faithfulness import check_faithfulness

router = APIRouter(prefix="/query", tags=["Query"])

# How many prior turns get fed back into the prompt as context.
# Kept small since every extra turn adds tokens to every future prompt
# in the conversation, increasing cost and generation_ms.
MAX_HISTORY_TURNS = 3


class QueryRequest(BaseModel):
    question: str
    conversation_id: Optional[int] = None


class SourceInfo(BaseModel):
    filename: str
    page_number: int
    relevance_score: float


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    conversation_id: int
    latency_ms: int
    retrieval_ms: int
    generation_ms: int
    faithfulness_ms: int


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

    # ── Conversation resolution ──────────────────────────────────────────
    if request.conversation_id is not None:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == request.conversation_id,
                Conversation.user_id == current_user.id,
                Conversation.organization_id == current_user.organization_id,
            )
            .first()
        )
        if conversation is None:
            logger.warning(
                f"Invalid conversation_id | user={current_user.email} | "
                f"conversation_id={request.conversation_id}"
            )
            conversation = Conversation(
                user_id=current_user.id,
                organization_id=current_user.organization_id,
                title=request.question[:80],
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
    else:
        conversation = Conversation(
                user_id=current_user.id,
                organization_id=current_user.organization_id,
                title=request.question[:80],
            )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    previous_turns = (
        db.query(QueryLog)
        .filter(QueryLog.conversation_id == conversation.id)
        .order_by(QueryLog.created_at.desc())
        .limit(MAX_HISTORY_TURNS)
        .all()
    )
    history = [
        {"query_text": turn.query_text, "answer_text": turn.answer_text}
        for turn in reversed(previous_turns)
    ]
    turn_number = len(previous_turns) + 1

    # ── Retrieval ─────────────────────────────────────────────────────────
    retrieval_start = time.time()
    chunks = hybrid_search(
        query=request.question,
        user_role=current_user.role,
        organization_id=current_user.organization_id,
        top_k=5,
    )
    retrieval_ms = int((time.time() - retrieval_start) * 1000)

    if not chunks:
        logger.warning(f"No chunks found | user={current_user.email} | question={request.question[:80]}")
        return QueryResponse(
            answer="No relevant documents were found for your question. Please contact HR directly.",
            sources=[],
            conversation_id=conversation.id,
            latency_ms=int((time.time() - total_start) * 1000),
            retrieval_ms=retrieval_ms,
            generation_ms=0,
            faithfulness_ms=0,
        )

    logger.info(f"Retrieval complete | chunks={len(chunks)} | retrieval_ms={retrieval_ms}")

    # ── Generation ────────────────────────────────────────────────────────
    generation_start = time.time()
    prompt = build_prompt(request.question, chunks, history=history)
    answer = generate_answer(prompt)
    generation_ms = int((time.time() - generation_start) * 1000)

    logger.info(f"Generation complete | generation_ms={generation_ms}")

    # ── Faithfulness check ───────────────────────────────────────────────
    faithfulness_start = time.time()
    faithfulness_score, hallucination_flagged = check_faithfulness(answer, chunks)
    faithfulness_ms = int((time.time() - faithfulness_start) * 1000)

    if hallucination_flagged:
        logger.warning(
            f"Hallucination flagged | user={current_user.email} | "
            f"faithfulness_score={faithfulness_score} | question={request.question[:80]}"
        )

    # ── Totals ────────────────────────────────────────────────────────────
    latency_ms = int((time.time() - total_start) * 1000)
    avg_score = sum(c["score"] for c in chunks) / len(chunks)

    # ── Log to database ───────────────────────────────────────────────────
    log = QueryLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        conversation_id=conversation.id,
        turn_number=turn_number,
        query_text=request.question,
        answer_text=answer,
        retrieval_score=int(avg_score * 100),
        faithfulness_score=faithfulness_score,
        hallucination_flagged=hallucination_flagged,
        latency_ms=latency_ms,
    )
    db.add(log)
    db.commit()

    logger.info(
        f"Query complete | user={current_user.email} | "
        f"retrieval_ms={retrieval_ms} | generation_ms={generation_ms} | "
        f"faithfulness_ms={faithfulness_ms} | total_ms={latency_ms}"
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
        conversation_id=conversation.id,
        latency_ms=latency_ms,
        retrieval_ms=retrieval_ms,
        generation_ms=generation_ms,
        faithfulness_ms=faithfulness_ms,
    )