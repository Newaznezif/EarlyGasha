import pandas as pd
import numpy as np
import sys
import os
from datetime import datetime, timedelta

# Add root to path to import ml_engine.risk_engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml_engine.risk_engine import extract_risk_signal, compute_composite_risk
from ml_engine.forecasting import ForecastingEngine

def calculate_risk_score(rainfall_anomaly, price_change, conflict_index, health_outbreaks):
    """
    Legacy compatibility function. 
    """
    c_risk = np.clip(rainfall_anomaly / 10, 0, 1)
    f_risk = np.clip(price_change, 0, 1)
    s_risk = np.clip(conflict_index / 20, 0, 1)
    h_risk = np.clip(health_outbreaks / 5, 0, 1)
    
    mock_features = {
        "climate": {"rainfall_anomaly": c_risk},
        "food": {"price_inflation_rate": f_risk},
        "health": {"outbreak_frequency": h_risk},
        "conflict": {"incident_frequency": s_risk}
    }
    
    score_float, level = compute_composite_risk(mock_features)
    return score_float * 100, level

def get_forecast(past_scores, window_days=14):
    """
    Redirected to use the new ForecastingEngine logic.
    """
    if not past_scores:
        return 0
    
    # Just a wrapper for common usage
    timestamps = [datetime.now() - timedelta(days=len(past_scores)-i) for i in range(len(past_scores))]
    engine = ForecastingEngine()
    df = engine.build_time_series(past_scores, timestamps)
    result = engine.forecast_risk_simple(df['y'])
    
    key = "7_days" if window_days <= 7 else "14_days" if window_days <= 14 else "30_days"
    return result.get(key, past_scores[-1])

def process_risk_for_region(db, region_id):
    """
    Comprehensive Service Layer:
    Features -> Signals -> Current Risk -> Future Forecast
    """
    from . import models
    
    # 1. Fetch historical indicators
    indicators = db.query(models.Indicator).filter(models.Indicator.region_id == region_id).order_by(models.Indicator.timestamp.asc()).all()
    region = db.query(models.Region).filter(models.Region.id == region_id).first()
    
    # 2. Extract Risk Signal (Current Features)
    region_data = {
        "region": region.name,
        "climate": [i.value for i in indicators if i.type == "rainfall"],
        "food": [i.value for i in indicators if i.type == "food_price"],
        "health": [i.value for i in indicators if i.type == "health"],
        "conflict": [i.value for i in indicators if i.type == "conflict"]
    }
    
    risk_signal = extract_risk_signal(region_data)
    current_score_scaled = risk_signal["risk_score"] * 100 
    
    # 3. Generate Forecast (Future Projection)
    # Fetch historical risk scores for this region to build the time-series
    past_risks = db.query(models.RiskScore).filter(models.RiskScore.region_id == region_id).order_by(models.RiskScore.timestamp.asc()).all()
    
    historical_y = [r.overall_score / 100 for r in past_risks] + [risk_signal["risk_score"]]
    historical_ds = [r.timestamp for r in past_risks] + [datetime.now()]
    
    forecaster = ForecastingEngine()
    ts_df = forecaster.build_time_series(historical_y, historical_ds)
    
    # Feature contribution for explanation
    contributions = {
        "Climate": np.mean(list(risk_signal["features"]["climate"].values())),
        "Economic": np.mean(list(risk_signal["features"]["food"].values())),
        "Health": np.mean(list(risk_signal["features"]["health"].values())),
        "Conflict": np.mean(list(risk_signal["features"]["conflict"].values()))
    }
    
    forecast_output = forecaster.generate_forecast_output(region.name, risk_signal["risk_score"], ts_df, contributions)
    
    # 4. Persistence
    risk_entry = models.RiskScore(
        region_id=region_id,
        overall_score=current_score_scaled,
        level=risk_signal["risk_level"],
        explanation=forecast_output["explanation"],
        forecast_window="30-day Horizon"
    )
    db.add(risk_entry)
    db.commit()
    db.refresh(risk_entry)
    
    return {
        "current": risk_signal,
        "forecast": forecast_output,
        "db_entry_id": risk_entry.id
    }
