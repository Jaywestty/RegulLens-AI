import uuid
import boto3
from botocore.client import Config
from app.config import settings


def get_storage_client():
    """
    Creates an S3-compatible client pointed at MinIO locally.
    In production, point STORAGE_ENDPOINT at Supabase Storage or real S3
    and this function needs zero changes.
    
    endpoint_url: where the storage server lives
    signature_version=s3v4: the auth signing method MinIO expects
    """
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name=settings.storage_region,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket_exists():
    """
    Creates the bucket if it doesn't exist yet.
    Safe to call every startup — checks first before creating.
    A bucket is like a top-level folder in your storage.
    """
    client = get_storage_client()
    try:
        client.head_bucket(Bucket=settings.storage_bucket)
    except Exception:
        client.create_bucket(Bucket=settings.storage_bucket)
        print(f"✅ Created storage bucket: {settings.storage_bucket}")


def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Uploads a file to MinIO/S3.
    Returns the storage path — saved in PostgreSQL so we can find the file later.
    """
    client = get_storage_client()
    storage_path = f"{uuid.uuid4()}/{filename}"

    client.put_object(
        Bucket=settings.storage_bucket,
        Key=storage_path,
        Body=file_bytes,
        ContentType=content_type,
    )

    return storage_path


def download_file(storage_path: str) -> bytes:
    """Downloads a file and returns its raw bytes."""
    client = get_storage_client()
    response = client.get_object(Bucket=settings.storage_bucket, Key=storage_path)
    return response["Body"].read()

def delete_file(storage_path: str) -> None:
    """
    Deletes a file from MinIO/S3.
    S3-compatible delete calls are idempotent — this won't raise even if
    the file is already gone, so it's safe to call as pure cleanup.
    """
    client = get_storage_client()
    client.delete_object(Bucket=settings.storage_bucket, Key=storage_path)