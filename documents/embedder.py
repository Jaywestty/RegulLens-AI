# app/documents/embedder.py

from typing import List
from sentence_transformers import SentenceTransformer

# This loads the model from the internet the first time, then caches it locally.
# BAAI/bge-small-en: 33MB, 384 dimensions, free, fast, excellent for English docs.
# "bge" = BAAI General Embedding. Consistently top-ranked on the MTEB leaderboard.
print("⏳ Loading embedding model...")
_model = SentenceTransformer("BAAI/bge-small-en")
print("✅ Embedding model ready.")


def embed_text(text: str) -> List[float]:
    """
    Converts one piece of text into a vector — a list of 384 numbers.

    What does a vector represent?
    Each number captures a dimension of meaning.
    "Employee leave policy" and "staff vacation rules" will produce
    very similar vectors even though they share no words.
    That's semantic understanding.

    normalize_embeddings=True scales the vector length to 1.
    This makes cosine similarity comparisons fair across different text lengths.
    """
    embedding = _model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embeds multiple texts in one batch — much more efficient than a loop.
    batch_size=32 means it processes 32 texts at a time through the model.
    """
    embeddings = _model.encode(texts, normalize_embeddings=True, batch_size=32)
    return embeddings.tolist()