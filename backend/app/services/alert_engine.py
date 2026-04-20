from typing import Dict, List
import datetime
from sqlalchemy.orm import Session
from .forecasting_service import ForecastingService

_hysteresis_state = {}

class AlertEngine:
    """
    Transforms Risk & Forecast models into a Live Warning Stream using derived declarative thresholds.
    Implements memory-based hysteresis limits to ensure presentational UI stability during live demonstrations.
    """
    def __init__(self, db_session: Session):
        self.db = db_session
        self.forecast_engine = ForecastingService(self.db)

    def _evaluate_region(self, region_name: str) -> Dict:
        """Evaluates thresholds dynamically, employing state memory for debounce/hysteresis tracking."""
        forecast = self.forecast_engine.forecast_region(region_name)
        if not forecast: return None

        curr_risk = forecast["current_risk"]
        f14_risk = forecast["forecast_14_day_risk"]
        f7_risk = forecast["forecast_7_day_risk"]
        trend = forecast["trend"]
        
        # Hysteresis checks
        prev_level = _hysteresis_state.get(region_name, "NONE")
        level = "NONE"

        # Baseline Triggers
        thresh_crit_curr = 0.82 if prev_level == "CRITICAL" else 0.85
        thresh_crit_f14  = 0.85 if prev_level == "CRITICAL" else 0.90
        
        thresh_high_curr = 0.65 if prev_level in ["CRITICAL", "HIGH"] else 0.70
        thresh_high_delta = 0.10 if prev_level in ["CRITICAL", "HIGH"] else 0.15

        thresh_watch_curr = 0.45 if prev_level != "NONE" else 0.50

        if curr_risk >= thresh_crit_curr or f14_risk >= thresh_crit_f14:
            level = "CRITICAL"
        elif curr_risk >= thresh_high_curr or (f14_risk - curr_risk) > thresh_high_delta:
            level = "HIGH"
        elif curr_risk >= thresh_watch_curr or trend == "INCREASING":
            level = "WATCH"

        _hysteresis_state[region_name] = level

        if level == "NONE":
            return None

        # Isolate primary driver for decision-support clarity
        drivers = forecast.get("drivers", [])
        primary_driver = drivers[0] if drivers else "Unknown variables"
        if len(forecast.get("interaction_risk", [])) > 0:
             primary_driver = forecast["interaction_risk"][0].replace("_", " ")

        # Build response schema
        return {
            "region": forecast["region"],
            "alert_level": level,
            "current_risk": curr_risk,
            "forecast_7_day": f7_risk,
            "forecast_14_day": f14_risk,
            "primary_driver": primary_driver,
            "drivers": drivers,
            "interactions": forecast.get("interaction_risk", []),
            "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }

    def get_active_alerts(self) -> List[Dict]:
        from backend import models
        regions = self.db.query(models.Region).all()
        alerts = []
        for r in regions:
            al = self._evaluate_region(r.name)
            if al:
                alerts.append(al)
                
        # Sort by severity
        severity_map = {"CRITICAL": 3, "HIGH": 2, "WATCH": 1}
        return sorted(alerts, key=lambda x: (severity_map.get(x["alert_level"], 0), x["current_risk"]), reverse=True)

    def get_region_alerts(self, region_name: str) -> Dict:
        # Without database persistence, historical alerts simply re-evaluate current logic
        # For Phase 8 requirements we just evaluate the active stance
        al = self._evaluate_region(region_name)
        return al if al else {}
