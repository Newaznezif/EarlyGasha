from backend.database import SessionLocal
from backend import models
from backend.auth.models import User
import datetime

def seed_activity():
    db = SessionLocal()
    
    # 1. Seed some messages
    admin = db.query(User).filter(User.role == 'system_admin').first()
    room = db.query(models.CommunicationRoom).first()
    
    if admin and room:
        messages = [
            "Welcome to the EarlyGasha Intelligence Uplink.",
            "Initial tactical scanning complete. Logistics sectors 4 and 7 showing variance.",
            "All operators: ensure SITREPs are transmitted with high-resolution geotags."
        ]
        for msg in messages:
            new_msg = models.ChatMessage(
                room_id=room.id,
                sender_id=admin.id,
                content=msg,
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(minutes=len(messages)*10)
            )
            db.add(new_msg)
    
    # 2. Seed some incidents
    regions = db.query(models.Region).all()
    if admin and regions:
        incidents = [
            {"region": regions[0], "title": "Local Supply Corridor Delay", "content": "Minor logistics bottleneck detected in sector alpha.", "severity": "INFO"},
            {"region": regions[1], "title": "Hydrological Variance Alert", "content": "Surface water levels in Tigray showing anomalous recession rates.", "severity": "URGENT"}
        ]
        for inc in incidents:
            new_inc = models.IncidentUpdate(
                user_id=admin.id,
                region_id=inc["region"].id,
                title=inc["title"],
                content=inc["content"],
                severity=inc["severity"],
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
            )
            db.add(new_inc)
            
    # 3. Seed some Resilience Indicators (for the Toolkit)
    if regions:
        for r in regions:
            indicators = [
                {"cat": "healthcare", "metric": "Hospital Bed Availability", "val": 0.65},
                {"cat": "food_reserves", "metric": "Grain Silo Capacity", "val": 0.42},
                {"cat": "infrastructure", "metric": "Road Network Stability", "val": 0.88}
            ]
            for ind in indicators:
                new_ind = models.ResilienceIndicator(
                    region_id=r.id,
                    category=ind["cat"],
                    metric_name=ind["metric"],
                    value=ind["val"]
                )
                db.add(new_ind)

    db.commit()
    db.close()
    print("Activity seeding complete.")

if __name__ == "__main__":
    seed_activity()
