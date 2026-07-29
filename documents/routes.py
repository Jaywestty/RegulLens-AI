# documents/routes.py

import uuid
import time
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.database import get_db
from auth.models import User
from auth.routes import require_hr_or_admin
from typing import Optional
from documents.models import Document, DocumentStatus, DocumentVisibility
from documents.processor import process_document
from documents.embedder import embed_texts
from documents.storage import upload_file
from retrieval.opensearch import bulk_index_chunks, delete_chunks_by_document

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx"}


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    visibility: DocumentVisibility = Form(DocumentVisibility.ALL),
    replaces_document_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    start = time.time()
    logger.info(f"Upload started | file={file.filename} | user={current_user.email}")

    extension = file.filename.split(".")[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF and DOCX files are supported. Got: .{extension}"
        )

    previous_doc = None
    new_version = 1

    if replaces_document_id is not None:
        previous_doc = db.query(Document).filter(Document.id == replaces_document_id).first()
        if previous_doc is None:
            raise HTTPException(
                status_code=404,
                detail=f"Document {replaces_document_id} not found, cannot replace it."
            )
        if previous_doc.status == DocumentStatus.SUPERSEDED:
            raise HTTPException(
                status_code=400,
                detail=f"Document {replaces_document_id} is already superseded and cannot be replaced again directly."
            )
        new_version = previous_doc.version + 1

    file_bytes = await file.read()
    storage_path = upload_file(file_bytes, file.filename, file.content_type)
    logger.info(f"File stored | path={storage_path}")

    doc = Document(
        filename=file.filename,
        storage_path=storage_path,
        file_type=extension,
        status=DocumentStatus.PROCESSING,
        visibility=visibility,
        uploaded_by=current_user.id,
        version=new_version,
        previous_version_id=previous_doc.id if previous_doc else None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        chunks = process_document(file_bytes, extension)
        logger.info(f"Document chunked | file={file.filename} | chunks={len(chunks)}")

        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        logger.info(f"Embeddings generated | count={len(embeddings)}")

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

        bulk_index_chunks(os_chunks)
        logger.info(f"Chunks indexed in OpenSearch | document_id={doc.id}")

        doc.status = DocumentStatus.READY
        doc.chunk_count = len(chunks)
        db.commit()

        if previous_doc is not None:
            delete_chunks_by_document(previous_doc.id)
            previous_doc.status = DocumentStatus.SUPERSEDED
            db.commit()
            logger.info(
                f"Previous version superseded | old_document_id={previous_doc.id} | "
                f"new_document_id={doc.id} | version={doc.version}"
            )

        total_ms = int((time.time() - start) * 1000)
        logger.info(
            f"Upload complete | file={file.filename} | "
            f"chunks={len(chunks)} | total_ms={total_ms}"
        )

        return {
            "message": "Document uploaded and processed successfully",
            "document_id": doc.id,
            "filename": file.filename,
            "chunks_created": len(chunks),
            "visibility": visibility.value,
            "version": doc.version,
            "replaces_document_id": previous_doc.id if previous_doc else None,
        }

    except Exception as e:
        doc.status = DocumentStatus.FAILED
        db.commit()
        logger.error(f"Upload failed | file={file.filename} | error={str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/")
def list_documents(
    include_superseded: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Lists documents. By default, superseded versions are hidden so HR sees
    only the current, searchable set. Pass include_superseded=true to see
    the full version history.
    """
    query = db.query(Document)
    if not include_superseded:
        query = query.filter(Document.status != DocumentStatus.SUPERSEDED)

    docs = query.order_by(Document.id.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "status": d.status,
            "visibility": d.visibility,
            "chunk_count": d.chunk_count,
            "version": d.version,
            "previous_version_id": d.previous_version_id,
            "created_at": d.created_at,
        }
        for d in docs
    ]