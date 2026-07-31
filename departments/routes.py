from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from auth.models import User, Department
from auth.routes import require_hr_or_admin
from documents.models import Document
from audit.service import log_audit_event

router = APIRouter(prefix="/departments", tags=["Departments"])


class DepartmentCreateRequest(BaseModel):
    name: str


class DepartmentResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class AssignDepartmentsRequest(BaseModel):
    department_ids: List[int]

class DepartmentRenameRequest(BaseModel):
    name: str


class DepartmentUsageResponse(BaseModel):
    document_count: int
    user_count: int
    document_titles: List[str]
    user_emails: List[str]


@router.post("/", response_model=DepartmentResponse, status_code=201)
def create_department(
    request: DepartmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    existing = (
        db.query(Department)
        .filter(
            Department.organization_id == current_user.organization_id,
            Department.name == request.name,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")

    department = Department(name=request.name, organization_id=current_user.organization_id)
    db.add(department)
    db.flush()

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="department.created",
        target_type="department",
        target_id=department.id,
        details={"name": department.name},
    )

    db.commit()
    db.refresh(department)
    return department


@router.get("/", response_model=List[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    return (
        db.query(Department)
        .filter(Department.organization_id == current_user.organization_id)
        .order_by(Department.name)
        .all()
    )


@router.put("/users/{user_id}", response_model=List[DepartmentResponse])
def assign_user_departments(
    user_id: int,
    request: AssignDepartmentsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    target = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == current_user.organization_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

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

    previous_names = [d.name for d in target.departments]
    target.departments = departments

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="department.assignment_changed",
        target_type="user",
        target_id=target.id,
        details={
            "user_email": target.email,
            "previous_departments": previous_names,
            "new_departments": [d.name for d in departments],
        },
    )

    db.commit()
    db.refresh(target)
    return target.departments

@router.patch("/{department_id}", response_model=DepartmentResponse)
def rename_department(
    department_id: int,
    request: DepartmentRenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    department = (
        db.query(Department)
        .filter(Department.id == department_id, Department.organization_id == current_user.organization_id)
        .first()
    )
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    duplicate = (
        db.query(Department)
        .filter(
            Department.organization_id == current_user.organization_id,
            Department.name == request.name,
            Department.id != department_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="A department with this name already exists")

    old_name = department.name
    department.name = request.name

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="department.renamed",
        target_type="department",
        target_id=department.id,
        details={"old_name": old_name, "new_name": department.name},
    )

    db.commit()
    db.refresh(department)
    return department


def _get_department_usage(db: Session, department: Department) -> DepartmentUsageResponse:
    documents = db.query(Document).filter(Document.department_id == department.id).all()
    users = (
        db.query(User)
        .filter(User.departments.any(Department.id == department.id))
        .all()
    )
    return DepartmentUsageResponse(
        document_count=len(documents),
        user_count=len(users),
        document_titles=[d.filename for d in documents],
        user_emails=[u.email for u in users],
    )


@router.get("/{department_id}/usage", response_model=DepartmentUsageResponse)
def get_department_usage(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    department = (
        db.query(Department)
        .filter(Department.id == department_id, Department.organization_id == current_user.organization_id)
        .first()
    )
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    return _get_department_usage(db, department)


@router.delete("/{department_id}", status_code=204)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    department = (
        db.query(Department)
        .filter(Department.id == department_id, Department.organization_id == current_user.organization_id)
        .first()
    )
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    usage = _get_department_usage(db, department)
    if usage.document_count > 0 or usage.user_count > 0:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Department is still in use and cannot be deleted",
                "document_count": usage.document_count,
                "user_count": usage.user_count,
                "document_titles": usage.document_titles,
                "user_emails": usage.user_emails,
            },
        )

    log_audit_event(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="department.deleted",
        target_type="department",
        target_id=department.id,
        details={"name": department.name},
    )

    db.delete(department)
    db.commit()
    return None