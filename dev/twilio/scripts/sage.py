from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import os

from scheduler_core import SchedulerSession

PERSONA = {
    "label": "Doctor",
    "greeting": "Hello, this is Dr. Khan’s office.",
    "default_title": "Doctor's Appointment",
    "work_start": "08:00",
    "work_end": "17:00",
    "credentials_path": "creds/doctor/credentials.json",
    "token_path": "creds/doctor/token.json",
    "tz": "America/Los_Angeles",
}

SESSION = SchedulerSession(persona=PERSONA)

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET")
app = FastAPI()

def auth(secret_hdr: str):
    if secret_hdr != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")

class TurnIn(BaseModel):
    text: str  # only text needed now

class TurnOut(BaseModel):
    reply: str

@app.post("/turn", response_model=TurnOut)
def turn(inp: TurnIn, x_internal_secret: str = Header(default="")):
    auth(x_internal_secret)

    reply = SESSION.handle(inp.text)
    print(reply)
    return TurnOut(reply=reply)
