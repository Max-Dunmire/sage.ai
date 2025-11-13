import uvloop
import asyncio
import websockets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse


url = "wss://api.openai.com/v1/realtime?model=gpt-realtime"
headers = ["Authorization: Bearer " + OPENAI_API_KEY]

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

app = FastAPI()

@app.get('/')
def root():
    pass

@app.post('/twiml')
def serve_websocket_endpoint():
    return FileResponse(path="./twiml.xml")

@app.websocket('/media')
async def media(ws: WebSocket):
    await ws.accept()

    async with websockets.connect(url, additional_headers=headers) as ws:





try:
    while True:
        data = await ws.receive_json()

        if data["event"] == "connected":
            pass
        if data["event"] == "start":
            pass
        if data["event"] == "media":
            pass
except WebSocketDisconnect:
    print("disconnected")
