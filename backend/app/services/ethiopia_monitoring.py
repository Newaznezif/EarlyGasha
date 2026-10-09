import json
import logging
from datetime import datetime
from pathlib import Path
from threading import Event, Thread

import requests
from shapely.geometry import shape

from backend import models
from backend.database import SessionLocal

logger = logging.getLogger(__name__)
BOUNDARY_PATH = Path(__file__).resolve().parents[3] / "data" / "ethiopia-admin1.geojson"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REFRESH_INTERVAL_SECONDS = 15 * 60
WEATHER_INDICATORS = {
    "rainfall": "mm/7d",
    "temperature": "C",
    "humidity": "%",
    "wind_speed": "km/h",
}


def load_ethiopia_boundaries():
    with BOUNDARY_PATH.open(encoding="utf-8") as boundary_file:
        return json.load(boundary_file)


def seed_ethiopia_regions():
    boundaries = load_ethiopia_boundaries()
    db = SessionLocal()
    try:
        for feature in boundaries["features"]:
            name = feature["properties"]["shapeName"]
            point = shape(feature["geometry"]).representative_point()
            region = db.query(models.Region).filter(models.Region.name == name).first()
            if region is None:
                region = models.Region(name=name)
                db.add(region)
            region.country = "Ethiopia"
            region.latitude = point.y
            region.longitude = point.x
        db.commit()
        return len(boundaries["features"])
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _upsert_indicator(db, region_id, indicator_type, value, unit, observed_at):
    latest = (
        db.query(models.Indicator)
        .filter(
            models.Indicator.region_id == region_id,
            models.Indicator.type == indicator_type,
        )
        .order_by(models.Indicator.timestamp.desc())
        .first()
    )
    if latest is not None and latest.timestamp == observed_at:
        latest.value = value
        latest.unit = unit
        return

    db.add(models.Indicator(
        region_id=region_id,
        type=indicator_type,
        value=value,
        unit=unit,
        timestamp=observed_at,
    ))


def refresh_ethiopia_weather():
    db = SessionLocal()
    try:
        regions = (
            db.query(models.Region)
            .filter(models.Region.country == "Ethiopia")
            .order_by(models.Region.name)
            .all()
        )
        if not regions:
            return {"regions": 0, "observations": 0, "observed_at": None}

        response = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": ",".join(str(region.latitude) for region in regions),
                "longitude": ",".join(str(region.longitude) for region in regions),
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
                "daily": "precipitation_sum",
                "past_days": 7,
                "forecast_days": 1,
                "timezone": "UTC",
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        locations = payload if isinstance(payload, list) else [payload]
        if len(locations) != len(regions):
            raise ValueError("Open-Meteo returned an unexpected number of locations")

        observations_saved = 0
        latest_timestamp = None
        for region, location in zip(regions, locations):
            current = location.get("current") or {}
            current_time = current.get("time")
            if not current_time:
                continue

            observed_at = datetime.fromisoformat(current_time)
            latest_timestamp = max(latest_timestamp, observed_at) if latest_timestamp else observed_at
            daily = location.get("daily") or {}
            daily_dates = daily.get("time") or []
            daily_rainfall = daily.get("precipitation_sum") or []
            completed_rainfall = [
                value
                for day, value in zip(daily_dates, daily_rainfall)
                if day < current_time[:10] and value is not None
            ][-7:]
            rainfall_7d = sum(completed_rainfall) if completed_rainfall else None

            values = {
                "rainfall": rainfall_7d,
                "temperature": current.get("temperature_2m"),
                "humidity": current.get("relative_humidity_2m"),
                "wind_speed": current.get("wind_speed_10m"),
            }
            for indicator_type, value in values.items():
                if value is None:
                    continue
                _upsert_indicator(
                    db,
                    region.id,
                    indicator_type,
                    float(value),
                    WEATHER_INDICATORS[indicator_type],
                    observed_at,
                )
                observations_saved += 1

        db.commit()
        return {
            "regions": len(regions),
            "observations": observations_saved,
            "observed_at": latest_timestamp.isoformat() if latest_timestamp else None,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _monitoring_loop():
    while True:
        try:
            result = refresh_ethiopia_weather()
            logger.info("Ethiopia weather refresh complete: %s", result)
        except Exception:
            logger.exception("Ethiopia weather refresh failed")
        Event().wait(REFRESH_INTERVAL_SECONDS)


def start_ethiopia_monitoring():
    thread = Thread(target=_monitoring_loop, name="ethiopia-weather-refresh", daemon=True)
    thread.start()