from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from .database import Base
try:
    from .auth.models import User
except ImportError:
    # Fallback for complex circularity if needed, but should work here
    pass

class Region(Base):
    __tablename__ = "regions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    country = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    
    indicators = relationship("Indicator", back_populates="region")
    risk_scores = relationship("RiskScore", back_populates="region")

class Indicator(Base):
    __tablename__ = "indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    type = Column(String)  # rainfall, food_price, conflict, health
    value = Column(Float)
    unit = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    region = relationship("Region", back_populates="indicators")

class RiskScore(Base):
    __tablename__ = "risk_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    overall_score = Column(Float)  # 0 to 100
    level = Column(String)  # LOW, MEDIUM, HIGH, CRITICAL
    explanation = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    forecast_window = Column(String) # 0-7, 7-14, 14-30
    
    region = relationship("Region", back_populates="risk_scores")

class FieldReport(Base):
    __tablename__ = "field_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))
    report_type = Column(String)  # drought, flood, disease, conflict
    severity = Column(String, default="medium")
    description = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="pending") # pending, verified, rejected
    
    user = relationship("User")
    region = relationship("Region")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    user_email = Column(String)
    details = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Directive(Base):
    __tablename__ = "directives"
    id = Column(Integer, primary_key=True, index=True)
    issuer_id = Column(Integer, ForeignKey("users.id"))
    target_region_id = Column(Integer, ForeignKey("regions.id"))
    priority = Column(String)  # ROUTINE, URGENT, IMMEDIATE
    objective = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="active")  # active, completed, cancelled

    issuer = relationship("User")
    region = relationship("Region")

class ResilienceIndicator(Base):
    __tablename__ = "resilience_indicators"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    category = Column(String) # healthcare, food_reserves, infrastructure
    metric_name = Column(String)
    value = Column(Float) # 0 to 1
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    region = relationship("Region")

class TrainingResource(Base):
    __tablename__ = "training_resources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    resource_type = Column(String) # video, guide, checklist
    content_url = Column(String)
    category = Column(String) # first_aid, evacuation, water_purification
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    hazard_type = Column(String)
    difficulty = Column(String, default="intermediate") # basic, intermediate, advanced
    ai_parameters = Column(String) # JSON string for scenario logic
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PreparednessFeedback(Base):
    __tablename__ = "preparedness_feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))
    indicator_id = Column(Integer, ForeignKey("resilience_indicators.id"), nullable=True)
    feedback_text = Column(String)
    ground_truth_value = Column(Float, nullable=True) # Recommended value adjustment
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    region = relationship("Region")

class PreparednessReport(Base):
    __tablename__ = "preparedness_reports"
    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("users.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))
    summary = Column(String)
    metrics_snapshot = Column(String) # JSON snapshot of indicators at time of report
    file_path = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    operator = relationship("User")
    region = relationship("Region")

class CommunicationRoom(Base):
    __tablename__ = "communication_rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    is_private = Column(Integer, default=0) # 0: Multi-org, 1: Internal NGO/Gov
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("communication_rooms.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String) # For now stored as string, in real app would be encrypted
    translated_content = Column(String, nullable=True) # AI translation layer
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("CommunicationRoom")
    sender = relationship("User")

class IncidentUpdate(Base):
    __tablename__ = "incident_updates"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))
    title = Column(String)
    content = Column(String)
    media_url = Column(String, nullable=True)
    geotag = Column(String, nullable=True) # LAT,LON
    severity = Column(String) # CRITICAL, URGENT, INFO
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    region = relationship("Region")

class CrisisAlert(Base):
    __tablename__ = "crisis_alerts"
    id = Column(Integer, primary_key=True, index=True)
    issuer_id = Column(Integer, ForeignKey("users.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))
    severity = Column(String) # CRITICAL, URGENT, INFO
    channels = Column(String) # SMS, WHATSAPP, WEB
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    issuer = relationship("User")
    region = relationship("Region")
