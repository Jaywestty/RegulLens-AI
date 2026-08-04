# app/generation/faithfulness.py

import re
from typing import Dict, List, Set, Tuple

import numpy as np
from loguru import logger

from documents.embedder import embed_text

# Below this cosine similarity against the best-matching chunk, the answer
# is considered unsupported by the retrieved context and gets flagged.
FAITHFULNESS_THRESHOLD = 0.55

# Below this cosine similarity against the canonical refusal sentence, the
# answer is not considered a refusal and falls through to normal scoring.
# Kept looser than FAITHFULNESS_THRESHOLD since refusal phrasing varies
# more than factual prose does.
REFUSAL_SIMILARITY_THRESHOLD = 0.80

NO_ANSWER_MARKER = "This information was not found in the provided company documents."

# Precomputed once at import time so every request reuses the same vector
# instead of re-embedding the marker sentence on every call.
_NO_ANSWER_VECTOR = np.array(embed_text(NO_ANSWER_MARKER))

# Strips citation markers like "Source 1" or "Page 3" before number
# extraction, so citation indices are never mistaken for factual claims.
_CITATION_PATTERN = re.compile(r"\b(?:source|page|pg\.?|section)\s*#?\s*\d+", re.IGNORECASE)

# Captures currency amounts, plain integers/decimals, and percentages.
_NUMBER_PATTERN = re.compile(r"\$?\d[\d,]*\.?\d*\s*%?")


def _extract_numeric_claims(text: str) -> Set[str]:
    """
    Extracts a normalized set of numbers referenced in the given text.

    Currency symbols, thousands separators, and trailing ".0" are
    stripped so equivalent numbers written differently (e.g. "$5,000"
    vs "5000") compare equal. Percentages keep a "%" suffix so "15%"
    and a plain "15" are not treated as the same claim.
    """
    cleaned = _CITATION_PATTERN.sub(" ", text)
    claims: Set[str] = set()

    for raw in _NUMBER_PATTERN.findall(cleaned):
        token = raw.strip()
        is_percent = token.endswith("%")
        token = token.rstrip("%").strip()
        token = token.replace("$", "").replace(",", "")

        if token.endswith("."):
            token = token[:-1]
        elif token.endswith(".0"):
            token = token[:-2]

        if not token:
            continue

        claims.add(f"{token}%" if is_percent else token)

    return claims


def check_faithfulness(answer: str, chunks: List[Dict]) -> Tuple[int, bool]:
    """
    Scores how well the generated answer is supported by the retrieved chunks.

    Two independent checks feed the final flag:

    1. Semantic grounding: embeds the answer and each chunk, takes the
       highest cosine similarity between the answer and any single chunk.
       Catches answers that are off-topic or unrelated to the retrieved
       context entirely.

    2. Numeric grounding: extracts every number referenced in the answer
       and confirms each one appears somewhere in the retrieved chunk
       text. Catches a fabricated number sitting inside an otherwise
       well-grounded, fluent sentence, which semantic similarity alone
       cannot distinguish from a correct answer.

    Refusals are detected by embedding similarity against the canonical
    refusal sentence rather than an exact string match, so a differently
    worded but equivalent refusal is still recognized as safe.

    Returns (faithfulness_score, hallucination_flagged):
        faithfulness_score: 0-100, semantic grounding score against the
            best-matching chunk. Not adjusted by the numeric check, so it
            remains comparable across requests; check hallucination_flagged
            for the combined verdict.
        hallucination_flagged: True if either check fails.
    """
    if not chunks:
        return 0, True

    answer_vector = np.array(embed_text(answer))

    refusal_similarity = float(answer_vector @ _NO_ANSWER_VECTOR)
    if refusal_similarity >= REFUSAL_SIMILARITY_THRESHOLD:
        return 100, False

    chunk_vectors = np.array([embed_text(chunk["text"]) for chunk in chunks])
    similarities = chunk_vectors @ answer_vector
    best_similarity = float(np.max(similarities))
    faithfulness_score = int(round(max(best_similarity, 0) * 100))

    combined_chunk_text = " ".join(chunk["text"] for chunk in chunks)
    answer_numbers = _extract_numeric_claims(answer)
    chunk_numbers = _extract_numeric_claims(combined_chunk_text)
    ungrounded_numbers = answer_numbers - chunk_numbers

    embedding_flag = best_similarity < FAITHFULNESS_THRESHOLD
    numeric_flag = bool(ungrounded_numbers)

    if numeric_flag:
        logger.warning(
            f"Numeric grounding mismatch | ungrounded_numbers={ungrounded_numbers} | "
            f"faithfulness_score={faithfulness_score}"
        )

    hallucination_flagged = embedding_flag or numeric_flag

    return faithfulness_score, hallucination_flagged