import sys
import os
import json
from sqlalchemy.orm import Session

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal
from backend import models, ml_engine

def inspect_region_signal(region_nickname):
    db = SessionLocal()
    try:
        region = db.query(models.Region).filter(models.Region.name.ilike(f"%{region_nickname}%")).first()
        if not region:
            print(f"Region {region_nickname} not found.")
            return

        # Use the integrated service that now handles both engineering and forecasting
        result = ml_engine.process_risk_for_region(db, region.id)
        
        print(json.dumps(result, indent=2))
        
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_region_signal(sys.argv[1])
    else:
        print("Usage: python scripts/inspect_signal.py <region_name>")
        inspect_region_signal("DRC")
