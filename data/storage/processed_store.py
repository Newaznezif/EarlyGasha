import json
import os
from datetime import datetime
import logging

logger = logging.getLogger("earlygasha.processed_store")

PROCESSED_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data_store", "processed"))

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def save_processed_data(region: str, structured_data: dict, timestamp: str = None):
    """
    Saves the cleaned, normalized JSON structure containing only real API data.
    """
    try:
        ensure_dir(PROCESSED_DATA_DIR)
        
        if not timestamp:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            
        filename = f"{region.replace(' ', '_')}_{timestamp}.json"
        filepath = os.path.join(PROCESSED_DATA_DIR, filename)
        
        with open(filepath, 'w') as f:
            json.dump(structured_data, f, indent=2)
            
        logger.info(f"📊 Saved processed, unified data for {region} to {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"❌ Failed to save processed data for {region}: {e}")
        return None
