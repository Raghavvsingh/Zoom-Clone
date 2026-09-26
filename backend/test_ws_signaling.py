import asyncio
import json
import websockets

async def test_signaling():
    meeting_code = "749-305-685"
    uri_a = f"ws://127.0.0.1:8000/ws/{meeting_code}?name=Alex%20Morgan"
    uri_b = f"ws://127.0.0.1:8000/ws/{meeting_code}?name=RS"

    print("Connecting Client A (Alex Morgan)...")
    async with websockets.connect(uri_a) as ws_a:
        msg_a1 = json.loads(await ws_a.recv())
        print(f"Client A received: {msg_a1}")
        assert msg_a1["type"] == "room-users"
        assert msg_a1["peers"] == []

        print("Connecting Client B (RS)...")
        async with websockets.connect(uri_b) as ws_b:
            msg_b1 = json.loads(await ws_b.recv())
            print(f"Client B received: {msg_b1}")
            assert msg_b1["type"] == "room-users"
            assert "Alex Morgan" in msg_b1["peers"]

            # Client A should receive 'user-joined' notification
            msg_a2 = json.loads(await ws_a.recv())
            print(f"Client A received: {msg_a2}")
            assert msg_a2["type"] == "user-joined"
            assert msg_a2["sender"] == "RS"

            # Client B sends WebRTC offer to Client A
            offer_payload = {
                "type": "offer",
                "sender": "RS",
                "target": "Alex Morgan",
                "offer": {"type": "offer", "sdp": "v=0\r\no=RS 123 456 IN IP4 127.0.0.1"}
            }
            await ws_b.send(json.dumps(offer_payload))

            # Client A receives the offer
            msg_a3 = json.loads(await ws_a.recv())
            print(f"Client A received offer: {msg_a3}")
            assert msg_a3["type"] == "offer"
            assert msg_a3["sender"] == "RS"

            # Client A sends answer to Client B
            answer_payload = {
                "type": "answer",
                "sender": "Alex Morgan",
                "target": "RS",
                "answer": {"type": "answer", "sdp": "v=0\r\no=AlexMorgan 789 012 IN IP4 127.0.0.1"}
            }
            await ws_a.send(json.dumps(answer_payload))

            # Client B receives the answer
            msg_b2 = json.loads(await ws_b.recv())
            print(f"Client B received answer: {msg_b2}")
            assert msg_b2["type"] == "answer"
            assert msg_b2["sender"] == "Alex Morgan"

            # Client B sends ICE candidate to Client A
            cand_payload = {
                "type": "ice-candidate",
                "sender": "RS",
                "target": "Alex Morgan",
                "candidate": {"candidate": "candidate:1 1 UDP 2122260223 127.0.0.1 50000 typ host", "sdpMid": "0"}
            }
            await ws_b.send(json.dumps(cand_payload))

            # Client A receives candidate
            msg_a4 = json.loads(await ws_a.recv())
            print(f"Client A received candidate: {msg_a4}")
            assert msg_a4["type"] == "ice-candidate"

            # Client B sends media-state update
            media_payload = {
                "type": "media-state",
                "sender": "RS",
                "isMuted": True,
                "isVideoOff": False
            }
            await ws_b.send(json.dumps(media_payload))

            # Client A receives media-state
            msg_a5 = json.loads(await ws_a.recv())
            print(f"Client A received media state: {msg_a5}")
            assert msg_a5["type"] == "media-state"
            assert msg_a5["isMuted"] == True

        # When Client B disconnects, Client A receives 'user-left'
        msg_a6 = json.loads(await ws_a.recv())
        print(f"Client A received user-left: {msg_a6}")
        assert msg_a6["type"] == "user-left"
        assert msg_a6["sender"] == "RS"

    print("\n>>> ALL WEBRTC SIGNALING TESTS PASSED 100% SUCCESFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(test_signaling())
