# app/documents/storage.py

import uuid
from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    """Creates and returns a Supabase client."""
    return create_client(settings.supabase_url, settings.supabase_key)


def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Uploads a file to Supabase Storage.
    
    We generate a UUID prefix so two files with the same name don't clash.
    Example storage path: "a3f9c1b2-xxxx/employee-handbook.pdf"
    
    Returns the storage path — we save this in PostgreSQL to find the file later.
    """
    client = get_supabase_client()
    storage_path = f"{uuid.uuid4()}/{filename}"

    client.storage.from_(settings.supabase_bucket).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type}
    )

    return storage_path


def download_file(storage_path: str) -> bytes:
    """Downloads a file from Supabase Storage and returns its raw bytes."""
    client = get_supabase_client()
    response = client.storage.from_(settings.supabase_bucket).download(storage_path)
    return response