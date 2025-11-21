import json

from websockets import ClientConnection
from fastapi import WebSocket, WebSocketDisconnect

from events.events import EventManager
from logging_utils import make_logger

call_handling_logger = make_logger("call_handling")

events = EventManager()

class CallHandler:
    def __init__(self, ws_client: WebSocket, ws_agent: ClientConnection):
        self.ws_client = ws_client
        self.ws_agent = ws_agent
        self.streamSid = None
        self.accountSid = None

    @classmethod
    async def create(cls, ws_client, ws_agent):
        self = cls(ws_client, ws_agent)
        packet = events.serve(event="session-update", instructions="You are a secratary.")
        await self.ws_agent.send(packet)
        call_handling_logger.info("Sent session.update config data")
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
                        call_handling_logger.debug("'connected' packet received from Twilio")
                    case "start":
                        call_handling_logger.debug("'start' packet received from Twilio")
                        self.streamSid = data["start"]["streamSid"]
                        call_handling_logger.info(f"'streamSid' has been set to {self.streamSid}")
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
                        await self.ws_client.send_text(events.serve(event="media", streamSid=self.streamSid, payload=payload))
                        call_handling_logger.debug("'response.output' packet forwarded to Twilio")
                    case "response.created":
                        pass
                    case "response.done":
                        pass
                    case "error":
                        call_handling_logger.error(json.dumps(data))
                    case "conversation.item.done":
                        call_handling_logger.debug(json.dumps(data))
                        # call_handling_logger.debug(data["item"]["content"][0]["text"])
                    case _:
                        call_handling_logger.debug(json.dumps(data))
        except Exception:
            pass # some error handling