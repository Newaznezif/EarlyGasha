from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ...auth.dependencies import get_current_user, require_admin, require_role
from ...auth.models import User
from ...models import ResilienceIndicator, TrainingResource, SimulationScenario, Region, PreparednessFeedback, PreparednessReport
from pydantic import BaseModel
from .audit_routes import log_event
import json

router = APIRouter()

# --- Schemas ---
class IndicatorCreate(BaseModel):
    region_id: int
    category: str
    metric_name: str
    value: float

class TrainingResourceCreate(BaseModel):
    title: str
    resource_type: str
    content_url: str
    category: str

class SimulationScenarioCreate(BaseModel):
    title: str
    description: str
    hazard_type: str
    difficulty: str
    ai_parameters: dict

class FeedbackCreate(BaseModel):
    region_id: int
    indicator_id: Optional[int] = None
    feedback_text: str
    ground_truth_value: Optional[float] = None

# --- PUBLIC / COMMON ENDPOINTS ---

@router.get("/resilience-index/{region_id}")
def get_resilience_index(region_id: int, db: Session = Depends(get_db)):
    indicators = db.query(ResilienceIndicator).filter(ResilienceIndicator.region_id == region_id).all()
    region = db.query(Region).filter(Region.id == region_id).first()
    
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
        
    if not indicators:
        return {"region": region.name, "overall_resilience": 0, "categories": []}
        
    avg_score = sum([i.value for i in indicators]) / len(indicators)
    
    cats = {}
    for i in indicators:
        if i.category not in cats:
            cats[i.category] = []
        cats[i.category].append({"id": i.id, "metric": i.metric_name, "value": i.value})
        
    return {
        "region": region.name,
        "overall_resilience": round(avg_score, 2),
        "categories": [{"category": k, "metrics": v} for k, v in cats.items()]
    }

@router.get("/training-resources")
def get_training_resources(db: Session = Depends(get_db)):
    return db.query(TrainingResource).all()

# --- ADMIN ENDPOINTS ---

@router.post("/admin/indicators", tags=["admin"])
def configure_indicator(data: IndicatorCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    new_ind = ResilienceIndicator(**data.dict())
    db.add(new_ind)
    db.commit()
    log_event(db, "CONFIG_INDICATOR", current_user.email, f"Configured {data.metric_name} for region {data.region_id}")
    return new_ind

@router.post("/admin/training", tags=["admin"])
def manage_training(data: TrainingResourceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    new_res = TrainingResource(**data.dict())
    db.add(new_res)
    db.commit()
    log_event(db, "MANAGE_TRAINING", current_user.email, f"Added training resource: {data.title}")
    return new_res

@router.post("/admin/simulations", tags=["admin"])
def define_simulation(data: SimulationScenarioCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    new_sim = SimulationScenario(
        title=data.title,
        description=data.description,
        hazard_type=data.hazard_type,
        difficulty=data.difficulty,
        ai_parameters=json.dumps(data.ai_parameters)
    )
    db.add(new_sim)
    db.commit()
    log_event(db, "DEFINE_SIMULATION", current_user.email, f"Defined simulation scenario: {data.title}")
    return new_sim

# --- OPERATOR ENDPOINTS ---

@router.get("/simulation-scenarios")
def get_simulation_scenarios(db: Session = Depends(get_db)):
    return db.query(SimulationScenario).all()

@router.post("/operator/simulations/run/{scenario_id}")
def run_simulation(scenario_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["institutional_user", "system_admin"]))):
    scenario = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # AI Simulation Logic (placeholder for actual engine call)
    params = json.loads(scenario.ai_parameters)
    result = {
        "scenario": scenario.title,
        "status": "completed",
        "impact_score": round(params.get("intensity", 0.5) * 85, 2),
        "response_effectiveness": 0.72,
        "logs": ["Establishing scenario baseline...", "Injecting hazard stressors...", "Calculating response vector..."]
    }
    log_event(db, "RUN_SIMULATION", current_user.email, f"Ran simulation: {scenario.title}")
    return result

@router.get("/pre-positioning/{region_id}")
def get_pre_positioning_suggestions(region_id: int, db: Session = Depends(get_db)):
    from ...models import RiskScore
    latest_risk = db.query(RiskScore).filter(RiskScore.region_id == region_id).order_by(RiskScore.timestamp.desc()).first()
    indicators = db.query(ResilienceIndicator).filter(ResilienceIndicator.region_id == region_id).all()
    
    infra_score = sum([i.value for i in indicators if i.category == 'infrastructure']) / max(1, len([i.value for i in indicators if i.category == 'infrastructure']))
    
    suggestions = []
    if latest_risk and latest_risk.overall_score > 60:
        if infra_score > 0.6:
           suggestions.append({"type": "Primary Depot", "location": "Central Infrastructure Hub", "priority": "CRITICAL", "supplies": ["Medicine", "Food", "Water Filters"]})
        else:
           suggestions.append({"type": "Mobile Unit", "location": "Periphery Transit Point", "priority": "HIGH", "supplies": ["Emergency Tents", "First Aid Kits"]})
    else:
        suggestions.append({"type": "Strategic Reserve", "location": "Standard Holding Area", "priority": "ROUTINE", "supplies": ["Long-term Rations"]})
        
    return {
        "region_id": region_id,
        "risk_level": latest_risk.level if latest_risk else "UNKNOWN",
        "infra_score": round(infra_score, 2),
        "suggestions": suggestions
    }

# --- FIELD OFFICE ENDPOINTS ---

@router.post("/field/feedback", tags=["field"])
def submit_feedback(data: FeedbackCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["field_officer", "system_admin"]))):
    new_fb = PreparednessFeedback(
        user_id=current_user.id,
        region_id=data.region_id,
        indicator_id=data.indicator_id,
        feedback_text=data.feedback_text,
        ground_truth_value=data.ground_truth_value
    )
    db.add(new_fb)
    db.commit()
    log_event(db, "SUBMIT_FEEDBACK", current_user.email, f"Submitted ground-truth feedback for region {data.region_id}")
    return {"status": "success", "message": "Feedback synchronized with tactical core."}

# --- ADVANCED CONFIGURATION ENDPOINTS ---

@router.put("/admin/indicators/{indicator_id}", tags=["admin"])
def update_indicator(indicator_id: int, value: float, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    indicator = db.query(ResilienceIndicator).filter(ResilienceIndicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    indicator.value = value
    db.commit()
    return indicator

@router.delete("/admin/training/{resource_id}", tags=["admin"])
def delete_training(resource_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    resource = db.query(TrainingResource).filter(TrainingResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(resource)
    db.commit()
    return {"status": "deleted"}

@router.post("/admin/simulations/drift", tags=["admin"])
def adjust_simulation_drift(params: dict, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # This would typically update a global config or specific scenarios
    # For now, we simulate the audit log of the operation
    log_event(db, "ADJUST_DRIFT", current_user.email, f"Adjusted global simulation drift: {json.dumps(params)}")
    return {"status": "calibrated", "applied_vectors": list(params.keys())}
