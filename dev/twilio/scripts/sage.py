from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import os

from scheduler_core import SchedulerSession

PERSONA = {
    "label": "Doctor",
    "greeting": "Hello, this is Dr. Khan's office.",
    "default_title": "Doctor's Appointment",
    "work_start": "08:00",
    "work_end": "17:00",
    "credentials_path": "creds/doctor/credentials.json",
    "token_path": "creds/doctor/token.json",
    "tz": "America/Los_Angeles",
}

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET")
app = FastAPI()

# Global session storage for maintaining conversation within a single call
# Each new stream/call gets its own session
_active_sessions = {}

def auth(secret_hdr: str):
    if secret_hdr != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")

class TurnIn(BaseModel):
    text: str  # only text needed now
    stream_sid: str = None  # optional: stream ID to maintain conversation context

class TurnOut(BaseModel):
    reply: str

@app.post("/turn", response_model=TurnOut)
def turn(inp: TurnIn, x_internal_secret: str = Header(default="")):
    auth(x_internal_secret)

    # Each stream/call gets its own session to prevent conversation memory leakage
    # If stream_sid is provided, maintain conversation within that stream
    # Otherwise, create a fresh session for each turn
    stream_id = inp.stream_sid if inp.stream_sid else "default"

    if stream_id not in _active_sessions:
        _active_sessions[stream_id] = SchedulerSession(persona=PERSONA)

    session = _active_sessions[stream_id]
    reply = session.handle(inp.text)
    print(reply)
    return TurnOut(reply=reply)

@app.post("/session/reset")
def reset_session(stream_sid: str = None, x_internal_secret: str = Header(default="")):
    """Reset conversation for a stream/call. Call this when a call ends."""
    auth(x_internal_secret)

    stream_id = stream_sid if stream_sid else "default"
    if stream_id in _active_sessions:
        del _active_sessions[stream_id]

    return {"message": f"Session {stream_id} reset"}
