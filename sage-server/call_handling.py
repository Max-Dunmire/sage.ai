import base64

from fastapi import WebSocket, WebSocketDisconnect
from websockets import ClientConnection

class CallHandler:
    def __init__(self, ws_in: WebSocket, ws_out: ClientConnection):
        self.ws_in = ws_in
        self.ws_out = ws_out

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
                        b64_string = data["media"]["payload"]
                        decoded_bytes: bytes = base64.b64decode(b64_string)

                    

        finally:
            #cleanup code here
            pass

    async def audio_out(self):
        pass