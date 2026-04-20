from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ...database import get_db
from ..models.schemas import RiskIntelligenceResponse, OverviewResponse
from ..services.risk_engine_service import RiskEngineService
from ..services.alert_service import AlertService
from ..services.report_service import ReportService
from ..services.chatbot_service import ChatbotService
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

class SimulationRequest(BaseModel):
    rainfall_change: float
    inflation_change: float
    conflict_change: float
    health_outbreak: bool

class ChatRequest(BaseModel):
    message: str

router = APIRouter()

@router.post("/simulate/{region}")
def simulate_scenario(region: str, req: SimulationRequest, db: Session = Depends(get_db)):
    service = RiskEngineService(db)
    result = service.simulate_intelligence(
        region_name=region,
        rainfall_change=req.rainfall_change,
        inflation_change=req.inflation_change,
        conflict_change=req.conflict_change,
        health_outbreak=req.health_outbreak
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Region not found")
        
    return JSONResponse(content=result, headers={"Cache-Control": "no-store"})

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "EarlyGasha Intelligence API", "timestamp": datetime.now().isoformat()}

@router.get("/system/health")
def system_health_check(db: Session = Depends(get_db)):
    from ...models import Region, Indicator
    regions_count = db.query(Region).count()
    last_indicator = db.query(Indicator).order_by(Indicator.timestamp.desc()).first()
    return {
        "api_status": "online",
        "last_ingestion": last_indicator.timestamp.isoformat() if last_indicator else None,
        "regions_processed": regions_count,
        "service": "EarlyGasha Core"
    }

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    service = RiskEngineService(db)
    overview = service.get_overview() # Get data for scanner
    alerts = AlertService.scan_for_alerts(overview)
    return {
        "count": len(alerts),
        "alerts": alerts,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/report/generate")
def generate_pdf_report(region: str = None, min_score: float = 0.0, db: Session = Depends(get_db)):
    # 1. Gather Intelligence
    intel_service = RiskEngineService(db)
    
    if region:
        # Generate target brief for specific region
        intelligence = intel_service.get_region_intelligence(region)
        if not intelligence:
             raise HTTPException(status_code=404, detail="Region not found")
        full_intel_list = [intelligence]
        report_title = f"Strategic Brief: {region}"
    else:
        # Generate tactical summary for all relevant regions
        overview = intel_service.get_overview()
        full_intel_list = []
        for reg in overview:
            full_intel_list.append(intel_service.get_region_intelligence(reg['region']))
        report_title = "Regional Situation Summary"
    
    # 2. Filter by score if needed
    final_list = [i for i in full_intel_list if i['risk_score'] >= (min_score / 100)]
    
    # 3. Generate PDF
    report_service = ReportService()
    filepath, filename = report_service.generate_interactive_report(
        final_list, 
        title=report_title,
        min_score=0.0 # Already filtered above
    )
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type='application/pdf'
    )

@router.get("/risk/{region}")
def get_risk(region: str, db: Session = Depends(get_db)):
    service = RiskEngineService(db)
    intelligence = service.get_region_intelligence(region)
    if not intelligence:
        raise HTTPException(status_code=404, detail=f"Region {region} not found in scope.")
    return JSONResponse(content=intelligence, headers={"Cache-Control": "no-store"})

from ..services.forecasting_service import ForecastingService

@router.get("/forecast/overview")
def get_forecast_overview(db: Session = Depends(get_db)):
    service = ForecastingService(db)
    ranked_list = service.get_forecast_overview()
    data = {
        "count": len(ranked_list),
        "forecast_list": ranked_list,
        "timestamp": datetime.now().strftime("%Y-%m-%d")
    }
    return JSONResponse(content=data, headers={"Cache-Control": "no-store"})

@router.get("/forecast/{region}")
def get_forecast(region: str, db: Session = Depends(get_db)):
    service = ForecastingService(db)
    forecast = service.forecast_region(region)
    if not forecast:
        raise HTTPException(status_code=404, detail=f"Region {region} not found in scope.")
    return JSONResponse(content=forecast, headers={"Cache-Control": "no-store"})

@router.get("/forecast/validate/{region}")
def validate_forecast(region: str, db: Session = Depends(get_db)):
    service = ForecastingService(db)
    validation_report = service.validate_forecast(region)
    if not validation_report:
        raise HTTPException(status_code=404, detail=f"Region {region} not found in scope.")
    return JSONResponse(content=validation_report, headers={"Cache-Control": "no-store"})

@router.get("/intelligence/{region}")
def get_intelligence(region: str, db: Session = Depends(get_db)):
    service = RiskEngineService(db)
    intelligence = service.get_region_intelligence(region)
    if not intelligence:
        raise HTTPException(status_code=404, detail=f"Region {region} not found in scope.")
    return JSONResponse(content=intelligence, headers={"Cache-Control": "no-store"})

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    service = RiskEngineService(db)
    ranked_list = service.get_overview()
    data = {
        "count": len(ranked_list),
        "ranked_list": ranked_list,
        "timestamp": datetime.now().strftime("%Y-%m-%d")
    }
    return JSONResponse(content=data, headers={"Cache-Control": "no-store"})

from ..services.alert_engine import AlertEngine

@router.get("/alerts/active")
def get_active_alerts(db: Session = Depends(get_db)):
    engine = AlertEngine(db)
    alerts = engine.get_active_alerts()
    return JSONResponse(content={"count": len(alerts), "alerts": alerts}, headers={"Cache-Control": "no-store"})

@router.get("/alerts/{region}")
def get_region_alerts(region: str, db: Session = Depends(get_db)):
    engine = AlertEngine(db)
    alert = engine.get_region_alerts(region)
    if not alert:
        raise HTTPException(status_code=404, detail=f"No active alerts for region {region}.")
    return JSONResponse(content=alert, headers={"Cache-Control": "no-store"})

@router.post("/chat")
def chat_with_ai(req: ChatRequest, db: Session = Depends(get_db)):
    service = ChatbotService(db)
    response = service.process_message(req.message)
    return {"response": response}
