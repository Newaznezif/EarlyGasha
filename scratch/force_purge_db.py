import os
import time

db_path = "earlygasha.db"

if os.path.exists(db_path):
    print(f"TACTICAL DATA PURGE: Found {db_path}...")
    try:
        os.remove(db_path)
        print("SUCCESS: Intelligence matrix cleared. System ready for fresh synchronization.")
    except Exception as e:
        print(f"FAILURE: Database is locked by another process (likely Uvicorn). Please stop the backend first.")
        print(f"Error: {e}")
else:
    print("ANALYSIS: No database file detected in the root directory. It may have already been moved or deleted.")
