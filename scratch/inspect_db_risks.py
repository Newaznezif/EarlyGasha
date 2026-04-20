from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.abspath('.'))

from backend.database import SQLALCHEMY_DATABASE_URL
from backend import models

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("--- REGIONS & LATEST RISK ---")
regions = db.query(models.Region).all()
for r in regions:
    latest_risk = db.query(models.RiskScore).filter(models.RiskScore.region_id == r.id).order_by(models.RiskScore.timestamp.desc()).first()
    if latest_risk:
        print(f"Region: {r.name}, Score: {latest_risk.overall_score}, Level: {latest_risk.level}")
    else:
        print(f"Region: {r.name}, Score: No Data")

db.close()
