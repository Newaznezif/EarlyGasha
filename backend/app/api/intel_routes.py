from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ...auth.dependencies import get_current_user
from ...auth.models import User
from ...models import RiskScore, Region, CrisisAlert
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/command-briefing")
def get_command_briefing(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get high risk regions
    critical_regions = db.query(RiskScore).filter(RiskScore.overall_score > 0.8).order_by(RiskScore.overall_score.desc()).limit(3).all()
    active_alerts = db.query(CrisisAlert).limit(5).all()
    
    # Generate narrative briefing (simulated AI generation)
    briefing_text = "GLOBAL SITUATIONAL SUMMARY: "
    if critical_regions:
        names = [db.query(Region).filter(Region.id == r.region_id).first().name for r in critical_regions]
        briefing_text += f"CRITICAL alert status sustained in {', '.join(names)}. Risk vectors show high correlation with drought-induced displacement. "
    else:
        briefing_text += "No regions currently meet the CRITICAL risk threshold. Global baseline remains within standard deviation. "
    
    briefing_text += f"Total active alerts: {len(active_alerts)}. Tactical teams should focus on logistics pre-positioning in highly reactive sectors."

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "briefing_narrative": briefing_text,
        "priority_vulnerability": "Food Chain Integrity",
        "recommended_action": "Enable WebSocket command links for Field Officers",
        "security_level": "LEVEL 4 ENCRYPTION ACTIVE"
    }
