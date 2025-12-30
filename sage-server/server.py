import uvloop
import asyncio
import websockets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse

from call_handling import CallHandler
from utils.settings import settings as env
from utils.logger import setup_logger, make_logger
from utils.cache import get_cache


setup_logger(level="debug")
server_logger = make_logger("server")

GPT_REALTIME_URL = env.GPT_REALTIME_URL
HEADERS = { "Authorization": f"Bearer {env.OPENAI_API_KEY}" }

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

app = FastAPI()


@app.post('/twiml')
async def serve_websocket_endpoint(request: Request) -> FileResponse:
    form = await request.form()
    print(form.get("From"))
    server_logger.info("/twiml : Sending Back TwiML Instructions")
    return FileResponse(path="./twiml.xml")

@app.websocket('/media')
async def media(twilio_ws: WebSocket):
    server_logger.info("/media : Starting Bidirectional MediaStream")
    await twilio_ws.accept()
    server_logger.debug("Twilio websocket accepted")

    async with websockets.connect(GPT_REALTIME_URL, additional_headers=HEADERS) as openai_ws:
        server_logger.debug("OpenAI websocket connected")

        call_handler = await CallHandler.create(twilio_ws, openai_ws)

        async with asyncio.TaskGroup() as tg:
            tg.create_task(call_handler.audio_in())
            tg.create_task(call_handler.audio_out())

