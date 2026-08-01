# app/auth/routes.py
import re
from auth.models import User, UserRole, Organization, Department
from audit.service import log_audit_event
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from auth.models import User, UserRole
from auth.utils import hash_password, verify_password, create_access_token, decode_token
from typing import List

def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "organization"

router = APIRouter(prefix="/auth", tags=["Authentication"])

# This tells FastAPI where tokens come from
# It's also what adds the lock icons in /docs
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Pydantic Schemas ─────────────────────────────────────────────────────────
# These define the exact shape of data coming IN and going OUT of our endpoints.
# Pydantic validates them automatically — wrong data = automatic 422 error.

class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.EMPLOYEE
    department_ids: List[int] = []

class RoleChangeRequest(BaseModel):
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DepartmentSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    departments: List[DepartmentSummary] = []

    class Config:
        from_attributes = True

class OrganizationSignupRequest(BaseModel):
    organization_name: str
    admin_full_name: str
    admin_email: EmailStr
    admin_password: str


class OrganizationSignupResponse(BaseModel):
    organization_id: int
    organization_name: str
    access_token: str
    token_type: str = "bearer"

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

@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        full_name=request.full_name,
        hashed_password=hash_password(request.password),
        role=request.role,
        organization_id=current_user.organization_id,
    )

    if request.department_ids:
        departments = (
            db.query(Department)
            .filter(
                Department.id.in_(request.department_ids),
                Department.organization_id == current_user.organization_id,
            )
            .all()
        )
        if len(departments) != len(set(request.department_ids)):
            raise HTTPException(status_code=400, detail="One or more departments not found")
        user.departments = departments

    db.add(user)
    db.flush()

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="user.created",
        target_type="user",
        target_id=user.id,
        details={"email": user.email, "role": user.role.value},
    )

    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    return (
        db.query(User)
        .filter(User.organization_id == current_user.organization_id)
        .order_by(User.id)
        .all()
    )


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == current_user.organization_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="user.deleted",
        target_type="user",
        target_id=target.id,
        details={"email": target.email},
    )

    db.delete(target)
    db.commit()
    return None


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: int,
    request: RoleChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")

    target = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == current_user.organization_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    previous_role = target.role

    if previous_role == request.role:
        return target

    if previous_role == UserRole.ADMIN and request.role != UserRole.ADMIN:
        remaining_admins = (
            db.query(User)
            .filter(
                User.organization_id == current_user.organization_id,
                User.role == UserRole.ADMIN,
                User.id != target.id,
            )
            .count()
        )
        if remaining_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot change this user's role: they are the last remaining admin in this organization.",
            )

    target.role = request.role
    db.flush()

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="user.role_changed",
        target_type="user",
        target_id=target.id,
        details={"previous_role": previous_role.value, "new_role": request.role.value},
    )

    db.commit()
    db.refresh(target)
    return target


@router.post("/organizations/signup", response_model=OrganizationSignupResponse, status_code=201)
def signup_organization(request: OrganizationSignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    base_slug = slugify(request.organization_name)
    slug = base_slug
    suffix = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    organization = Organization(name=request.organization_name, slug=slug)
    db.add(organization)
    db.flush()

    admin = User(
        email=request.admin_email,
        full_name=request.admin_full_name,
        hashed_password=hash_password(request.admin_password),
        role=UserRole.ADMIN,
        organization_id=organization.id,
    )
    db.add(admin)
    db.flush()

    log_audit_event(
        db,
        organization_id=organization.id,
        actor_user_id=admin.id,
        action="organization.created",
        target_type="organization",
        target_id=organization.id,
        details={"organization_name": organization.name},
    )

    db.commit()
    db.refresh(organization)
    db.refresh(admin)

    token = create_access_token(
        data={"sub": admin.email, "role": admin.role.value, "org_id": admin.organization_id}
    )
    return {
        "organization_id": organization.id,
        "organization_name": organization.name,
        "access_token": token,
        "token_type": "bearer",
    }

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

    log_audit_event(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="user.login",
        target_type="user",
        target_id=user.id,
    )
    db.commit()

    token = create_access_token(
        data={"sub": user.email, "role": user.role.value, "org_id": user.organization_id}
    )
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the profile of whoever is currently logged in."""
    return current_user