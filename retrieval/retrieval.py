# app/retrieval/retriever.py

from typing import List, Dict
from retrieval.opensearch import get_client, INDEX_NAME
from documents.embedder import embed_text
from auth.models import UserRole


def get_allowed_visibility(role: UserRole) -> List[str]:
    """
    Maps a user's role to the visibility levels they're allowed to see.

    This is enforced at the SEARCH level — not just the UI level.
    Even if someone calls the API directly, they cannot retrieve
    documents their role isn't permitted to see.
    That's what makes this genuine Role-Based Access Control.
    """
    if role == UserRole.ADMIN:
        return ["all", "hr_only", "admin_only"]
    elif role == UserRole.HR:
        return ["all", "hr_only"]
    else:
        return ["all"]


def hybrid_search(query: str, user_role: UserRole, top_k: int = 5) -> List[Dict]:
    """
    Runs a hybrid search combining BM25 and vector similarity.

    BM25 (keyword search):
        Counts how often query words appear in each chunk.
        Great for: "GDPR Article 17", "Section 4.2", specific legal terms.

    Vector search (semantic search):
        Compares the meaning of the query to each chunk.
        Great for: "what happens if I work from home?" matching
        chunks about "remote work policy".

    Combined formula:
        Final Score = (vector_score × 0.6) + (BM25_score × 0.4)

    Why 60/40?
    Compliance questions are usually natural language (favors semantic),
    but legal documents contain critical exact terms (favors BM25).
    60/40 is the sweet spot for this use case.
    """
    client = get_client()
    allowed_visibility = get_allowed_visibility(user_role)
    query_vector = embed_text(query)

    search_body = {
        "size": top_k,
        "query": {
            "bool": {
                # 'must' = mandatory filter. Visibility check is non-negotiable.
                "must": [
                    {"terms": {"visibility": allowed_visibility}}
                ],
                # 'should' = scored conditions. Higher score = more relevant.
                "should": [
                    {
                        "match": {
                            "text": {
                                "query": query,
                                "boost": 0.4   # BM25 weight
                            }
                        }
                    },
                    {
                        "knn": {
                            "embedding": {
                                "vector": query_vector,
                                "k": top_k,
                                "boost": 0.6   # Vector weight
                            }
                        }
                    },
                ],
            }
        },
        "_source": ["text", "document_id", "filename", "page_number"],
    }

    response = client.search(index=INDEX_NAME, body=search_body)

    return [
        {
            "text": hit["_source"]["text"],
            "document_id": hit["_source"]["document_id"],
            "filename": hit["_source"]["filename"],
            "page_number": hit["_source"]["page_number"],
            "score": round(hit["_score"], 4),
        }
        for hit in response["hits"]["hits"]
    ]