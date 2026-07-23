# app/auth/routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from auth.models import User, UserRole
from auth.utils import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# This tells FastAPI where tokens come from
# It's also what adds the lock icons in /docs
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Pydantic Schemas ─────────────────────────────────────────────────────────
# These define the exact shape of data coming IN and going OUT of our endpoints.
# Pydantic validates them automatically — wrong data = automatic 422 error.

class RegisterRequest(BaseModel):
    email: EmailStr        # EmailStr validates it's a real email format
    full_name: str
    password: str
    role: UserRole = UserRole.EMPLOYEE


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole

    class Config:
        # Allows Pydantic to read from SQLAlchemy model attributes
        # Without this, Pydantic can't convert your database object to JSON
        from_attributes = True


# ── Reusable Dependencies ────────────────────────────────────────────────────
# These are functions that FastAPI injects into routes automatically.
# Any route that adds "Depends(get_current_user)" gets the logged-in user for free.

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts the JWT from the request header, verifies it,
    and returns the User object from the database.
    
    Any route that needs authentication just adds:
    current_user: User = Depends(get_current_user)
    FastAPI handles the rest automatically.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    email: str = payload.get("sub")
    if not email:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise credentials_exception

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Gate that only lets admins through. Used in admin-only routes."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_hr_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Gate that lets HR and Admin through. Used for document upload."""
    if current_user.role not in [UserRole.HR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="HR or Admin access required")
    return current_user


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Creates a new user account.
    
    Note: In a real enterprise system, registration would be invite-only.
    For this portfolio project, it's open so you can create test users easily.
    """
    # Check if email is already taken
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        full_name=request.full_name,
        hashed_password=hash_password(request.password),
        role=request.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)   # Refreshes the object so 'id' and 'created_at' are populated
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Verifies credentials and returns a JWT token.
    
    OAuth2PasswordRequestForm is a standard FastAPI form that expects
    'username' and 'password' fields. We use email as the username.
    This is the standard OAuth2 spec — username doesn't have to be a username.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the profile of whoever is currently logged in."""
    return current_user