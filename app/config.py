from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    database_url: str

    storage_endpoint: str
    storage_access_key: str
    storage_secret_key: str
    storage_bucket: str = "compliance-documents"
    storage_region: str = "us-east-1"

    opensearch_host: str = "localhost"
    opensearch_port: int = 9200

    groq_api_key: str

    # Path to the Tesseract OCR executable. Defaults to the standard
    # Windows install location for local dev. Set TESSERACT_CMD in .env
    # to override, e.g. to "/usr/bin/tesseract" on Linux/Render.
    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()