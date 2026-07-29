# app/documents/processor.py

import io
from typing import List, Dict
from pypdf import PdfReader
import docx
import fitz
import pytesseract
from PIL import Image
from loguru import logger
from app.config import settings

# Windows needs the Tesseract install path explicitly since it's not
# always on PATH the way it is on Linux/Mac. Comes from settings so the
# same code works locally (Windows) and in Docker/Render (Linux) just by
# changing the TESSERACT_CMD environment variable.
pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

# Below this word count, a "successfully" extracted page is treated as
# empty/scanned rather than genuinely short, and gets OCR'd instead.
MIN_WORDS_FOR_REAL_TEXT = 10

# Resolution multiplier when rasterizing a page for OCR. 2.0 roughly
# doubles DPI over the PDF default, which meaningfully improves OCR
# accuracy on small or low-quality scans at the cost of slower processing.
OCR_ZOOM_FACTOR = 2.0


def ocr_page(file_bytes: bytes, page_num: int) -> str:
    """
    Rasterizes a single PDF page to an image and runs Tesseract OCR on it.

    Used as a fallback when pypdf finds no extractable text — this happens
    when a page is a scanned image rather than real embedded text, which
    pypdf simply cannot read no matter how it's configured.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page = doc[page_num - 1]

    matrix = fitz.Matrix(OCR_ZOOM_FACTOR, OCR_ZOOM_FACTOR)
    pixmap = page.get_pixmap(matrix=matrix)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)

    doc.close()
    return pytesseract.image_to_string(image)


def extract_text_from_pdf(file_bytes: bytes) -> List[Dict]:
    """
    Reads a PDF page by page.
    Returns a list of dicts, one per page: {"page_number": 1, "text": "..."}

    We track page numbers so citations in answers are accurate.
    "This information is from page 4 of Employee Handbook.pdf" is far more
    useful than just "Employee Handbook.pdf".

    Pages with little or no extractable text are assumed to be scanned
    images and get OCR'd as a fallback, so scanned policy documents are
    still searchable instead of silently contributing zero content.
    """
    pages = []
    reader = PdfReader(io.BytesIO(file_bytes))

    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        word_count = len(text.split())

        if word_count < MIN_WORDS_FOR_REAL_TEXT:
            logger.info(f"Page {page_num} has little extractable text, attempting OCR")
            text = ocr_page(file_bytes, page_num)

        if text and text.strip():
            pages.append({"page_number": page_num, "text": text.strip()})
        else:
            logger.warning(f"Page {page_num} produced no text even after OCR")

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