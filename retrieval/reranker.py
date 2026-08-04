# app/retrieval/reranker.py

from typing import List, Dict
import numpy as np
from sentence_transformers import CrossEncoder
from loguru import logger

# ms-marco-MiniLM-L-6-v2: a cross-encoder trained specifically for
# query-passage relevance ranking. Unlike bi-encoders (which embed query
# and text separately then compare vectors), a cross-encoder reads the
# query and text together in one pass, producing a more accurate but
# slower relevance score. That's why it's used to re-rank a small
# candidate pool rather than search the whole index.
print("Loading re-ranker model...")
_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
print("Re-ranker model ready.")


def rerank(query: str, chunks: List[Dict], top_k: int) -> List[Dict]:
    """
    Re-scores candidate chunks against the query and returns the top_k
    by cross-encoder relevance instead of the original OpenSearch score.

    Keeps the original hybrid score as hybrid_score and adds rerank_score
    so both are visible for debugging.
    """
    if not chunks:
        return chunks

    pairs = [[query, chunk["text"]] for chunk in chunks]
    scores = _model.predict(pairs)
    logger.debug(f"Raw cross-encoder scores | query={query[:60]} | scores={[round(float(s), 3) for s in scores]}")

    # Cross-encoder output is a raw logit whose absolute scale depends on
    # the training domain (short web-search pairs), not on this project's
    # formal policy-document text. Even a strong match here can produce a
    # deeply negative logit, so an absolute sigmoid collapses everything
    # toward 0 regardless of correctness. Min-max normalizing relative to
    # the other candidates in this same pool gives a meaningful 0-1 score:
    # the best match in the pool approaches 1, the weakest approaches 0.
    raw_scores = [float(s) for s in scores]
    score_min, score_max = min(raw_scores), max(raw_scores)
    score_range = score_max - score_min

    for chunk, raw_score in zip(chunks, raw_scores):
        if score_range > 0:
            normalized_score = (raw_score - score_min) / score_range
        else:
            # All candidates scored identically, likely a single-chunk
            # pool. Treat as a full match rather than dividing by zero.
            normalized_score = 1.0

        chunk["hybrid_score"] = chunk["score"]
        chunk["rerank_score"] = round(raw_score, 4)
        chunk["score"] = round(normalized_score, 4)

    ranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)
    return ranked[:top_k]