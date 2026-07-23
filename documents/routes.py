# app/documents/routes.py

import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from auth.models import User
from auth.routes import require_hr_or_admin
from documents.models import Document, DocumentStatus, DocumentVisibility
from documents.processor import process_document
from documents.embedder import embed_texts
from documents.storage import upload_file
from retrieval.opensearch import bulk_index_chunks

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx"}


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    visibility: DocumentVisibility = Form(DocumentVisibility.ALL),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    The complete document ingestion pipeline in one endpoint.

    Order of operations matters:
    1. Validate → 2. Store raw file → 3. Create DB record → 4. Process →
    5. Embed → 6. Index in OpenSearch → 7. Mark ready

    We create the DB record BEFORE processing (step 3) so if processing
    fails, we have a record of the failed document to debug later.
    """

    # ── 1. Validate file type ─────────────────────────────────────────────
    extension = file.filename.split(".")[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF and DOCX files are supported. Got: .{extension}"
        )

    # ── 2. Read file bytes ────────────────────────────────────────────────
    file_bytes = await file.read()

    # ── 3. Upload raw file to Supabase Storage ────────────────────────────
    storage_path = upload_file(file_bytes, file.filename, file.content_type)

    # ── 4. Create database record (status = processing) ───────────────────
    doc = Document(
        filename=file.filename,
        storage_path=storage_path,
        file_type=extension,
        status=DocumentStatus.PROCESSING,
        visibility=visibility,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # ── 5–7. Process, embed, and index ────────────────────────────────────
    try:
        # Extract text and split into chunks
        chunks = process_document(file_bytes, extension)

        # Embed all chunk texts in one batch (efficient)
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)

        # Prepare for OpenSearch — each chunk gets metadata + its vector
        os_chunks = [
            {
                "document_id": doc.id,
                "filename": file.filename,
                "page_number": chunk["page_number"],
                "chunk_id": chunk["chunk_id"],
                "text": chunk["text"],
                "visibility": visibility.value,
                "embedding": embeddings[i],
            }
            for i, chunk in enumerate(chunks)
        ]

        # Send everything to OpenSearch at once
        bulk_index_chunks(os_chunks)

        # Update the database record — document is now searchable
        doc.status = DocumentStatus.READY
        doc.chunk_count = len(chunks)
        db.commit()

        return {
            "message": "Document uploaded and processed successfully",
            "document_id": doc.id,
            "filename": file.filename,
            "chunks_created": len(chunks),
            "visibility": visibility.value,
        }

    except Exception as e:
        # Mark as failed so admins know something went wrong
        doc.status = DocumentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """Returns all documents. HR/Admin only."""
    docs = db.query(Document).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "status": d.status,
            "visibility": d.visibility,
            "chunk_count": d.chunk_count,
            "created_at": d.created_at,
        }
        for d in docs
    ]