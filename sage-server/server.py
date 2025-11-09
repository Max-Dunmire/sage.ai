from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvloop
import asyncio

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

app = FastAPI()

@app.get('/')
def root():
    return {"Hello" : "World!"}

@app.post('/twiml')
def switch_to_bidirectional_media_stream():
    return FileResponse(path="./twiml.xml")

