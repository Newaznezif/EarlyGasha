from sqlalchemy.orm import Session
from .risk_engine_service import RiskEngineService
import re

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
        regions = [r['region'].lower() for r in overview]
        
        target_region = None
        for r in regions:
            if r in message:
                target_region = r
                break
        
        if target_region:
            intel = self.risk_service.get_region_intelligence(target_region)
            if intel:
                return (
                    f"DATA ACQUIRED: {intel['region'].upper()} risk level is {intel['risk_level']}. "
                    f"Current Score: {intel['risk_score'] * 100:.1f}%. "
                    f"Intelligence Summary: {intel['explanation']} "
                    f"Trend indicates {intel['trend']} activity."
                )

        # 2. Check for global/summary queries
        if any(word in message for word in ["overview", "summary", "how is", "status", "risk"]):
            critical_zones = [r for r in overview if r['risk_level'] == 'CRITICAL']
            if critical_zones:
                zone_list = ", ".join([z['region'] for z in critical_zones])
                return f"SYSTEM ALERT: There are {len(critical_zones)} CRITICAL risk zones active: {zone_list}. Recommend immediate tactical review."
            return "Current humanitarian landscape is STABLE. No critical anomalies detected across the 14 monitored regions."

        # 3. Handle help/capabilities
        if "help" in message or "what can you do" in message:
            return (
                "I am Gasha-AI, your tactical humanitarian analyst. I can: \n"
                "1. Provide live risk scores for specific regions (e.g. 'Status of Sudan')\n"
                "2. Summarize global threat levels\n"
                "3. Analyze anomaly trends.\n"
                "How can I assist your operation?"
            )

        # 4. Default persona
        return "Intelligence link established. Please specify a regional vector or query global status for a tactical breakdown."
