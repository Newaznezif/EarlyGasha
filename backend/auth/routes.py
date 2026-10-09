import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from backend.auth.database import get_db
from backend.auth.models import User, UserSession
from backend.auth.security import get_password_hash, verify_password, create_access_token
from backend.auth.dependencies import get_current_user, require_admin

router = APIRouter()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "user"
    region_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    region_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    password: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str
    role: Literal["institutional_user", "field_officer", "community_user"] = "institutional_user"

def _create_auth_response(user: User, request: Request, db: Session, event_type: str):
    access_token = create_access_token(
        data={"user_id": user.id, "role": user.role}
    )

    try:
        import uuid
        client_host = getattr(request.client, "host", "127.0.0.1")
        new_session = UserSession(
            user_id=user.id,
            token_id=str(uuid.uuid4()),
            ip_address=client_host,
            user_agent=request.headers.get("user-agent", "Unknown")
        )
        db.add(new_session)
        db.commit()

        from backend.app.api.audit_routes import log_event
        log_event(db, event_type, user.email, f"User session established from {client_host}")
    except Exception as e:
        print(f"SESSION LOGGING ERROR (Non-Critical): {e}")

    return {
        "token": access_token,
        "user": {
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    print(f"DEBUG: Receiving registration request for email: {user_data.email}")
    try:
        db_user = db.query(User).filter(User.email == user_data.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Prevent self-escalation to admin
        safe_role = user_data.role if user_data.role != "system_admin" else "institutional_user"
        
        hashed_pw = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email, 
            hashed_password=hashed_pw,
            role=safe_role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        from backend.app.api.audit_routes import log_event
        log_event(db, "IDENTITY_PROVISIONED", new_user.email, f"New operator node established with role: {new_user.role}")
        
        print(f"DEBUG: Successfully registered user: {new_user.email}")
        return new_user
    except Exception as e:
        print(f"DEBUG: Registration internal error: {e}")
        raise

@router.post("/login")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return _create_auth_response(user, request, db, "TACTICAL_UPLINK")

@router.post("/google")
def google_login(auth_data: GoogleAuthRequest, request: Request, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    try:
        claims = id_token.verify_oauth2_token(
            auth_data.credential,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from exc
    except GoogleAuthError as exc:
        raise HTTPException(status_code=503, detail="Google sign-in is temporarily unavailable") from exc

    email = claims.get("email")
    if not email or claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="A verified Google email is required")

    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            role=auth_data.role,
            full_name=claims.get("name"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _create_auth_response(user, request, db, "GOOGLE_SIGN_IN")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.password:
        current_user.hashed_password = get_password_hash(profile_data.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# ================= ADMIN ROUTES =================

admin_router = APIRouter()

@admin_router.get("/dashboard")
def admin_dashboard(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Calculate System Health
    users_count = db.query(User).count()
    from backend import models
    monitored_regions = db.query(models.Region).count()
    total_data_points = db.query(models.Indicator).count()
    field_reports_count = db.query(models.FieldReport).count()
    latest_reports = db.query(models.FieldReport).order_by(models.FieldReport.timestamp.desc()).limit(5).all()
    
    return {
        "status": "online",
        "active_monitors": monitored_regions,
        "users": users_count,
        "data_points": total_data_points,
        "field_reports": field_reports_count,
        "reports": [{
            "id": r.id,
            "report_type": r.report_type,
            "description": r.description,
            "timestamp": r.timestamp,
            "status": r.status
        } for r in latest_reports],
        "mode": "Administrative Override"
    }

@admin_router.get("/users")
def get_all_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id, 
        "email": u.email, 
        "role": u.role, 
        "full_name": u.full_name,
        "bio": u.bio,
        "created_at": u.created_at,
        "updated_at": u.updated_at
    } for u in users]

@admin_router.post("/users", response_model=UserResponse)
def create_operator(user_data: UserCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Check if exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Identity already registered in the matrix.")
    
    new_op = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        region_id=user_data.region_id
    )
    db.add(new_op)
    db.commit()
    db.refresh(new_op)
    
    from backend.app.api.audit_routes import log_event
    log_event(db, "OPERATOR_PROVISIONED", current_user.email, f"Operator {new_op.email} assigned to regional sector ID {new_op.region_id}")
    return new_op

@admin_router.get("/sessions")
def get_all_sessions(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    sessions = db.query(UserSession).join(User).all()
    return [{
        "id": s.id,
        "email": s.user.email,
        "ip": s.ip_address,
        "user_agent": s.user_agent,
        "last_activity": s.last_activity
    } for s in sessions]
    
@admin_router.get("/alerts")
def get_admin_alerts(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from backend.app.services.alert_engine import AlertEngine
    engine = AlertEngine(db)
    return {"alerts": engine.get_active_alerts()}

class DirectiveCreate(BaseModel):
    region_id: int
    priority: str
    objective: str

@admin_router.post("/directives")
def create_directive(directive: DirectiveCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from backend import models
    new_directive = models.Directive(
        issuer_id=current_user.id,
        target_region_id=directive.region_id,
        priority=directive.priority,
        objective=directive.objective
    )
    db.add(new_directive)
    db.commit()

    from backend.app.api.audit_routes import log_event
    log_event(db, "COMMAND_DIRECTIVE", current_user.email, f"New mission issued to Region {directive.region_id}: {directive.objective[:] if len(directive.objective) < 100 else directive.objective[:97]+'...'}")
    
    return {"detail": "Directive issued to sector."}

@admin_router.get("/directives")
def get_all_directives(db: Session = Depends(get_db)):
    from backend import models
    directives = db.query(models.Directive).join(models.Region).all()
    return [{
        "id": d.id,
        "region": d.region.name,
        "priority": d.priority,
        "objective": d.objective,
        "timestamp": d.timestamp,
        "status": d.status
    } for d in directives]

@admin_router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot self-terminate from administrative session.")
        
    db.delete(user)
    db.commit()
    return {"detail": "Identity purged from matrix."}
