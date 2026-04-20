import json
import os
import sys
import logging
from datetime import datetime

# Add the project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.database import SessionLocal
from backend import models

logger = logging.getLogger(__name__)

def load_to_db():
    processed_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "processed", "region_timeseries.json")
    
    if not os.path.exists(processed_path):
        logger.error("Processed data file not found. Run transformation first.")
        return
        
    with open(processed_path, 'r') as f:
        data = json.load(f)
        
    db = SessionLocal()
    try:
        for entry in data:
            region_name = entry.get("region")
            timestamp_str = entry.get("timestamp")
            timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S") if timestamp_str else datetime.utcnow()
            
            # Find region or create if it doesn't exist (though usually they should exist)
            region = db.query(models.Region).filter(models.Region.name == region_name).first()
            if not region:
                logger.warning(f"Region {region_name} not found in database. Skipping indicators.")
                continue
            
            indicators = entry.get("indicators", {})
            for key, value in indicators.items():
                indicator = models.Indicator(
                    region_id=region.id,
                    type=key,
                    value=float(value),
                    unit="normalized_idx", # Or custom based on key
                    timestamp=timestamp
                )
                db.add(indicator)
        
        db.commit()
        logger.info(f"Successfully loaded indicators from {len(data)} regions into database.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error loading data to DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    load_to_db()
