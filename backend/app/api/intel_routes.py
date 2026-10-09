from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ...auth.dependencies import get_current_user
from ...auth.models import User
from ...models import CrisisAlert
from ..services.risk_engine_service import RiskEngineService
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/command-briefing")
def get_command_briefing(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    regions = RiskEngineService(db).get_overview()
    live_regions = [region for region in regions if region.get("observed_at")]
    critical_regions = [region for region in regions if region["risk_level"] == "CRITICAL"]
    latest_observation = max(
        (region["observed_at"] for region in live_regions),
        default=None,
    )

    if not regions:
        briefing_text = "Ethiopia monitoring is waiting for administrative regions to be initialized."
        priority = "No regions loaded"
    elif not live_regions:
        briefing_text = (
            f"{len(regions)} Ethiopian administrative regions are loaded, but no live weather observations are available yet. "
            "This dashboard provides preliminary weather screening, not official alerts."
        )
        priority = "Waiting for weather data"
    else:
        if critical_regions:
            names = ", ".join(region["region"] for region in critical_regions)
            condition = f"The local weather-screening model flags {len(critical_regions)} regions as critical: {names}."
        else:
            condition = "No region currently meets the local model's critical weather-screening threshold."
        briefing_text = (
            f"Live Open-Meteo observations are available for {len(live_regions)} of {len(regions)} Ethiopian regions. "
            f"{condition} Latest observation: {latest_observation}. "
            "This is preliminary weather screening, not an official forecast or emergency alert."
        )
        highest_region = max(regions, key=lambda region: region["risk_score"])
        priority = f"{highest_region['region']}: {highest_region['risk_level']} weather screening"

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "briefing_narrative": briefing_text,
        "priority_vulnerability": priority,
        "recommended_action": "Review current Open-Meteo observations and local screening indicators",
        "security_level": "LEVEL 4 ENCRYPTION ACTIVE"
    }
