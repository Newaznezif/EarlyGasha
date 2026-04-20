from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import List, Dict
import json
from ...auth.dependencies import get_current_user
from sqlalchemy.orm import Session
from ...database import SessionLocal

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # room_id -> list of websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@router.websocket("/ws/chat/{room_id}")
async def websocket_chat_endpoint(websocket: WebSocket, room_id: int):
    # We can't use Depends(get_current_user) easily here because WS handling is different
    # Typically token is passed in query params for WS
    await manager.connect(websocket, room_id)
    try:
        while True:
            # We expect messages to come via standard POST for easier DB persistence
            # and then we broadcast them through this WS.
            # But we can also receive simple typing notifications or status here.
            data = await websocket.receive_text()
            # For now, just keep the connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
