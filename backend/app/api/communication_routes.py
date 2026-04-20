from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ...auth.dependencies import get_current_user, require_role
from ...auth.models import User
from ...models import CommunicationRoom, ChatMessage, IncidentUpdate, CrisisAlert, Region
from pydantic import BaseModel
import datetime
from .ws_routes import manager
import json
import asyncio

router = APIRouter()

# --- Schemas ---
class MessageCreate(BaseModel):
    room_id: int
    content: str

class MessageResponse(BaseModel):
    id: int
    room_id: int
    sender_name: str
    role: str
    content: str
    translated_content: Optional[str]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    region_id: int
    title: str
    content: str
    severity: str # CRITICAL, URGENT, INFO
    geotag: Optional[str] = None

class AlertCreate(BaseModel):
    region_id: int
    severity: str
    channels: str # SMS, WHATSAPP, WEB
    message: str

# --- Translation Support (Tactical Matrix) ---
DICTIONARY_MOCK = {
    "danger": {"am": "አደጋ", "sw": "hatari"},
    "water": {"am": "ውሃ", "sw": "maji"},
    "food": {"am": "ምግብ", "sw": "chakula"},
    "help": {"am": "እርዳታ", "sw": "saidia"},
    "flood": {"am": "ጎርፍ", "sw": "mafuriko"},
    "drought": {"am": "ድርቅ", "sw": "ukame"},
    "secure": {"am": "ደህንነቱ የተጠበቀ", "sw": "salama"}
}

def translate_message(content: str, target_lang: str = "en") -> str:
    if target_lang == "en":
        return content
    
    words = content.lower().split()
    translated_words = []
    for word in words:
        clean_word = "".join(filter(str.isalnum, word))
        if clean_word in DICTIONARY_MOCK:
            translated_words.append(DICTIONARY_MOCK[clean_word].get(target_lang, clean_word))
        else:
            translated_words.append(word)
    
    prefix = f"[{target_lang.upper()} AI]: "
    return prefix + " ".join(translated_words)

# --- Endpoints ---

@router.get("/rooms", response_model=List[dict])
def get_rooms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rooms = db.query(CommunicationRoom).all()
    # Filter private rooms if not admin
    if current_user.role != 'system_admin':
        rooms = [r for r in rooms if r.is_private == 0]
    return [{"id": r.id, "name": r.name, "description": r.description, "is_private": r.is_private} for r in rooms]

@router.get("/rooms/{room_id}/messages", response_model=List[MessageResponse])
def get_messages(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.timestamp.asc()).all()
    results = []
    for m in messages:
        results.append(MessageResponse(
            id=m.id,
            room_id=m.room_id,
            sender_name=m.sender.full_name or m.sender.email.split('@')[0],
            role=m.sender.role,
            content=m.content,
            translated_content=m.translated_content,
            timestamp=m.timestamp
        ))
    return results

@router.post("/rooms/{room_id}/messages")
async def send_message(room_id: int, data: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if user has access to room (simplified)
    room = db.query(CommunicationRoom).filter(CommunicationRoom.id == room_id).first()
    if room.is_private == 1 and current_user.role != 'system_admin':
        raise HTTPException(status_code=403, detail="Operational clearance insufficient for this channel.")
    
    # Simulate Translation
    translated = translate_message(data.content, "am" if current_user.role == 'field_officer' else "en")
    
    new_msg = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        content=data.content,
        translated_content=translated
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    # Broadcast via WebSocket
    await manager.broadcast_to_room(room_id, {
        "type": "chat_message",
        "data": {
            "id": new_msg.id,
            "room_id": room_id,
            "sender_name": current_user.full_name or current_user.email.split('@')[0],
            "role": current_user.role,
            "content": new_msg.content,
            "translated_content": new_msg.translated_content,
            "timestamp": new_msg.timestamp.isoformat()
        }
    })
    
    return {"status": "dispatched"}

@router.get("/incidents", response_model=List[dict])
def get_incidents(db: Session = Depends(get_db)):
    updates = db.query(IncidentUpdate).order_by(IncidentUpdate.timestamp.desc()).all()
    return [{
        "id": u.id,
        "title": u.title,
        "content": u.content,
        "severity": u.severity,
        "region": u.region.name,
        "geotag": u.geotag,
        "sender": (print(f"DEBUG: user={u.user}, type={type(u.user)}") or (u.user.full_name or u.user.email.split('@')[0])),
        "timestamp": u.timestamp
    } for u in updates]

@router.post("/incidents")
async def post_incident(data: IncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(['field_officer', 'institutional_user', 'system_admin']))):
    new_update = IncidentUpdate(
        user_id=current_user.id,
        region_id=data.region_id,
        title=data.title,
        content=data.content,
        severity=data.severity,
        geotag=data.geotag
    )
    db.add(new_update)
    db.commit()
    db.refresh(new_update)
    
    # Broadcast to a global "incidents" room (room_id 0 or similar)
    await manager.broadcast_to_room(0, {
        "type": "incident_update",
        "data": {
            "id": new_update.id,
            "title": new_update.title,
            "content": new_update.content,
            "severity": new_update.severity,
            "region": new_update.region.name,
            "sender": current_user.full_name or current_user.email.split('@')[0],
            "timestamp": new_update.timestamp.isoformat()
        }
    })
    return {"status": "logged", "incident_id": new_update.id}

@router.post("/alerts")
async def trigger_alert(data: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(['system_admin', 'institutional_user']))):
    new_alert = CrisisAlert(
        issuer_id=current_user.id,
        region_id=data.region_id,
        severity=data.severity,
        channels=data.channels,
        message=data.message
    )
    db.add(new_alert)
    db.commit()
    
    # Log the simulated SMS/Dispatcher action
    from .audit_routes import log_event
    log_event(db, "TRIGGER_ALERT", current_user.email, f"Broadcasted {data.severity} alert to {data.channels} in region {data.region_id}")
    
    db.refresh(new_alert)
    
    # Broadcast to a global "alerts" room (room_id -1 or similar)
    await manager.broadcast_to_room(-1, {
        "type": "crisis_alert",
        "data": {
            "id": new_alert.id,
            "severity": new_alert.severity,
            "message": new_alert.message,
            "region": db.query(Region).filter(Region.id == new_alert.region_id).first().name,
            "timestamp": new_alert.timestamp.isoformat()
        }
    })
    
    return {"status": "broadcast_active", "alert_id": new_alert.id}

@router.get("/alerts")
def get_active_alerts(db: Session = Depends(get_db)):
    return db.query(CrisisAlert).order_by(CrisisAlert.timestamp.desc()).limit(10).all()
