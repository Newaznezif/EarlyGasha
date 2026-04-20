import os
from sqlalchemy.orm import Session
from . import models
import logging

logger = logging.getLogger(__name__)

def get_region_context(db: Session, region_name: str):
    region = db.query(models.Region).filter(models.Region.name.ilike(f"%{region_name}%")).first()
    if not region:
        return None
    
    latest_score = db.query(models.RiskScore).filter(models.RiskScore.region_id == region.id).order_by(models.RiskScore.timestamp.desc()).first()
    
    indicators = db.query(models.Indicator).filter(models.Indicator.region_id == region.id).order_by(models.Indicator.timestamp.desc()).limit(10).all()
    
    indicator_summary = "\n".join([f"- {i.type}: {i.value} {i.unit} ({i.timestamp})" for i in indicators])
    
    context = f"""
    Region: {region.name}, {region.country}
    Current Risk Level: {latest_score.level if latest_score else 'Unknown'}
    Current Risk Score: {latest_score.overall_score if latest_score else 'N/A'}/100
    Explanation: {latest_score.explanation if latest_score else 'No explanation available'}
    
    Recent Indicators:
    {indicator_summary}
    """
    return context

def generate_response(db: Session, query: str):
    # Basic intent extraction (very simple for demo)
    # In a real app, use an LLM for NER/Intent
    regions = db.query(models.Region).all()
    target_region = None
    for r in regions:
        if r.name.lower() in query.lower():
            target_region = r
            break
            
    if not target_region:
        # Generic response or pick most critical?
        critical_regions = db.query(models.RiskScore).filter(models.RiskScore.level == "CRITICAL").limit(3).all()
        region_list = ", ".join([r.region.name for r in critical_regions])
        return f"I couldn't find a specific region in your query. Currently, the most critical regions are: {region_list if region_list else 'none'}. Which region would you like to know more about?"

    context = get_region_context(db, target_region.name)
    
    # Mock LLM Response for now (or integrate OpenAI if KEY is set)
    # Since I'm an AI assistant, I can write the logic that WOULD call an LLM.
    
    response = f"Analysis for {target_region.name}:\n\n"
    response += f"Based on our latest data, {target_region.name} is currently at a {target_region.risk_scores[0].level if target_region.risk_scores else 'NORMAL'} risk level. "
    response += "The primary drivers are recent climate anomalies and food price volatility. "
    response += "We recommend monitoring the situation closely and preparing for potential aid intervention if the food price index continues to rise."
    
    return response
