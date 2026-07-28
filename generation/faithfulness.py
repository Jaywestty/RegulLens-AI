# app/generation/faithfulness.py

from typing import List, Dict, Tuple
import numpy as np
from documents.embedder import embed_text

# Below this cosine similarity, the answer is considered unsupported by the
# retrieved context and gets flagged for human review.
FAITHFULNESS_THRESHOLD = 0.55

NO_ANSWER_MARKER = "This information was not found in the provided company documents."


def check_faithfulness(answer: str, chunks: List[Dict]) -> Tuple[int, bool]:
    """
    Scores how well the generated answer is supported by the retrieved chunks.

    Embeds the answer and each chunk's text, then takes the highest cosine
    similarity between the answer and any single chunk. A well-grounded
    answer should closely match at least one of its cited sources.

    Embeddings are normalized, so cosine similarity is the dot product.

    Returns (faithfulness_score, hallucination_flagged):
        faithfulness_score: 0-100, higher means better grounded
        hallucination_flagged: True if score falls below the threshold
    """
    if answer.strip() == NO_ANSWER_MARKER:
        return 100, False

    if not chunks:
        return 0, True

    answer_vector = np.array(embed_text(answer))
    chunk_vectors = np.array([embed_text(chunk["text"]) for chunk in chunks])

    similarities = chunk_vectors @ answer_vector
    best_similarity = float(np.max(similarities))

    faithfulness_score = int(round(max(best_similarity, 0) * 100))
    hallucination_flagged = best_similarity < FAITHFULNESS_THRESHOLD

    return faithfulness_score, hallucination_flagged