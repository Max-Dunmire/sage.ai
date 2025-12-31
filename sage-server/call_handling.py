import json

from websockets import ClientConnection
from fastapi import WebSocket, WebSocketDisconnect

from events.events import EventManager
from db import AsyncSessionLocal
from db.crud import get_client
from utils.logger import make_logger
from utils.cache import get_cache

call_handling_logger = make_logger("call_handling")

events = EventManager()

class CallHandler:
    def __init__(self, ws_client: WebSocket, ws_agent: ClientConnection):
        self.ws_client = ws_client
        self.ws_agent = ws_agent
        self.call_sid = None
        self.stream_sid = None
        self.account_sid = None

    async def _handle_start(self) -> None:

        cache = await get_cache()
        client_phone_number = await cache.get(f"call_{self.call_sid}")

        if client_phone_number:
            await cache.delete(f"call_{self.call_sid}")
            async with AsyncSessionLocal() as session:
                client = await get_client(session, phone_number=client_phone_number)
            if client is None:
                raise LookupError(f"the phone number {client_phone_number} is not a client")
        else:
            raise LookupError(f"client phone number for call_sid: {self.call_sid} could not be found")
        
        packet = events.serve(event="session-update", instructions=client.instructions)
        await self.ws_agent.send(packet)
        call_handling_logger.info("Sent session.update config data")
        call_handling_logger.debug(f"Instructions were: {client.instructions}")

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
                        call_handling_logger.debug("'connected' packet received from Twilio")
                    case "start":
                        call_handling_logger.debug("'start' packet received from Twilio")
                        self.call_sid = data["start"]["callSid"]
                        self.stream_sid = data["start"]["streamSid"]
                        self.account_sid = data["start"]["accountSid"]
                        call_handling_logger.info(f"'callSid' has been set to {self.call_sid}")
                        await self._handle_start()
                    case "media":
                        call_handling_logger.debug("'media' packet received from Twilio")

                        payload = data["media"]["payload"]
                        packet = events.serve(event="input_audio_buffer-append", audio=payload)

                        await self.ws_agent.send(packet)

        finally:
            #cleanup code here
            pass

    async def audio_out(self):
        try:
            async for data in self.ws_agent:
                data : dict = json.loads(data)
                call_handling_logger.info(f"'{data["type"]}' received from OpenAI")
                match data["type"]:
                    case "response.output_audio.delta":
                        payload = data["delta"]
                        await self.ws_client.send_text(events.serve(event="media", streamSid=self.stream_sid, payload=payload))
                        call_handling_logger.debug("'response.output' packet forwarded to Twilio")
                    case _:
                        call_handling_logger.debug(json.dumps(data))
        except Exception:
            pass # some error handling