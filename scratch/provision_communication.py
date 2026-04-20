from backend.database import engine, Base
from backend.models import CommunicationRoom, ChatMessage, IncidentUpdate, CrisisAlert, Region, User
from sqlalchemy.orm import Session

def provision_communication():
    print("Initializing Crisis Communication Hub Infrastructure...")
    Base.metadata.create_all(bind=engine)
    
    with Session(engine) as db:
        # Seed default rooms
        if not db.query(CommunicationRoom).first():
            rooms = [
                CommunicationRoom(name="Global Coordination Hub", description="All-stakesholders crisis coordination area.", is_private=0),
                CommunicationRoom(name="Admin & Partners", description="High-level strategic planning and resource negotiation.", is_private=1),
                CommunicationRoom(name="Field Ops & Logistics", description="Tactical ground coordination for food and med-kits.", is_private=0)
            ]
            db.add_all(rooms)
            
        # Seed initial incident updates if none
        if not db.query(IncidentUpdate).first():
            region = db.query(Region).first()
            user = db.query(User).filter(User.role == 'field_officer').first()
            if region and user:
                update = IncidentUpdate(
                    user_id=user.id,
                    region_id=region.id,
                    title="Localized Flood Anomaly",
                    content="Immediate flash flood in sector B-4. Access bridges stabilized but risky.",
                    severity="URGENT",
                    geotag=f"{region.latitude},{region.longitude}"
                )
                db.add(update)
                
        db.commit()
    print("Communication Hub initialized and default rooms provisioned.")

if __name__ == "__main__":
    provision_communication()
