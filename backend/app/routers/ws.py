import json
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

logger = logging.getLogger("webrtc_signaling")
logging.basicConfig(level=logging.INFO)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # Format: self.rooms[meeting_code][client_id] = WebSocket
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, meeting_code: str, client_id: str, websocket: WebSocket):
        await websocket.accept()
        if meeting_code not in self.rooms:
            self.rooms[meeting_code] = {}

        # If client already exists (e.g. quick refresh/reconnect), close old connection cleanly
        if client_id in self.rooms[meeting_code]:
            try:
                old_ws = self.rooms[meeting_code][client_id]
                await old_ws.close(code=1000)
            except Exception:
                pass

        self.rooms[meeting_code][client_id] = websocket
        logger.info(f"Client '{client_id}' connected to room '{meeting_code}'. Total clients in room: {len(self.rooms[meeting_code])}")

    def disconnect(self, meeting_code: str, client_id: str, websocket: WebSocket) -> bool:
        """Disconnect only if the closing websocket is still the active connection for this client."""
        if meeting_code in self.rooms and self.rooms[meeting_code].get(client_id) == websocket:
            del self.rooms[meeting_code][client_id]
            logger.info(f"Client '{client_id}' removed from room '{meeting_code}'. Remaining: {len(self.rooms[meeting_code])}")
            if not self.rooms[meeting_code]:
                del self.rooms[meeting_code]
            return True
        return False

    def get_room_peers(self, meeting_code: str, current_client: str) -> List[str]:
        if meeting_code not in self.rooms:
            return []
        return [client for client in self.rooms[meeting_code].keys() if client != current_client]

    async def send_direct_message(self, meeting_code: str, target: str, message: dict):
        if meeting_code in self.rooms and target in self.rooms[meeting_code]:
            try:
                ws = self.rooms[meeting_code][target]
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send direct message to '{target}' in room '{meeting_code}': {e}")

    async def broadcast_to_room(self, meeting_code: str, sender: str, message: dict):
        if meeting_code not in self.rooms:
            return
        for client_id, ws in list(self.rooms[meeting_code].items()):
            if client_id != sender:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to broadcast message from '{sender}' to '{client_id}': {e}")


manager = ConnectionManager()


@router.websocket("/ws/{meeting_code}")
@router.websocket("/ws/signal/{meeting_code}")
async def websocket_endpoint(
    websocket: WebSocket,
    meeting_code: str,
    name: Optional[str] = Query(None),
):

    # Extract client name from query parameter or headers/fallback
    client_name = name or websocket.query_params.get("name")
    if not client_name:
        client_name = f"User_{id(websocket)}"

    client_name = client_name.strip()

    await manager.connect(meeting_code, client_name, websocket)

    try:
        # 1. Send the newly joined participant the list of existing peers in the room
        existing_peers = manager.get_room_peers(meeting_code, client_name)
        await websocket.send_text(
            json.dumps({
                "type": "room-users",
                "peers": existing_peers,
                "you": client_name,
            })
        )

        # 2. Inform all existing peers in the room that this new participant has joined
        await manager.broadcast_to_room(
            meeting_code,
            client_name,
            {
                "type": "user-joined",
                "sender": client_name,
            }
        )

        # 3. Listen for signaling messages: offers, answers, ice-candidates, media-state, chat, etc.
        while True:
            text_data = await websocket.receive_text()
            try:
                msg = json.loads(text_data)
            except json.JSONDecodeError:
                continue

            target = msg.get("target")

            # Route message to specific target peer if targeted (WebRTC offer, answer, ice-candidate)
            if target:
                await manager.send_direct_message(meeting_code, target, msg)
            else:
                # Broadcast to all peers in the room (e.g. media-state changes, chat-message, leave)
                await manager.broadcast_to_room(meeting_code, client_name, msg)

    except WebSocketDisconnect:
        is_active = manager.disconnect(meeting_code, client_name, websocket)
        if is_active:
            await manager.broadcast_to_room(
                meeting_code,
                client_name,
                {
                    "type": "user-left",
                    "sender": client_name,
                }
            )
    except Exception as e:
        logger.error(f"WebSocket error for client '{client_name}' in room '{meeting_code}': {e}")
        is_active = manager.disconnect(meeting_code, client_name, websocket)
        if is_active:
            await manager.broadcast_to_room(
                meeting_code,
                client_name,
                {
                    "type": "user-left",
                    "sender": client_name,
                }
            )

