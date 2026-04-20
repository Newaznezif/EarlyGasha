import json
import os
from datetime import datetime
import logging

logger = logging.getLogger("earlygasha.raw_store")

RAW_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data_store", "raw"))

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def save_raw_data(source: str, region: str, data: dict, timestamp: str = None):
    """
    Saves raw API responses to the local file system.
    """
    try:
        ensure_dir(RAW_DATA_DIR)
        
        if not timestamp:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            
        filename = f"{source}_{region.replace(' ', '_')}_{timestamp}.json"
        filepath = os.path.join(RAW_DATA_DIR, filename)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
            
        logger.info(f"💾 Saved raw data from {source} for {region} to {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"❌ Failed to save raw data for {source} - {region}: {e}")
        return None
