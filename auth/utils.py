# app/auth/utils.py

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

# CryptContext is the password hashing manager
# "bcrypt" is the algorithm — it's deliberately slow (that's the point)
# Slow hashing = brute force attacks take years, not seconds
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Turns "mypassword123" into something like "$2b$12$eImiTXuWVxfM37uY..."
    
    This is a one-way operation. You cannot reverse it.
    Even if your database gets stolen, the attacker can't recover passwords.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if a plain password matches the stored hash.
    Bcrypt re-hashes the plain password and compares.
    Never decrypts.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a JWT token — the digital badge we hand to users after login.
    
    The token contains:
    - "sub": the user's email (sub = subject, standard JWT terminology)
    - "role": their role (so we know permissions without hitting the database)
    - "exp": expiry timestamp (token dies after this time)
    
    The token is SIGNED with our secret key.
    If anyone tampers with the data inside, the signature breaks.
    We can detect tampering instantly.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, settings.app_secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[dict]:
    """
    Verifies the token's signature and decodes the payload.
    
    Returns the payload dict if valid.
    Returns None if the token is expired, tampered with, or malformed.
    """
    try:
        payload = jwt.decode(
            token,
            settings.app_secret_key,
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None