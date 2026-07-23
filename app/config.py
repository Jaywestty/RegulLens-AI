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

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()