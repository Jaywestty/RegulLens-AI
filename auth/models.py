# app/auth/models.py

import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base


class UserRole(str, enum.Enum):
    """
    A fixed list of valid roles. Using an enum instead of a plain string means:
    - No typos ("Adimn" can never get into the database)
    - Your editor gives you autocomplete
    - The database enforces valid values at the column level
    
    str + enum.Enum = the values are strings (so they serialize to JSON cleanly)
    """
    ADMIN = "admin"
    HR = "hr"
    EMPLOYEE = "employee"


class User(Base):
    """
    This Python class maps directly to a 'users' table in PostgreSQL.
    Each attribute with Column() becomes one column in that table.
    SQLAlchemy handles the SQL — you work in Python.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # index=True creates a database index — makes lookups by email fast
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    # NEVER store plain text passwords — only store hashes
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active = Column(Boolean, default=True)
    # server_default=func.now() means the DATABASE sets this timestamp
    # More reliable than setting it in Python (timezone consistency)
    created_at = Column(DateTime(timezone=True), server_default=func.now())