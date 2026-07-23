# app/evaluation/metrics.py

import numpy as np
from typing import List, Dict
from documents.embedder import embed_text


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Measures how similar two vectors are.
    Returns a number between 0 and 1 (since our vectors are normalized).
    1.0 = identical meaning. 0.0 = completely unrelated.
    
    The math: dot product divided by the product of magnitudes.
    Since we normalize to length 1, the denominator is always 1,
    so it simplifies to just the dot product.
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(dot / norm) if norm > 0 else 0.0


def detect_hallucination(answer: str, chunks: List[Dict], threshold: float = 0.25) -> bool:
    """
    Hallucination heuristic — a smart educated guess, not a perfect detector.

    Logic:
    If the LLM's answer is semantically very different from ALL retrieved chunks,
    it probably fabricated the answer rather than deriving it from the context.

    We embed the answer, embed each chunk, compare similarities.
    If the highest similarity is below the threshold → flag it.

    threshold=0.25: tuned to catch obvious hallucinations without
    too many false positives. You'd tune this based on real evaluation data.

    This is a heuristic, not ground truth. It's one signal among many.
    """
    if not answer or not chunks:
        return False

    answer_vec = embed_text(answer)
    max_similarity = 0.0

    for chunk in chunks:
        chunk_vec = embed_text(chunk["text"])
        sim = cosine_similarity(answer_vec, chunk_vec)
        max_similarity = max(max_similarity, sim)

    return max_similarity < threshold