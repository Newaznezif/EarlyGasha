from sqlalchemy.orm import Session
from .risk_engine_service import RiskEngineService

class ChatbotService:
    def __init__(self, db: Session):
        self.db = db
        self.risk_service = RiskEngineService(db)

    def process_message(self, message: str) -> str:
        """
        Parses user intent and generates a tactical response based on live intelligence.
        """
        message = message.lower()

        # 1. Check for specific region queries
        overview = self.risk_service.get_overview()
        
        target_region = None
        for region in overview:
            if region["region"].lower() in message:
                target_region = region
                break
        
        if target_region:
            intel = self.risk_service.get_region_intelligence(target_region["region"])
            if intel:
                observations = target_region.get("observations") or {}
                observation_summary = []
                if observations.get("temperature_c") is not None:
                    observation_summary.append(f"temperature {observations['temperature_c']:.1f} C")
                if observations.get("rainfall_7d_mm") is not None:
                    observation_summary.append(f"7-day rainfall {observations['rainfall_7d_mm']:.1f} mm")
                observed_at = target_region.get("observed_at")
                latest_reading = (
                    f" Latest Open-Meteo reading: {', '.join(observation_summary)} at {observed_at}."
                    if observation_summary and observed_at
                    else " No live weather observation is available yet."
                )
                return (
                    f"DATA ACQUIRED: {intel['region'].upper()} risk level is {intel['risk_level']}. "
                    f"Current Score: {intel['risk_score'] * 100:.1f}%. "
                    f"Intelligence Summary: {intel['explanation']} "
                    f"Trend indicates {intel['trend']} activity.{latest_reading} "
                    "This is weather-based screening, not an official warning."
                )

        # 2. Check for global/summary queries
        if any(word in message for word in ["overview", "summary", "how is", "status", "risk"]):
            critical_zones = [r for r in overview if r['risk_level'] == 'CRITICAL']
            live_regions = sum(1 for region in overview if region.get("observed_at"))
            if critical_zones:
                zone_list = ", ".join([z['region'] for z in critical_zones])
                return (
                    f"Weather-based screening flags {len(critical_zones)} Ethiopian regions as CRITICAL: {zone_list}. "
                    f"Live Open-Meteo observations are available for {live_regions} of {len(overview)} monitored regions. "
                    "This screening is not an official warning."
                )
            return (
                f"Monitoring {len(overview)} Ethiopian administrative regions; live Open-Meteo observations are available "
                f"for {live_regions}. No region currently meets the model's critical weather-screening threshold. "
                "This is not an official warning."
            )

        # 3. Handle help/capabilities
        if "help" in message or "what can you do" in message:
            return (
                "I am Gasha-AI, a local rules-based assistant for Ethiopia weather screening. I can: \n"
                "1. Provide current screening scores for Ethiopian regions (e.g. 'Status of Afar')\n"
                "2. Summarize current monitored regions and observation times\n"
                "3. Report Open-Meteo temperature and rainfall readings.\n"
                "I do not provide official health, conflict, or emergency alerts.\n"
                "How can I assist your operation?"
            )

        # 4. Default persona
        return "Ask for the weather screening status of an Ethiopian region, or request an overview of current monitoring."
