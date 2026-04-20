from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ...database import get_db
from ...auth.dependencies import require_admin
from ...auth.models import User
from ...models import AuditLog
from pydantic import BaseModel

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_email: str
    details: str
    timestamp: datetime

    class Config:
        from_attributes = True

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()

def log_event(db: Session, action: str, user_email: str, details: str):
    new_log = AuditLog(
        action=action,
        user_email=user_email,
        details=details
    )
    db.add(new_log)
    db.commit()
