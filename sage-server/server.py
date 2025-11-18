import uvloop
import asyncio
import websockets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from call_handling import CallHandler
from settings import settings as env
from logging_utils import setup_logger, make_logger

setup_logger(level="debug")
server_logger = make_logger("server")

GPT_REALTIME_URL = env.GPT_REALTIME_URL
HEADERS = { "Authorization": f"Bearer {env.OPENAI_API_KEY}" }



asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

app = FastAPI()


@app.post('/twiml')
def serve_websocket_endpoint():
    server_logger.debug("twiml endpoint hit")
    return FileResponse(path="./twiml.xml")

@app.websocket('/media')
async def media(twilio_ws: WebSocket):
    await twilio_ws.accept()
    server_logger.info("twilio websocket connected")

    async with websockets.connect(GPT_REALTIME_URL, additional_headers=HEADERS) as openai_ws:
        server_logger.info("openai websocket connected")

        call_handler = await CallHandler.create(twilio_ws, openai_ws)

        async with asyncio.TaskGroup() as tg:
            tg.create_task(call_handler.audio_in())
            tg.create_task(call_handler.audio_out())

