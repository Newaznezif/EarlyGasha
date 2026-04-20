from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ..models.schemas import FieldReportCreate, FieldReportResponse
from ...auth.dependencies import get_current_user, require_field_officer, require_admin
from ...auth.models import User
from ...models import FieldReport, Region
from datetime import datetime

router = APIRouter(prefix="/field", tags=["field-officer"])

@router.post("/report", response_model=FieldReportResponse)
def submit_report(
    report_data: FieldReportCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from .audit_routes import log_event
    # Verify region exists
    region = db.query(Region).filter(Region.id == report_data.region_id).first()
    if not region:
        # Try finding by name if ID was placeholder
        region = db.query(Region).filter(Region.name == str(report_data.region_id)).first()
        if not region:
             raise HTTPException(status_code=404, detail="Region not found")
    
    new_report = FieldReport(
        user_id=current_user.id,
        region_id=region.id,
        report_type=report_data.report_type,
        severity=report_data.severity,
        description=report_data.description,
        latitude=report_data.latitude,
        longitude=report_data.longitude,
        timestamp=datetime.utcnow(),
        status="pending"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    log_event(db, "SITREP_SUBMISSION", current_user.email, f"New {new_report.report_type} SITREP for region ID {new_report.region_id}")
    return new_report

@router.get("/reports", response_model=List[FieldReportResponse])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(FieldReport).filter(FieldReport.user_id == current_user.id).all()

@router.get("/all-reports", response_model=List[FieldReportResponse])
def get_all_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(FieldReport).all()

@router.post("/verify/{report_id}", response_model=FieldReportResponse)
def verify_report(
    report_id: int,
    status: str, # verified or rejected
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from .audit_routes import log_event
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if status not in ["verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    report.status = status
    db.commit()
    db.refresh(report)
    
    log_event(db, "SITREP_VERIFICATION", current_user.email, f"Report {report.id} marked as {status}")
    return report

@router.get("/directives")
def get_directives(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from ...models import Directive, Region
    directives = db.query(Directive).join(Region).filter(Directive.status == "active").all()
    return [{
        "id": d.id,
        "region": d.region.name,
        "priority": d.priority,
        "objective": d.objective,
        "timestamp": d.timestamp
    } for d in directives]

@router.post("/directives/{directive_id}/complete")
def complete_directive(
    directive_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from ...models import Directive
    from .audit_routes import log_event
    directive = db.query(Directive).filter(Directive.id == directive_id).first()
    if not directive:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    directive.status = "completed"
    db.commit()
    
    log_event(db, "MISSION_COMPLETE", current_user.email, f"Operator marked Directive {directive_id} as COMPLETED")
    return {"detail": "Mission parameters satisfied."}
