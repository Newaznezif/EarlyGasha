import time
import ingestion
import transform
import load
import logging
import sys
import os

# Add project root to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database import SessionLocal
from backend import models, ml_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ORCHESTRATOR")

def run_full_pipeline():
    logger.info("--- STARTING EARLYGASHA INGESTION CYCLE ---")
    
    # Step 1: Ingest
    ingestion.ingest_all_regions()
    
    # Step 2: Transform
    transform.run_transformation_pipeline()
    
    # Step 3: Load to Database
    logger.info("Loading data to database...")
    load.load_to_db()
    
    # Step 4: Trigger Risk Calculations
    logger.info("Recalculating risk scores...")
    db = SessionLocal()
    try:
        regions = db.query(models.Region).all()
        for region in regions:
            ml_engine.process_risk_for_region(db, region.id)
            logger.info(f"Updated risk score for {region.name}")
        db.commit()
    except Exception as e:
        logger.error(f"Error updating risk scores: {e}")
    finally:
        db.close()
    
    logger.info("--- CYCLE COMPLETE ---")

if __name__ == "__main__":
    # Light scheduler: Run once every 24 hours (for demo just run once)
    run_full_pipeline()
    
    # In a real environment, we would use APScheduler here:
    # from apscheduler.schedulers.blocking import BlockingScheduler
    # sched = BlockingScheduler()
    # sched.add_job(run_full_pipeline, 'interval', hours=12)
    # sched.start()

