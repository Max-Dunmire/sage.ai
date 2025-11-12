from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
import uvloop
import asyncio
import websockets

url = "wss://api.openai.com/v1/realtime?model=gpt-realtime"
headers = ["Authorization: Bearer " + OPENAI_API_KEY]

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

app = FastAPI()

@app.get('/')
def root():
    return {"Hello" : "World!"}

@app.post('/twiml')
def switch_to_bidirectional_media_stream():
    return FileResponse(path="./twiml.xml")

@app.websocket('/media')
async def media(ws: WebSocket):
    await ws.accept()
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
