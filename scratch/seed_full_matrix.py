from backend.database import SessionLocal
from backend import models
import datetime

def seed():
    db = SessionLocal()
    try:
        # Clear existing non-user data
        db.query(models.Indicator).delete()
        db.query(models.RiskScore).delete()
        db.query(models.Region).delete()
        db.commit()

        print("SEEDING: Synchronizing Tactical Intelligence Matrix...")

        # 1. Define Strategic Regions
        regions_data = [
            {"name": "Sudan", "country": "Sudan", "latitude": 15.5, "longitude": 32.5},
            {"name": "Tigray", "country": "Ethiopia", "latitude": 14.1, "longitude": 38.5},
            {"name": "Somalia", "country": "Somalia", "latitude": 2.0, "longitude": 45.3},
            {"name": "Kenya North", "country": "Kenya", "latitude": 3.5, "longitude": 37.5},
            {"name": "South Sudan", "country": "South Sudan", "latitude": 4.8, "longitude": 31.6},
            {"name": "Amhara", "country": "Ethiopia", "latitude": 11.6, "longitude": 37.3},
            {"name": "Oromia", "country": "Ethiopia", "latitude": 7.5, "longitude": 39.5},
        ]

        regions = []
        for rd in regions_data:
            r = models.Region(**rd)
            db.add(r)
            regions.append(r)
        db.commit()

        # 2. Inject Indicators & Generate Initial Scores
        for r in regions:
            # Rainfall (0-100)
            rain = 15.0 if r.name in ["Sudan", "Somalia", "Tigray"] else 65.0
            inf = 85.0 if r.name in ["Sudan", "South Sudan"] else 12.0
            conf = 9.0 if r.name in ["Sudan", "Tigray", "Somalia"] else 1.0
            
            indicators = [
                models.Indicator(region_id=r.id, type="rainfall", value=rain, unit="mm"),
                models.Indicator(region_id=r.id, type="food_price", value=inf, unit="%"),
                models.Indicator(region_id=r.id, type="conflict", value=conf, unit="scale"),
                models.Indicator(region_id=r.id, type="temperature", value=32.0, unit="C"),
                models.Indicator(region_id=r.id, type="health", value=0.1, unit="prob"),
            ]
            db.add_all(indicators)

            # Risk Scores
            score = 92.0 if conf > 5 else 45.0 if inf > 50 else 15.0
            level = "CRITICAL" if score > 80 else "HIGH" if score > 50 else "MEDIUM" if score > 20 else "LOW"
            
            rs = models.RiskScore(
                region_id=r.id,
                overall_score=score,
                level=level,
                explanation=f"High risk in {r.name} due to severe conflict anomalies and food price volatility.",
                forecast_window="0-7"
            )
            db.add(rs)

        db.commit()
        print("SEEDING SUCCESS: Tactical Matrix is now live with 7 Active Regions.")

    except Exception as e:
        print(f"SEEDING FAILURE: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
