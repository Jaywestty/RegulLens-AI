# app/documents/models.py

import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DocumentStatus(str, enum.Enum):
    PROCESSING = "processing"   # File uploaded, being chunked and embedded
    READY = "ready"             # Fully processed, searchable
    FAILED = "failed"           # Something went wrong during processing
    SUPERSEDED = "superseded"   # Replaced by a newer version, no longer searchable


class DocumentVisibility(str, enum.Enum):
    ALL = "all"                 # Every logged-in employee can see this
    HR_ONLY = "hr_only"         # Only HR and Admin
    ADMIN_ONLY = "admin_only"   # Only Admin


class Document(Base):
    """
    Stores metadata about each uploaded document.
    The actual file lives in Supabase Storage.
    This table is the index — it tracks what files exist and their status.
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    # storage_path = the file's path inside Supabase Storage bucket
    storage_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)       # "pdf" or "docx"
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PROCESSING)
    visibility = Column(Enum(DocumentVisibility), default=DocumentVisibility.ALL)
    # ForeignKey links to the users table — tracks who uploaded this
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    chunk_count = Column(Integer, default=0)

    # version starts at 1 and increments each time this document is replaced.
    # previous_version_id links back to the document this one superseded,
    # so the full history of a policy can be traced even though only the
    # current version is searchable.
    version = Column(Integer, default=1, nullable=False)
    previous_version_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    """
    Groups a sequence of related queries together into one session.

    An employee's first question starts a new conversation. Follow-up
    questions reference the same conversation_id, which lets the query
    route pull prior turns as context for the LLM.
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    turns = relationship("QueryLog", back_populates="conversation", order_by="QueryLog.created_at")


class QueryLog(Base):
    """
    Every single query gets recorded here.
    This powers the admin evaluation dashboard.
    It's how we know if the system is working well or drifting.
    """
    __tablename__ = "query_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    turn_number = Column(Integer, nullable=False, default=1)
    query_text = Column(String, nullable=False)
    answer_text = Column(String)
    # retrieval_score: how confident was the search? (0-100)
    retrieval_score = Column(Integer)
    # faithfulness_score: did the answer match the context? (0-100)
    faithfulness_score = Column(Integer)
    latency_ms = Column(Integer)
    hallucination_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="turns")
