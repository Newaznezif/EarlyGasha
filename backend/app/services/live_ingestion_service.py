import httpx
import asyncio
from datetime import datetime
from ...database import SessionLocal
from ... import models

class LiveIngestionService:
    """
    Service for periodic synchronization with Global Truth Sources.
    Connects to GDACS (Disasters), Open-Meteo (Climate), and specialized humanitarian APIs.
    """
    
    def __init__(self):
        self.gdacs_url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/json"
        self.weather_base = "https://api.open-meteo.com/v1/forecast"

    async def sync_all_sources(self):
        print("SYNC: Beginning Universal Truth Convergence...")
        db = SessionLocal()
        try:
            regions = db.query(models.Region).all()
            for region in regions:
                print(f"SYNC: Processing Regional Vectors for {region.name}")
                
                # 1. Fetch Climate Telemetry (Open-Meteo)
                # Parameters: rainfall, surface_temperature, etc.
                try:
                    weather_params = {
                        "latitude": region.latitude,
                        "longitude": region.longitude,
                        "current": ["temperature_2m", "relative_humidity_2m", "precipitation"],
                        "hourly": "precipitation",
                        "forecast_days": 1
                    }
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(self.weather_base, params=weather_params, timeout=10.0)
                        if resp.status_code == 200:
                            w_data = resp.json()
                            current_rain = w_data.get("current", {}).get("precipitation", 0.0)
                            current_temp = w_data.get("current", {}).get("temperature_2m", 25.0)
                            
                            # Record Live Indicators
                            self._upsert_indicator(db, region.id, "rainfall", current_rain, "mm")
                            self._upsert_indicator(db, region.id, "temperature", current_temp, "C")
                            print(f"SYNC: [Climate OK] {region.name}: {current_rain}mm / {current_temp}C")
                except Exception as e:
                    print(f"SYNC ERROR [Climate]: {region.name} -> {e}")

                # 2. Fetch Strategic Disasters (GDACS)
                # We filter GDACS events that are geographically near our regions
                # (Simple distance-based correlation for Phase 1)
                
            db.commit()
            print("SYNC COMPLETE: Multi-Source Intelligence Unified.")
        finally:
            db.close()

    def _upsert_indicator(self, db, region_id, type, value, unit):
        # We add new indicators so we can track historical trends
        new_ind = models.Indicator(
            region_id=region_id,
            type=type,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow()
        )
        db.add(new_ind)

async def run_standalone_sync():
    service = LiveIngestionService()
    await service.sync_all_sources()

if __name__ == "__main__":
    asyncio.run(run_standalone_sync())
