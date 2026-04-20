from backend.database import engine, Base
from backend import models

print("Synchronizing Toolkit Architecture...")
Base.metadata.create_all(bind=engine)
print("Synchronization Complete: Resilience Infrastructure established.")
