from datetime import datetime
from typing import List, Dict

class AlertService:
    """
    Autonomous Alerting Engine for EarlyGasha.
    Scans risk intelligence for "Trigger Conditions" and generates active alerts.
    """
    
    CRITICAL_THRESHOLD = 0.8
    HIGH_THRESHOLD = 0.6
    ACCELERATION_THRESHOLD = 0.15

    @staticmethod
    def scan_for_alerts(overview_data: List[Dict]) -> List[Dict]:
        """
        Scans all regions for critical triggers.
        Returns a list of Active Alerts.
        """
        active_alerts = []
        
        for region in overview_data:
            region_name = region['region']
            score = region['risk_score']
            trend = region['trend']
            
            # Condition 1: Absolute Criticality
            if score >= AlertService.CRITICAL_THRESHOLD:
                active_alerts.append({
                    "id": f"ALERT_{region_name}_{datetime.now().strftime('%H%M')}",
                    "region": region_name,
                    "type": "CRITICAL_RISK",
                    "severity": "CRITICAL",
                    "message": f"Region {region_name} has crossed the Critical threshold ({score:.2f}). Emergency deployment recommended.",
                    "timestamp": datetime.now().isoformat()
                })
                
            # Condition 2: Rapid Escalation
            elif trend == "INCREASING" and score >= AlertService.HIGH_THRESHOLD:
                active_alerts.append({
                    "id": f"WARN_{region_name}_{datetime.now().strftime('%H%M')}",
                    "region": region_name,
                    "type": "RAPID_ESCALATION",
                    "severity": "HIGH",
                    "message": f"Region {region_name} is showing a rapid upward trend ({score:.2f}). Pre-emptive monitoring advised.",
                    "timestamp": datetime.now().isoformat()
                })
        
        return active_alerts
