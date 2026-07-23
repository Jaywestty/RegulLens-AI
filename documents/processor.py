# app/documents/processor.py

import io
from typing import List, Dict
from pypdf import PdfReader
import docx


def extract_text_from_pdf(file_bytes: bytes) -> List[Dict]:
    """
    Reads a PDF page by page.
    Returns a list of dicts, one per page: {"page_number": 1, "text": "..."}
    
    We track page numbers so citations in answers are accurate.
    "This information is from page 4 of Employee Handbook.pdf" is far more
    useful than just "Employee Handbook.pdf".
    """
    pages = []
    reader = PdfReader(io.BytesIO(file_bytes))

    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text()
        if text and text.strip():
            pages.append({"page_number": page_num, "text": text.strip()})

    return pages


def extract_text_from_docx(file_bytes: bytes) -> List[Dict]:
    """
    Reads a Word document paragraph by paragraph.
    Word docs don't have page numbers we can extract reliably,
    so we group every 10 paragraphs and treat each group as a "page".
    This gives us approximate location references.
    """
    doc = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    pages = []
    group_size = 10
    for i in range(0, len(paragraphs), group_size):
        group = paragraphs[i : i + group_size]
        pages.append({
            "page_number": (i // group_size) + 1,
            "text": " ".join(group)
        })

    return pages


def chunk_pages(pages: List[Dict], chunk_size: int = 600, overlap: int = 90) -> List[Dict]:
    """
    Splits pages into overlapping chunks.

    Why chunking?
    An LLM can't read a 50-page document at once. Chunking breaks it into
    bite-sized pieces we can search through efficiently.

    Why overlap?
    If a sentence starts at the end of chunk 1 and finishes at the start of
    chunk 2, without overlap that sentence gets split and loses meaning.
    Overlap makes sure boundary content appears in at least one complete chunk.

    chunk_size=600 words ≈ 800 tokens ≈ enough context to answer a question
    overlap=90 words = 15% of 600 = the standard recommendation
    """
    chunks = []
    chunk_id = 0

    for page in pages:
        words = page["text"].split()
        start = 0

        while start < len(words):
            end = start + chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)

            if chunk_text.strip():
                chunks.append({
                    "chunk_id": chunk_id,
                    "page_number": page["page_number"],
                    "text": chunk_text,
                })
                chunk_id += 1

            if end >= len(words):
                break

            # Move forward by (chunk_size - overlap) so the next chunk
            # starts 90 words before where this one ended
            start += chunk_size - overlap

    return chunks


def process_document(file_bytes: bytes, file_type: str) -> List[Dict]:
    """
    Master function: raw file bytes → list of chunks ready for embedding.
    This is the only function the upload route needs to call.
    """
    if file_type == "pdf":
        pages = extract_text_from_pdf(file_bytes)
    elif file_type in ["docx", "doc"]:
        pages = extract_text_from_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    return chunk_pages(pages)