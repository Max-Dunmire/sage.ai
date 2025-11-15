from websockets import ClientConnection
from fastapi import WebSocket, WebSocketDisconnect

from events.events import EventManager

events = EventManager()

class CallHandler:
    def __init__(self, ws_client: WebSocket, ws_agent: ClientConnection):
        self.ws_client = ws_client
        self.ws_agent = ws_agent
        self.streamSid = None

    @classmethod
    async def create(cls, ws_client, ws_agent):
        self = cls(ws_client, ws_agent)
        packet = events.serve(event="session-update", instructions="You are a secratary.")
        await self.ws_agent.send(packet)
        return self

    @staticmethod
    async def _iter_async(ws: WebSocket):
        while True:
            try:
                yield await ws.receive_json()
            except WebSocketDisconnect:
                return

    async def audio_in(self):
        try:
            async for data in self._iter_async(self.ws_client):
                
                match data["event"]:
                    case "connected":
                        print("Twilio is connected")
                    case "start":
                        print("Start of data flow")
                        self.streamSid = data["start"]["streamSid"]
                    case "media":
                        
                        payload = data["media"]["payload"]
                        packet = events.serve(event="input_audio_buffer-append", audio=payload)

                        await self.ws_agent.send(packet)


        finally:
            #cleanup code here
            pass

    async def audio_out(self):
        async for data in self.ws_agent:
            if data["type"] == "response.output_audio.delta":
                payload = data["delta"]
                await self.ws_client.send_json(events.serve(event="media", streamSid=self.streamSid, payload=payload))