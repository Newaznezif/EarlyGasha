from .database import SessionLocal
from . import models
from .main import calculate_region_risk

def populate_risks():
    db = SessionLocal()
    regions = db.query(models.Region).all()
    for region in regions:
        print(f"Calculating risk for {region.name}...")
        try:
            calculate_region_risk(region.id, db)
        except Exception as e:
            print(f"Error calculating risk for {region.name}: {e}")
    db.close()

if __name__ == "__main__":
    populate_risks()
