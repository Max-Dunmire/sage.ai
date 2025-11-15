import base64
import json

from websockets import ClientConnection
from fastapi import WebSocket, WebSocketDisconnect

from events.events import EventManager

events = EventManager()

class CallHandler:
    async def __init__(self, ws_in: WebSocket, ws_out: ClientConnection):
        self.ws_in = ws_in
        self.ws_out = ws_out

        packet = events.serve(event="session-update", instructions="You are a secratary.")
        await self.ws_out.send(packet)

    async def _iter_async(ws: WebSocket):
        while True:
            try:
                yield await ws.receive_json()
            except WebSocketDisconnect:
                return

    async def audio_in(self):
        try:
            for data in self._iter_async(self.ws_in):
                
                match data["event"]:
                    case "connected":
                        print("Twilio is connected")
                    case "start":
                        print("Start of data flow")
                    case "media":
                        
                        payload = data["media"]["payload"]
                        packet = events.serve(event="input_audio_buffer-append", audio=payload)

                        await self.ws_out.send(packet)


        finally:
            #cleanup code here
            pass

    async def audio_out(self):
        pass