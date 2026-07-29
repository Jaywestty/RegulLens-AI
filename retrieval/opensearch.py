# app/retrieval/opensearch.py

from opensearchpy import OpenSearch
from app.config import settings

INDEX_NAME = "compliance_documents"

def get_client() -> OpenSearch:
    return OpenSearch(
        hosts=[{"host": settings.opensearch_host, "port": settings.opensearch_port}],
        http_compress=True,
        use_ssl=False,
        verify_certs=False,
    )


def create_index():
    """
    Creates the OpenSearch index — think of it as creating a specialized table
    designed for both keyword search and vector (semantic) search.

    The 'mapping' is the schema. We define:
    - text fields: used by BM25 (keyword search)
    - embedding field: used by KNN (vector search)

    knn = K-Nearest Neighbors: finds the K vectors most similar to your query vector.
    hnsw = the graph algorithm that makes KNN fast at scale.
    cosinesimil = cosine similarity: measures the angle between vectors.
    """
    client = get_client()

    if client.indices.exists(index=INDEX_NAME):
        print(f"✅ Index '{INDEX_NAME}' already exists.")
        return

    mapping = {
        "settings": {
            "index": {"knn": True}
        },
        "mappings": {
            "properties": {
                "text":        {"type": "text"},
                "document_id": {"type": "integer"},
                "filename":    {"type": "keyword"},
                "page_number": {"type": "integer"},
                "chunk_id":    {"type": "integer"},
                "visibility":  {"type": "keyword"},
                "embedding": {
                    "type": "knn_vector",
                    "dimension": 384,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "lucene",
                    },
                },
            }
        },
    }

    client.indices.create(index=INDEX_NAME, body=mapping)
    print(f"✅ Index '{INDEX_NAME}' created.")


def delete_chunks_by_document(document_id: int):
    """
    Removes every indexed chunk belonging to a document.

    Used when a document is replaced by a newer version — the old chunks
    must be removed from OpenSearch or the search index would return
    answers sourced from an outdated policy alongside the current one.
    """
    client = get_client()
    client.delete_by_query(
        index=INDEX_NAME,
        body={"query": {"term": {"document_id": document_id}}},
    )
    client.indices.refresh(index=INDEX_NAME)



def bulk_index_chunks(chunks: list):
    """
    Stores many chunks at once using OpenSearch's bulk API.
    Bulk is always faster than indexing one by one —
    it sends everything in one HTTP request instead of N requests.
    """
    from opensearchpy.helpers import bulk
    client = get_client()

    actions = [
        {"_index": INDEX_NAME, "_source": chunk}
        for chunk in chunks
    ]
    bulk(client, actions)
    # Refresh makes new docs immediately searchable (slight performance cost,
    # acceptable here since uploads don't happen every second)
    client.indices.refresh(index=INDEX_NAME)