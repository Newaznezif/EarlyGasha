import sys
import os
import numpy as np
from typing import Dict
from datetime import datetime
from functools import lru_cache

class RiskEngineService:
    """
    Unified Service Layer calculating intelligence strictly via empirical formulas over normalized Real-World Data.
    """
    
    def __init__(self, db_session):
        self.db = db_session

    @lru_cache(maxsize=32)
    def _get_cached_intelligence(self, region_name: str, cache_key: str) -> Dict:
        """Internal cached method for heavy intelligence computing"""
        return self._compute_intelligence(region_name)

    def get_region_intelligence(self, region_name: str) -> Dict:
        # Use a simple daily/hourly cache key based on the current timestamp
        cache_key = datetime.now().strftime("%Y-%m-%d-%H") 
        return self._get_cached_intelligence(region_name, cache_key)

    def _compute_intelligence(self, region_name: str) -> Dict:
        from backend import models
        import logging
        
        region = self.db.query(models.Region).filter(models.Region.name.ilike(f"%{region_name}%")).first()
        if not region:
            return None
            
        # 1. Fetch latest data (safely handling None)
        rainfall_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "rainfall").order_by(models.Indicator.timestamp.desc()).first()
        temp_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "temperature").order_by(models.Indicator.timestamp.desc()).first()
        food_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "food_price").order_by(models.Indicator.timestamp.desc()).first()
        conflict_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "conflict").order_by(models.Indicator.timestamp.desc()).first()
        health_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "health").order_by(models.Indicator.timestamp.desc()).first()
        
        # 2. Safely extract values (Fallback to safe baselines if NULL)
        raw_rainfall = rainfall_ind.value if rainfall_ind and rainfall_ind.value is not None else 50.0  # safe avg mm
        raw_temp = temp_ind.value if temp_ind and temp_ind.value is not None else 25.0
        raw_inflation = food_ind.value if food_ind and food_ind.value is not None else 2.0
        raw_conflict = conflict_ind.value if conflict_ind and conflict_ind.value is not None else 0.0
        raw_health = health_ind.value if health_ind and health_ind.value is not None else 0.0
        
    def _calculate_core_risk(self, raw_rainfall, raw_temp, raw_inflation, raw_conflict, raw_health):
        # 3. NORMALIZE TO 0.0 - 1.0 (Higher = More Risk)
        climate_rain_risk = 1.0 - np.clip((raw_rainfall) / 100.0, 0, 1) if raw_rainfall >= 0 else 1.0
        climate_temp_risk = np.clip((raw_temp - 25) / 15.0, 0, 1)
        climate_risk = (0.7 * climate_rain_risk) + (0.3 * climate_temp_risk)
        
        food_risk = np.clip(raw_inflation / 20.0, 0, 1)
        conflict_risk = np.clip(raw_conflict / 10.0, 0, 1)
        health_risk = np.clip(raw_health / 2.0, 0, 1)
        
        # 4. FINAL RISK MODEL
        final_score = (0.4 * climate_risk) + (0.3 * food_risk) + (0.2 * conflict_risk) + (0.1 * health_risk)
        final_score = float(np.clip(final_score, 0, 1))
        
        # 5. Determine Classification and Interpretability
        if final_score < 0.3: level = "LOW"
        elif final_score < 0.6: level = "MEDIUM"
        elif final_score < 0.8: level = "HIGH"
        else: level = "CRITICAL"
        
        drivers = []
        if climate_rain_risk > 0.6: drivers.append("severe drought conditions")
        elif climate_temp_risk > 0.7: drivers.append("severe temperature anomalies")
        if food_risk > 0.6: drivers.append("inflation spike impacting food security")
        if conflict_risk > 0.5: drivers.append("conflict escalation")
        if health_risk > 0.5: drivers.append("rising health outbreak signals")
        
        if not drivers:
            drivers.append("stable baseline indicators")
            
        return final_score, level, drivers, climate_risk, food_risk, conflict_risk

    def _compute_intelligence(self, region_name: str) -> Dict:
        from backend import models
        import logging
        
        region = self.db.query(models.Region).filter(models.Region.name.ilike(f"%{region_name}%")).first()
        if not region:
            return None
            
        # 1. Fetch latest data (safely handling None)
        rainfall_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "rainfall").order_by(models.Indicator.timestamp.desc()).first()
        temp_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "temperature").order_by(models.Indicator.timestamp.desc()).first()
        food_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "food_price").order_by(models.Indicator.timestamp.desc()).first()
        conflict_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "conflict").order_by(models.Indicator.timestamp.desc()).first()
        health_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "health").order_by(models.Indicator.timestamp.desc()).first()
        
        # 2. Safely extract values (Fallback to safe baselines if NULL)
        raw_rainfall = rainfall_ind.value if rainfall_ind and rainfall_ind.value is not None else 50.0
        raw_temp = temp_ind.value if temp_ind and temp_ind.value is not None else 25.0
        raw_inflation = food_ind.value if food_ind and food_ind.value is not None else 2.0
        raw_conflict = conflict_ind.value if conflict_ind and conflict_ind.value is not None else 0.0
        raw_health = health_ind.value if health_ind and health_ind.value is not None else 0.0
        
        final_score, level, drivers, climate_risk, food_risk, conflict_risk = self._calculate_core_risk(
            raw_rainfall, raw_temp, raw_inflation, raw_conflict, raw_health
        )
        
        return {
            "region": region.name,
            "risk_score": round(final_score, 3),
            "risk_level": level,
            "drivers": drivers,
            "forecast": {"7_days": final_score, "14_days": final_score, "30_days": final_score},
            "forecast_risk_levels": [],
            "trend": "STABLE",
            "explanation": "Driven by: " + ", ".join(drivers),
            "timestamp": datetime.now().strftime("%Y-%m-%d"),
            "features": {"climate": {"risk": climate_risk}, "food": {"risk": food_risk}, "conflict": {"risk": conflict_risk}}
        }

    def simulate_intelligence(self, region_name: str, rainfall_change: float, inflation_change: float, conflict_change: float, health_outbreak: bool) -> Dict:
        """
        Runs a stateless what-if simulation to recompute the risk model instantaneously without hitting DB write locks.
        """
        from backend import models
        region = self.db.query(models.Region).filter(models.Region.name.ilike(f"%{region_name}%")).first()
        if not region: return None
        
        rainfall_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "rainfall").order_by(models.Indicator.timestamp.desc()).first()
        temp_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "temperature").order_by(models.Indicator.timestamp.desc()).first()
        food_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "food_price").order_by(models.Indicator.timestamp.desc()).first()
        conflict_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "conflict").order_by(models.Indicator.timestamp.desc()).first()
        health_ind = self.db.query(models.Indicator).filter(models.Indicator.region_id == region.id, models.Indicator.type == "health").order_by(models.Indicator.timestamp.desc()).first()
        
        # Get baselines
        base_rainfall = rainfall_ind.value if rainfall_ind and rainfall_ind.value is not None else 50.0
        raw_temp = temp_ind.value if temp_ind and temp_ind.value is not None else 25.0
        base_inflation = food_ind.value if food_ind and food_ind.value is not None else 2.0
        base_conflict = conflict_ind.value if conflict_ind and conflict_ind.value is not None else 0.0
        base_health = health_ind.value if health_ind and health_ind.value is not None else 0.0
        
        # Original Score computation
        orig_score, orig_level, _, _, _, _ = self._calculate_core_risk(
            base_rainfall, raw_temp, base_inflation, base_conflict, base_health
        )
        
        # Apply deltas
        # rainfall_change is a percentage (-40 means -40%)
        sim_rainfall = max(0.0, base_rainfall * (1.0 + (rainfall_change / 100.0)))
        sim_inflation = max(0.0, base_inflation + inflation_change)
        sim_conflict = max(0.0, base_conflict + conflict_change)
        sim_health = 10.0 if health_outbreak else base_health
        
        sim_score, sim_level, sim_drivers, _, _, _ = self._calculate_core_risk(
            sim_rainfall, raw_temp, sim_inflation, sim_conflict, sim_health
        )
        
        return {
            "region": region.name,
            "original_risk": round(orig_score, 3),
            "simulated_risk": round(sim_score, 3),
            "risk_level": sim_level,
            "drivers": sim_drivers
        }


    def get_overview(self) -> list:
        from backend import models
        regions = self.db.query(models.Region).all()
        overview = []
        
        for r in regions:
            # Lighter weight overview calculation
            # Just take the latest risk score from the DB instead of re-running ML pipelines
            latest_risk = self.db.query(models.RiskScore).filter(models.RiskScore.region_id == r.id).order_by(models.RiskScore.timestamp.desc()).first()
            
            risk_score = latest_risk.overall_score / 100 if latest_risk else 0.5
            
            # Simple level mapping
            if risk_score < 0.3: level = "LOW"
            elif risk_score < 0.6: level = "MEDIUM"
            elif risk_score < 0.8: level = "HIGH"
            else: level = "CRITICAL"

            overview.append({
                "id": r.id,
                "region": r.name,
                "country": r.country,
                "lat": r.latitude,
                "lon": r.longitude,
                "risk_score": risk_score,
                "risk_level": level,
                "trend": "STABLE" # Placeholder for overview
            })
        
        return sorted(overview, key=lambda x: x["risk_score"], reverse=True)
