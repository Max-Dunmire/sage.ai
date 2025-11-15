import uvloop
import asyncio
import websockets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from call_handling import CallHandler
from settings import settings as env


GPT_REALTIME_URL = env.GPT_REALTIME_URL
HEADERS = ["Authorization: Bearer " + env.OPENAI_API_KEY]

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

app = FastAPI()

@app.get('/')
def root():
    pass

@app.post('/twiml')
def serve_websocket_endpoint():
    return FileResponse(path="./twiml.xml")

@app.websocket('/media')
async def media(twilio_ws: WebSocket):
    await twilio_ws.accept()

    async with websockets.connect(GPT_REALTIME_URL, additional_headers=HEADERS) as openai_ws:

        call_handler = await CallHandler.create(twilio_ws, openai_ws)

        async with asyncio.TaskGroup() as tg:
            tg.create_task(call_handler.audio_in())
            tg.create_task(call_handler.audio_out())

