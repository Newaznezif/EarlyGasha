import os
import time
import requests
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Initialize logging for the pipeline
log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "logs"))
os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(
    filename=os.path.join(log_dir, "data_pipeline.log"),
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("earlygasha.ingestion")

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from data.storage.raw_store import save_raw_data
from data.storage.processed_store import save_processed_data
from data.pipelines.transform import unify_region_data

load_dotenv()

ACLED_API_KEY = os.getenv("ACLED_API_KEY")
ACLED_EMAIL = os.getenv("ACLED_EMAIL")

REGIONS = [
    {"name": "Burundi", "lat": -3.37, "lon": 29.91, "iso3": "BDI"},
    {"name": "Chad", "lat": 15.45, "lon": 18.73, "iso3": "TCD"},
    {"name": "Central African Republic", "lat": 6.61, "lon": 20.93, "iso3": "CAF"},
    {"name": "DR Congo", "lat": -4.03, "lon": 21.75, "iso3": "COD"},
    {"name": "Djibouti", "lat": 11.82, "lon": 42.59, "iso3": "DJI"},
    {"name": "Eritrea", "lat": 15.17, "lon": 39.78, "iso3": "ERI"},
    {"name": "Ethiopia", "lat": 9.14, "lon": 40.48, "iso3": "ETH"},
    {"name": "Kenya", "lat": -0.02, "lon": 37.90, "iso3": "KEN"},
    {"name": "Rwanda", "lat": -1.94, "lon": 29.87, "iso3": "RWA"},
    {"name": "Somalia", "lat": 5.15, "lon": 46.19, "iso3": "SOM"},
    {"name": "South Sudan", "lat": 6.87, "lon": 31.30, "iso3": "SSD"},
    {"name": "Sudan", "lat": 12.86, "lon": 30.21, "iso3": "SDN"},
    {"name": "Tanzania", "lat": -6.36, "lon": 34.88, "iso3": "TZA"},
    {"name": "Uganda", "lat": 1.37, "lon": 32.29, "iso3": "UGA"},
]

def fetch_nasa_power(lat, lon):
    start = (datetime.utcnow() - timedelta(days=7)).strftime("%Y%m%d")
    end = datetime.utcnow().strftime("%Y%m%d")
    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M,RH2M&community=RE&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
    try:
        res = requests.get(url, timeout=15)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        logger.error(f"NASA POWER API Failed for ({lat},{lon}): {e}")
        return None

def fetch_open_meteo(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum,temperature_2m_max&past_days=7&forecast_days=0&timezone=auto"
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        logger.error(f"Open-Meteo API Failed for ({lat},{lon}): {e}")
        return None

def fetch_world_bank(iso3):
    # Indicator FP.CPI.TOTL.ZG is Inflation, consumer prices (annual %)
    url = f"https://api.worldbank.org/v2/country/{iso3}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1&mrv=1"
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        logger.error(f"World Bank API Failed for {iso3}: {e}")
        return None

def fetch_acled(iso3):
    if not ACLED_API_KEY or not ACLED_EMAIL:
        logger.warning(f"ACLED skipped for {iso3} - Missing API Credentials")
        return None
        
    url = f"https://api.acleddata.com/acled/read?email={ACLED_EMAIL}&key={ACLED_API_KEY}&iso={iso3}&limit=50"
    try:
        res = requests.get(url, timeout=15)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        logger.error(f"ACLED API Failed for {iso3}: {e}")
        return None

def run_pipeline():
    logger.info("🚀 Initiating EarlyGasha REAL DATA Pipeline")
    
    for region in REGIONS:
        name = region["name"]
        lat = region["lat"]
        lon = region["lon"]
        iso3 = region["iso3"]
        
        logger.info(f"🌍 Processing Regional Intelligence for: {name}")
        raw_datasets = {}
        
        # 1. NASA
        nasa_data = fetch_nasa_power(lat, lon)
        if nasa_data:
            save_raw_data("nasa_power", name, nasa_data)
            raw_datasets["nasa_power"] = nasa_data
            
        # 2. Open Meteo (Secondary)
        om_data = fetch_open_meteo(lat, lon)
        if om_data:
            save_raw_data("open_meteo", name, om_data)
            raw_datasets["open_meteo"] = om_data
            
        # 3. World Bank
        wb_data = fetch_world_bank(iso3)
        if wb_data:
            save_raw_data("world_bank", name, wb_data)
            raw_datasets["world_bank"] = wb_data
            
        # 4. ACLED
        acled_data = fetch_acled(iso3)
        if acled_data:
            save_raw_data("acled", name, acled_data)
            raw_datasets["acled"] = acled_data
            
        # Transform & Normalize into the strict output schema
        processed_data = unify_region_data(name, raw_datasets)
        
        # Save Final Processed JSON
        save_processed_data(name, processed_data)
        time.sleep(1) # Protect against rate limiting
        
    logger.info("✅ Pipeline Execution Complete. No synthetic data generated.")

if __name__ == "__main__":
    run_pipeline()
