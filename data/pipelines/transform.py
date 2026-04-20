import logging
from datetime import datetime

logger = logging.getLogger("earlygasha.transform")

def create_base_payload(region_name: str) -> dict:
    """Creates the incredibly strict JSON template dictated by Phase 2 requirements."""
    return {
        "region": region_name,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
        "climate": {
            "rainfall": None,
            "temperature": None,
            "humidity": None
        },
        "food": {
            "inflation_rate": None,
            "food_price_index": None
        },
        "health": {
            "outbreak_events": []
        },
        "conflict": {
            "incident_count": None,
            "displacement_events": None
        }
    }

def normalize_nasa_climate(raw_data: dict, payload: dict) -> dict:
    """Extracts required climate metrics from NASA POWER JSON."""
    try:
        # Example NASA POWER structure assumes properties.parameter...
        if not raw_data or "properties" not in raw_data:
            return payload
            
        params = raw_data["properties"]["parameter"]
        
        # Take the most recent data point available
        payload["climate"]["rainfall"] = list(params.get("PRECTOTCORR", {}).values())[-1] if "PRECTOTCORR" in params else None
        payload["climate"]["temperature"] = list(params.get("T2M", {}).values())[-1] if "T2M" in params else None
        payload["climate"]["humidity"] = list(params.get("RH2M", {}).values())[-1] if "RH2M" in params else None
        
    except Exception as e:
        logger.warning(f"⚠️ NASA Climate Normalization Failed: {e}")
        
    return payload

def normalize_openmeteo_climate(raw_data: dict, payload: dict) -> dict:
    """Extracts recent climate metrics from OpenMeteo JSON as a secondary/fallback."""
    try:
        if not raw_data or "daily" not in raw_data:
            return payload
            
        daily = raw_data["daily"]
        
        # Assign if empty
        if payload["climate"]["rainfall"] is None and "precipitation_sum" in daily:
            payload["climate"]["rainfall"] = daily["precipitation_sum"][-1]
            
        if payload["climate"]["temperature"] is None and "temperature_2m_max" in daily:
            payload["climate"]["temperature"] = daily["temperature_2m_max"][-1]
            
    except Exception as e:
        logger.warning(f"⚠️ OpenMeteo Normalization Failed: {e}")
        
    return payload

def normalize_worldbank_food(raw_data: dict, payload: dict) -> dict:
    """Extracts inflation from WorldBank JSON.
       Usually returns a list where [1] contains the actual data records.
    """
    try:
        if not raw_data or len(raw_data) < 2:
            return payload
            
        records = raw_data[1]
        if records and isinstance(records, list):
            # Find the most recent non-null value
            for record in records:
                if record.get("value") is not None:
                    payload["food"]["inflation_rate"] = record["value"]
                    break
    except Exception as e:
        logger.warning(f"⚠️ WorldBank Food Normalization Failed: {e}")
        
    return payload

# ACLED and WHO require more complex JSON parsing depending on their specific API responses.
# The principle stands: Extract exactly what is needed, otherwise leave as None/empty.

from .normalize import clean_payload

def unify_region_data(region_name: str, raw_datasets: dict) -> dict:
    """
    Takes all raw JSON responses for a specific region and carefully maps them
    into the strict unifying payload. Missing data remains None.
    """
    payload = create_base_payload(region_name)
    
    # 1. Climate
    if raw_datasets.get("nasa_power"):
        payload = normalize_nasa_climate(raw_datasets["nasa_power"], payload)
    elif raw_datasets.get("open_meteo"):
        payload = normalize_openmeteo_climate(raw_datasets["open_meteo"], payload)
        
    # 2. Food
    if raw_datasets.get("world_bank"):
        payload = normalize_worldbank_food(raw_datasets["world_bank"], payload)
        
    # 3. Conflict (ACLED) - Assuming acled returns a 'data' array
    if raw_datasets.get("acled") and "data" in raw_datasets["acled"]:
        payload["conflict"]["incident_count"] = len(raw_datasets["acled"]["data"])
        
    # 4. Health
    # If we scraped WHO, we would attach it here
    
    # Apply strict ML-normalization rules before exposing to Risk Engine
    return clean_payload(payload)

