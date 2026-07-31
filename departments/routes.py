from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from auth.models import User, Department
from auth.routes import require_hr_or_admin

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

    target.departments = departments
    db.commit()
    db.refresh(target)
    return target.departments