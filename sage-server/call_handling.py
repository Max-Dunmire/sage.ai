import base64
import json

from websockets import ClientConnection
from fastapi import WebSocket, WebSocketDisconnect

from audio_utils import mulaw8k_bytes_to_pcm16_24k, pcm16_24k_bytes_to_mulaw8k

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
                        decoded_mulaw_bytes: bytes = base64.b64decode(b64_string)
                        pcm16_bytes = mulaw8k_bytes_to_pcm16_24k(decoded_mulaw_bytes)
                        audio_string = base64.b64encode(pcm16_bytes).decode("ascii")
                        await self.ws_out.send(json.dumps({
                            "type": "input_audio_buffer.append",
                            "audio": audio_string,
                        }))

        finally:
            #cleanup code here
            pass

    async def audio_out(self):
        pass