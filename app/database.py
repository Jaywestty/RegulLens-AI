# app/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# The engine is the actual connection to PostgreSQL (your Supabase database)
# It manages a pool of connections so the app doesn't open a new one every request
engine = create_engine(
    settings.database_url,
    # pool_pre_ping checks if the connection is still alive before using it
    # Supabase can close idle connections, so this prevents "connection closed" errors
    pool_pre_ping=True
)

# A Session is one conversation with the database
# Think of it like opening a browser tab — you do your work, then close it
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class all our database table definitions inherit from
# It's what gives them the ability to become real PostgreSQL tables
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session per request.
    
    The 'yield' makes this a generator — it gives the session to the route,
    and the code after 'yield' runs after the route finishes (like a finally block).
    
    This guarantees the session is always closed, even if the route crashes.
    No connection leaks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()