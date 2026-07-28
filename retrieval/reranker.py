# app/retrieval/reranker.py

from typing import List, Dict
import numpy as np
from sentence_transformers import CrossEncoder

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

    for chunk, raw_score in zip(chunks, scores):
        # Cross-encoder output is a raw logit, not a bounded score.
        # Sigmoid squashes it to 0-1 so it behaves like a confidence value,
        # consistent with the old hybrid score's range.
        normalized_score = float(1 / (1 + np.exp(-raw_score)))

        chunk["hybrid_score"] = chunk["score"]
        chunk["rerank_score"] = round(float(raw_score), 4)
        chunk["score"] = round(normalized_score, 4)

    ranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)
    return ranked[:top_k]