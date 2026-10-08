import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Top-level imports for stability
from .api.routes import router as api_router
from .api.field_routes import router as field_router
from .api.audit_routes import router as audit_router
from .api.toolkit_routes import router as toolkit_router
from .api.communication_routes import router as communication_router
from .api.ws_routes import router as ws_router
from .api.intel_routes import router as intel_router
from ..auth.routes import router as auth_router, admin_router
from ..database import engine, SessionLocal
from .. import models
from ..auth import models as auth_models
from ..auth.security import get_password_hash

def create_app() -> FastAPI:
    app = FastAPI(
        title="EarlyGasha Intelligence API",
        description="Unified Risk & Forecasting API for East Africa",
        version="2.2.0"
    )

    # CORS MUST BE FIRST
    cors_origins = [
        origin.strip().rstrip("/")
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex="https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        import traceback
        print("CRITICAL ENGINE ERROR:")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "trace": str(exc)},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    # Initialize database tables on startup
    @app.on_event("startup")
    def startup_event():
        print("BOOTSTRAP: Stage 1 - Initializing Peripheral Schemas...")
        models.Base.metadata.create_all(bind=engine)
        auth_models.Base.metadata.create_all(bind=engine)
        
        bootstrap_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL")
        bootstrap_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
        if bool(bootstrap_email) != bool(bootstrap_password):
            raise RuntimeError(
                "Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to provision an admin"
            )
        if bootstrap_password and len(bootstrap_password) < 12:
            raise RuntimeError("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters")

        print("BOOTSTRAP: Stage 2 - Establishing Identity Link...")
        db = SessionLocal()
        try:
            if bootstrap_email:
                admin_user = db.query(auth_models.User).filter(
                    auth_models.User.email == bootstrap_email
                ).first()
                if not admin_user:
                    print("BOOTSTRAP: Stage 3 - Provisioning Initial Command Authority...")
                    seed_admin = auth_models.User(
                        email=bootstrap_email,
                        hashed_password=get_password_hash(bootstrap_password),
                        role="system_admin"
                    )
                    db.add(seed_admin)
                    db.commit()
            
            # System Status Report
            region_count = db.query(models.Region).count()
            directive_count = db.query(models.Directive).count()
            print(f"BOOTSTRAP: SUCCESS - Gasha Intelligence Engine Online")
            print(f"REPORT: {region_count} regions active | {directive_count} command directives in queue")
        except Exception as e:
            print(f"BOOTSTRAP FAILURE: System Intercepted Error - {e}")
        finally:
            db.close()

    # Mount Routers
    app.include_router(api_router)
    app.include_router(field_router)
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(admin_router, prefix="/admin", tags=["admin"])
    app.include_router(audit_router, prefix="/admin/audit", tags=["admin"])
    app.include_router(toolkit_router, prefix="/toolkit", tags=["toolkit"])
    app.include_router(communication_router, prefix="/comm", tags=["communication"])
    app.include_router(ws_router)
    app.include_router(intel_router, prefix="/intel", tags=["intelligence"])

    return app

app = create_app()
