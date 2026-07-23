# app/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    This class reads every variable from your .env file automatically.
    """
    
    # App
    app_secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Database
    database_url: str
    
    # Supabase Storage
    supabase_url: str
    supabase_key: str
    supabase_bucket: str = "compliance-documents"
    
    # OpenSearch
    opensearch_host: str = "localhost"
    opensearch_port: int = 9200
    
    # Groq
    groq_api_key: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create ONE instance that the whole app imports
settings = Settings()