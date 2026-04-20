from backend.database import SessionLocal
from backend.models import IncidentUpdate
from backend.auth.models import User

db = SessionLocal()
updates = db.query(IncidentUpdate).all()
for u in updates:
    print(f"ID: {u.id}")
    print(f"User Obj Type: {type(u.user)}")
    try:
        sender = u.user.full_name or u.user.email.split('@')[0]
        print(f"Sender: {sender}")
    except Exception as e:
        print(f"ERROR: {e}")
db.close()
