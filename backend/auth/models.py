from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    # Roles: system_admin, institutional_user, field_officer, community_user
    role = Column(String, default="institutional_user") 
    full_name = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    region = relationship("Region")

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token_id = Column(String, unique=True, index=True)
    ip_address = Column(String)
    user_agent = Column(String)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sessions")
