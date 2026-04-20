import os
import glob
import json
import logging
from datetime import datetime

# Adjust sys path so we can import backend models
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal, engine
from backend import models

logger = logging.getLogger("earlygasha.db_ingest")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

PROCESSED_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_store", "processed"))

def ingest_to_sqlite():
    logger.info("📡 Connecting to Risk Engine SQLite Database...")
    db = SessionLocal()
    models.Base.metadata.create_all(bind=engine)
    
    # Grab the LATEST processed JSON for each region
    files = sorted(glob.glob(os.path.join(PROCESSED_DATA_DIR, "*.json")), key=os.path.getmtime, reverse=True)
    latest_files = {}
    for f in files:
        basename = os.path.basename(f)
        region_parts = basename.split("_2026")
        if len(region_parts) == 2:
            region_name = region_parts[0].replace("_", " ")
            if region_name not in latest_files:
                latest_files[region_name] = f
                
    if not latest_files:
        logger.error("❌ No processed ML-Safe JSON found. Run data/pipelines/ingestion.py first.")
        db.close()
        return

    records_inserted = 0
    for region, filepath in latest_files.items():
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load JSON for {filepath}: {e}")
            continue
            
        # Get Database Region Entity
        db_region = db.query(models.Region).filter(models.Region.name == region).first()
        if not db_region:
            logger.warning(f"Region map mismatch: {region} not found in DB. Skipping.")
            continue
            
        timestamp_parsed = datetime.strptime(data.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d")), "%Y-%m-%d")

        # 1. CLIMATE
        rainfall = data.get("climate", {}).get("rainfall")
        if rainfall is not None:
             db.add(models.Indicator(region_id=db_region.id, type="rainfall", value=rainfall, unit="mm", timestamp=timestamp_parsed))
             records_inserted += 1
             
        temperature = data.get("climate", {}).get("temperature")
        if temperature is not None:
             db.add(models.Indicator(region_id=db_region.id, type="temperature", value=temperature, unit="C", timestamp=timestamp_parsed))
             records_inserted += 1

        # 2. FOOD
        inflation = data.get("food", {}).get("inflation_rate")
        if inflation is not None:
             db.add(models.Indicator(region_id=db_region.id, type="food_price", value=inflation, unit="percent_inflation", timestamp=timestamp_parsed))
             records_inserted += 1
             
        # 3. CONFLICT
        conflict = data.get("conflict", {}).get("incident_count")
        if conflict is not None:
             db.add(models.Indicator(region_id=db_region.id, type="conflict", value=conflict, unit="incident_count", timestamp=timestamp_parsed))
             records_inserted += 1
             
    try:
        db.commit()
        logger.info(f"✅ SQLite Ingestion Complete. {records_inserted} empirical indicators securely mapped into ML consumption layer.")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Database commit failed: {e}")
        
    db.close()

if __name__ == "__main__":
    ingest_to_sqlite()
