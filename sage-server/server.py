import uvloop
import asyncio
import websockets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse

from call_handling import CallHandler
from db import AsyncSessionLocal
from db.crud import create_call
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
    form, cache = await asyncio.gather(
        request.form(),
        get_cache(),
        return_exceptions=True
    )

    call_sid = form.get("CallSid")
    account_sid = form.get("AccountSid")
    recipient = form.get("To")
    caller = form.get("From")

    async with AsyncSessionLocal() as session:
        await asyncio.gather(
            create_call(session, call_sid, account_sid, recipient, caller),
            cache.set(f"call_{call_sid}", recipient),
            return_exceptions=True
        )

    server_logger.info("/twiml : Sending Back TwiML Instructions")
    return FileResponse(path="./twiml.xml")

@app.websocket('/media')
async def media(twilio_ws: WebSocket):
    server_logger.info("/media : Starting Bidirectional MediaStream")
    await twilio_ws.accept()
    server_logger.debug("Twilio websocket accepted")

    async with websockets.connect(GPT_REALTIME_URL, additional_headers=HEADERS) as openai_ws:
        server_logger.debug("OpenAI websocket connected")

        call_handler = CallHandler(twilio_ws, openai_ws)

        async with asyncio.TaskGroup() as tg:
            tg.create_task(call_handler.audio_in())
            tg.create_task(call_handler.audio_out())

