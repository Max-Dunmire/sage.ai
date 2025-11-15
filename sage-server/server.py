import uvloop
import asyncio
import websockets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from call_handling import CallHandler
from events.events import EventManager
from settings import settings as env


url = "wss://api.openai.com/v1/realtime?model=gpt-realtime"
headers = ["Authorization: Bearer " + env.OPEN_AI_KEY]
events = EventManager()

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

    async with websockets.connect(url, additional_headers=headers) as openai_ws:

        call_handler = CallHandler(twilio_ws, openai_ws)

        await asyncio.TaskGroup(call_handler.audio_in, call_handler.audio_out)

