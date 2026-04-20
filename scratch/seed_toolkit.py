import json
from backend.database import SessionLocal
from backend import models

def seed_toolkit():
    db = SessionLocal()
    try:
        # 1. Regions
        regions = db.query(models.Region).all()
        
        # 2. Resilience Indicators
        for r in regions:
            # Check if exists
            exists = db.query(models.ResilienceIndicator).filter(models.ResilienceIndicator.region_id == r.id).first()
            if not exists:
                indicators = [
                    {"cat": "healthcare", "metric": "Hospital Bed Capacity", "val": 0.45},
                    {"cat": "healthcare", "metric": "Emergency Response Speed", "val": 0.62},
                    {"cat": "food_reserves", "metric": "Grain Silo Levels", "val": 0.38},
                    {"cat": "food_reserves", "metric": "Supply Chain Stability", "val": 0.55},
                    {"cat": "infrastructure", "metric": "Evacuation Route Integrity", "val": 0.78},
                    {"cat": "infrastructure", "metric": "Water System Redundancy", "val": 0.42},
                ]
                for ind in indicators:
                    db.add(models.ResilienceIndicator(
                        region_id=r.id,
                        category=ind["cat"],
                        metric_name=ind["metric"],
                        value=ind["val"]
                    ))
        
        # 3. Training Resources
        tr_exists = db.query(models.TrainingResource).count()
        if tr_exists == 0:
            resources = [
                {"title": "Tactical First Aid for Operators", "type": "video", "url": "#", "cat": "first_aid"},
                {"title": "Sector Evacuation Planning Protocol", "type": "guide", "url": "#", "cat": "evacuation"},
                {"title": "Water Purification in Conflict Zones", "type": "checklist", "url": "#", "cat": "water_purification"},
                {"title": "SITREP Communication Essentials", "type": "video", "url": "#", "cat": "first_aid"},
            ]
            for res in resources:
                db.add(models.TrainingResource(
                    title=res["title"],
                    resource_type=res["type"],
                    content_url=res["url"],
                    category=res["cat"]
                ))
                
        # 4. Simulation Scenarios
        sim_exists = db.query(models.SimulationScenario).count()
        if sim_exists == 0:
            scenarios = [
                {"title": "Operation Monsoon: Flash Flood Response", "desc": "Simulate a severe flash flood in the East Sector.", "hazard": "Flood", "diff": "intermediate", "params": json.dumps({"intensity": 0.8, "affected_pop": 50000})},
                {"title": "Project Drylands: Famine Mitigation", "desc": "Manage resources during a persistent 2-year drought cycle.", "hazard": "Drought", "diff": "advanced", "params": json.dumps({"duration": 24, "reserve_burn_rate": 0.05})},
                {"title": "Contagion Containment Alpha", "desc": "Protocol for rapid health outbreak detection and isolation.", "hazard": "Disease", "diff": "basic", "params": json.dumps({"spread_rate": 1.2})},
            ]
            for sc in scenarios:
                db.add(models.SimulationScenario(
                    title=sc["title"],
                    description=sc["desc"],
                    hazard_type=sc["hazard"],
                    difficulty=sc["diff"],
                    ai_parameters=sc["params"]
                ))
        
        db.commit()
        print("Toolkit Seeded Successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seed Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_toolkit()
