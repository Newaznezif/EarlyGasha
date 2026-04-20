from typing import Dict, List
import datetime
import math
from sqlalchemy.orm import Session
from .risk_engine_service import RiskEngineService

class ForecastingService:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.risk_engine = RiskEngineService(self.db)

    def _holt_linear_trend(self, series: List[float], alpha=0.3, beta=0.1, m=1) -> float:
        """Double Exponential Smoothing (Holt's Linear Trend)"""
        if not series: return 0.0
        if len(series) == 1: return series[0]
        
        S = series[0]
        b = series[1] - series[0]
        
        for i in range(1, len(series)):
            S_prev = S
            b_prev = b
            S = alpha * series[i] + (1 - alpha) * (S_prev + b_prev)
            b = beta * (S - S_prev) + (1 - beta) * b_prev
            
        forecast = S + m * b
        return max(0.0, forecast)

    def _calculate_error_metrics(self, actuals: List[float], predictions: List[float]) -> Dict:
        if not actuals or not predictions or len(actuals) != len(predictions):
            return {"rmse": 0.0, "mape": 0.0}
        
        n = len(actuals)
        mse = sum((actuals[i] - predictions[i])**2 for i in range(n)) / n
        rmse = math.sqrt(mse)
        
        mape_sum = 0
        valid_n = 0
        for i in range(n):
            if actuals[i] != 0:
                mape_sum += abs((actuals[i] - predictions[i]) / actuals[i])
                valid_n += 1
        mape = (mape_sum / valid_n) if valid_n > 0 else 0.0
        
        return {"rmse": round(rmse, 4), "mape": round(mape, 4)}

    def validate_forecast(self, region_name: str) -> Dict:
        """
        Backtesting engine: Simulates past forecasts over historical data to generate real scientific error metrics.
        Checks both 30-day short-term and 90-day stability metrics.
        """
        from backend import models
        region = self.db.query(models.Region).filter(models.Region.name.ilike(f"%{region_name}%")).first()
        if not region: return None

        since = datetime.datetime.utcnow() - datetime.timedelta(days=90)
        indicators = self.db.query(models.Indicator).filter(
            models.Indicator.region_id == region.id,
            models.Indicator.timestamp >= since
        ).order_by(models.Indicator.timestamp.asc()).all()
        
        # Simple backtest targeting representative volatility signals
        ts_food = [i.value for i in indicators if i.type == 'food_price' and i.value is not None]
        
        def run_backtest(series: List[float], max_window: int) -> Dict:
            preds = []
            actuals = []
            sub_series = series[-max_window:] if len(series) > max_window else series
            if len(sub_series) >= 4:
                for t in range(2, len(sub_series)-1):
                    train = sub_series[:t]
                    actual = sub_series[t]
                    pred = self._holt_linear_trend(train, m=1)
                    preds.append(pred)
                    actuals.append(actual)
            return self._calculate_error_metrics(actuals, preds)

        metrics_30 = run_backtest(ts_food, 30)
        metrics_90 = run_backtest(ts_food, 90)
        
        # Statistical confidence derivation (inverse of normalized prediction error)
        reliability = 1.0 / (1.0 + metrics_30["mape"]) if metrics_30["mape"] > 0 else 0.85
        
        return {
            "region": region.name,
            "historical_data_points": len(indicators),
            "rmse_30": metrics_30["rmse"],
            "mape_30": metrics_30["mape"],
            "rmse_90": metrics_90["rmse"],
            "mape_90": metrics_90["mape"],
            "model_reliability": round(reliability, 3),
            "validation_status": "SUCCESS" if len(ts_food) >= 4 else "INSUFFICIENT_DATA"
        }

    def forecast_region(self, region_name: str) -> Dict:
        from backend import models
        
        region = self.db.query(models.Region).filter(models.Region.name.ilike(f"%{region_name}%")).first()
        if not region: return None

        since = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        indicators = self.db.query(models.Indicator).filter(
            models.Indicator.region_id == region.id,
            models.Indicator.timestamp >= since
        ).order_by(models.Indicator.timestamp.asc()).all()

        ts_data = {"rainfall": [], "temperature": [], "food_price": [], "conflict": [], "health": []}
        for ind in indicators:
            if ind.type in ts_data and ind.value is not None:
                ts_data[ind.type].append(ind.value)

        baselines = {"rainfall": 50.0, "temperature": 25.0, "food_price": 2.0, "conflict": 0.0, "health": 0.0}

        def forecast_indicator(series: List[float], default: float, days_ahead: int) -> float:
            if not series: return default
            if len(series) == 1: return series[0]
            return self._holt_linear_trend(series, alpha=0.5, beta=0.2, m=days_ahead)

        f14 = {
            "rainfall": forecast_indicator(ts_data["rainfall"], baselines["rainfall"], 14),
            "temperature": forecast_indicator(ts_data["temperature"], baselines["temperature"], 14),
            "food_price": forecast_indicator(ts_data["food_price"], baselines["food_price"], 14),
            "conflict": forecast_indicator(ts_data["conflict"], baselines["conflict"], 14),
            "health": forecast_indicator(ts_data["health"], baselines["health"], 14)
        }

        f7 = {
            "rainfall": forecast_indicator(ts_data["rainfall"], baselines["rainfall"], 7),
            "temperature": forecast_indicator(ts_data["temperature"], baselines["temperature"], 7),
            "food_price": forecast_indicator(ts_data["food_price"], baselines["food_price"], 7),
            "conflict": forecast_indicator(ts_data["conflict"], baselines["conflict"], 7),
            "health": forecast_indicator(ts_data["health"], baselines["health"], 7)
        }

        c_rain = ts_data["rainfall"][-1] if ts_data["rainfall"] else baselines["rainfall"]
        c_temp = ts_data["temperature"][-1] if ts_data["temperature"] else baselines["temperature"]
        c_food = ts_data["food_price"][-1] if ts_data["food_price"] else baselines["food_price"]
        c_conf = ts_data["conflict"][-1] if ts_data["conflict"] else baselines["conflict"]
        c_heal = ts_data["health"][-1] if ts_data["health"] else baselines["health"]

        curr_score, _, _, _, _, _ = self.risk_engine._calculate_core_risk(c_rain, c_temp, c_food, c_conf, c_heal)
        risk7, _, _, _, _, _ = self.risk_engine._calculate_core_risk(f7["rainfall"], f7["temperature"], f7["food_price"], f7["conflict"], f7["health"])
        risk14, _, _, _, _, _ = self.risk_engine._calculate_core_risk(f14["rainfall"], f14["temperature"], f14["food_price"], f14["conflict"], f14["health"])

        slope = (risk14 - curr_score) / 14.0
        if slope > 0.005: trend = "INCREASING"
        elif slope < -0.005: trend = "DECREASING"
        else: trend = "STABLE"

        # Mathematical Feature Delta Attribution
        drivers = []
        
        delta_rain = self.risk_engine._calculate_core_risk(f14["rainfall"], c_temp, c_food, c_conf, c_heal)[0] - curr_score
        delta_food = self.risk_engine._calculate_core_risk(c_rain, c_temp, f14["food_price"], c_conf, c_heal)[0] - curr_score
        delta_conf = self.risk_engine._calculate_core_risk(c_rain, c_temp, c_food, f14["conflict"], c_heal)[0] - curr_score
        delta_heal = self.risk_engine._calculate_core_risk(c_rain, c_temp, c_food, c_conf, f14["health"])[0] - curr_score

        def format_driver(name, delta):
            if delta >= 0.01: return f"{name} contributed +{round(delta, 3)} to risk increase"
            if delta <= -0.01: return f"{name} contributed {round(delta, 3)} to risk decrease"
            return None

        for name, delta in [("rainfall", delta_rain), ("inflation", delta_food), ("conflict", delta_conf), ("health outbeak", delta_heal)]:
            driver_str = format_driver(name, delta)
            if driver_str: drivers.append(driver_str)

        if not drivers:
            drivers.append("all indicators stabilized with negligible marginal contribution")

        # Complex Interaction Detection (Coupled Shocks)
        interaction_risk = []
        if delta_food >= 0.05 and delta_conf >= 0.05:
            interaction_risk.append("food_conflict_coupling_detected")
        if delta_rain >= 0.05 and delta_conf >= 0.05: # High delta_rain implies DROUGHT (since higher risk)
            interaction_risk.append("drought_conflict_coupling_detected")
        if delta_rain >= 0.05 and delta_food >= 0.05:
            interaction_risk.append("drought_inflation_coupling_detected")

        # Ground confidence statistically
        validation = self.validate_forecast(region_name)
        confidence = validation["model_reliability"] if validation else 0.85

        return {
            "region": region.name,
            "current_risk": round(curr_score, 3),
            "forecast_7_day_risk": round(risk7, 3),
            "forecast_14_day_risk": round(risk14, 3),
            "trend": trend,
            "confidence": confidence,
            "drivers": drivers,
            "interaction_risk": interaction_risk
        }

    def get_forecast_overview(self) -> List[Dict]:
        from backend import models
        regions = self.db.query(models.Region).all()
        results = []
        for r in regions:
            f = self.forecast_region(r.name)
            if f:
                results.append(f)
        return sorted(results, key=lambda x: x["forecast_14_day_risk"], reverse=True)
