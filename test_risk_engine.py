from backend.database import SessionLocal
from backend.app.services.risk_engine_service import RiskEngineService

def test_engine():
    db = SessionLocal()
    engine = RiskEngineService(db)
    
    test_regions = ["Ethiopia", "Kenya", "Burundi"]
    
    print("=======================================")
    print("  RISK ENGINE EMPIRICAL VALIDATION     ")
    print("=======================================\n")
    
    for region in test_regions:
        print(f"--- Processing: {region} ---")
        result = engine.get_region_intelligence(region)
        if result:
            print(f"Risk Score: {result['risk_score']}")
            print(f"Risk Level: {result['risk_level']}")
            print(f"Drivers:    {result['drivers']}")
            print(f"Format matching requested: {result['risk_score'] > 0}\n")
        else:
            print(f"Failed to find {region} in DB.\n")
            
    db.close()

if __name__ == "__main__":
    test_engine()
