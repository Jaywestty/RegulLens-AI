from typing import Optional
from sqlalchemy.orm import Session
from audit.models import AuditLog


def log_audit_event(
    db: Session,
    organization_id: int,
    action: str,
    target_type: str,
    actor_user_id: Optional[int] = None,
    target_id: Optional[int] = None,
    details: Optional[dict] = None,
):
    entry = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)