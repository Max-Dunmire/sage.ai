from dotenv import load_dotenv; load_dotenv("../.env")

import os, json, pytz, urllib.parse, requests
from datetime import datetime, timedelta, time as dtime
from dateutil import parser as dtparser

USER_TZ = "America/Los_Angeles"
SCOPES = ["https://www.googleapis.com/auth/calendar"]
MODEL = "claude-sonnet-4-5-20250929"

LAVA_TOKEN = os.getenv("LAVA_FORWARD_TOKEN")
if not LAVA_TOKEN:
    raise ValueError("Missing LAVA_FORWARD_TOKEN in .env file")

# ----- Google Calendar auth (per-account paths) -----
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials


def get_calendar_service(credentials_json_path: str, token_json_path: str):
    creds = None
    if os.path.exists(token_json_path):
        creds = Credentials.from_authorized_user_file(token_json_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_json_path):
                raise FileNotFoundError(f"Missing credentials file: {credentials_json_path}")
            flow = InstalledAppFlow.from_client_secrets_file(credentials_json_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_json_path, "w") as f:
            f.write(creds.to_json())
    return build("calendar", "v3", credentials=creds)


# ----- Calendar tools (titles redacted) -----
def list_events_between(svc, time_min_iso: str, time_max_iso: str, tzname: str):
    items = svc.events().list(
        calendarId="primary",
        timeMin=time_min_iso,
        timeMax=time_max_iso,  # exclusive
        singleEvents=True,
        orderBy="startTime",
        timeZone=tzname,
    ).execute().get("items", [])
    out = []
    for e in items:
        s = e["start"].get("dateTime", e["start"].get("date"))
        e_ = e["end"].get("dateTime", e["end"].get("date"))
        if len(s) == 10: s += "T00:00:00"
        if len(e_) == 10: e_ += "T00:00:00"
        out.append({"start": s, "end": e_})
    return out


def create_event(svc, tzname, title, start_iso, end_iso, description=None, location=None):
    body = {
        "summary": title,
        "description": description or "",
        "location": location or "",
        "start": {"dateTime": start_iso, "timeZone": tzname},
        "end": {"dateTime": end_iso, "timeZone": tzname},
    }
    e = svc.events().insert(calendarId="primary", body=body).execute()
    return {"id": e["id"], "htmlLink": e.get("htmlLink")}


# ----- Lava Claude API call -----
def call_claude_via_lava(messages, model, max_tokens, system=None, tools=None):
    """Call Claude through Lava's forward proxy."""
    provider_url = "https://api.anthropic.com/v1/messages"
    lava_url = f"https://api.lavapayments.com/v1/forward?u={urllib.parse.quote(provider_url)}"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LAVA_TOKEN}",
        "anthropic-version": "2023-06-01"
    }

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages
    }

    if system:
        payload["system"] = system

    if tools:
        payload["tools"] = tools

    try:
        response = requests.post(lava_url, headers=headers, data=json.dumps(payload))

        if not response.ok:
            error_text = response.text
            request_id = response.headers.get('x-lava-request-id', 'unknown')
            raise RuntimeError(
                f"Lava proxy request failed: {response.status_code}\n"
                f"Error: {error_text}\n"
                f"Request ID: {request_id}"
            )

        return response.json()

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Network error calling Lava API: {str(e)}")


# =======================================================================
# Public API
# =======================================================================

class SchedulerSession:
    """Create with a persona dict. Call handle(user_text) -> reply_text."""

    def __init__(self, persona: dict):
        self.persona = persona
        self.tzname = persona.get("tz", USER_TZ)
        self.svc = get_calendar_service(persona["credentials_path"], persona["token_path"])
        self._first_reply_done = False
        self.messages = []
        self.tools = [
            {
                "name": "calendar_events_between",
                "description": "Return redacted events within [time_min, time_max). Use to fetch a whole week.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "time_min": {"type": "string"},
                        "time_max": {"type": "string"},
                        "timezone": {"type": "string"}
                    },
                    "required": ["time_min", "time_max"]
                }
            },
            {
                "name": "calendar_create_event",
                "description": "Create an event only after explicit user confirmation.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "start": {"type": "string"},
                        "end": {"type": "string"},
                        "description": {"type": "string"},
                        "location": {"type": "string"},
                        "timezone": {"type": "string"}
                    },
                    "required": ["title", "start", "end"]
                }
            }
        ]

    def _system_prompt(self):
        ws = self.persona.get("work_start", "08:00")
        we = self.persona.get("work_end", "17:00")
        greet = self.persona["greeting"]
        now = datetime.now(pytz.timezone(self.tzname)).isoformat()
        return f"""You are a warm, efficient human secretary for {self.persona['label']}. 
Speak brief, natural, friendly, not chatty. 
First reply only: "{greet}". 

Now: {now}, Timezone: {self.tzname}. 
Keep privacy — no event names, only time ranges. 

ALL appointments and google calendar appointments are 30 minutes long.
“Next week” = Monday 00:00 → next Monday 00:00 in {self.tzname}. 
Use calendar_events_between to find busy times; merge overlaps; all-day = busy. 

Offer up to five free slots in plain speech, e.g. “How about Tuesday Oct 28 at 3 PM for half an hour?” 
If chosen, confirm: “Would you like me to book Tuesday, Oct 28 3:00 to 3:30 PM?” 
Ask their name before booking. 
Only after “yes,” call calendar_create_event. 

Stay short, human, conversational. No lists.
"""

    def _exec_tool(self, block):
        if block["name"] == "calendar_events_between":
            tmin = block["input"]["time_min"]
            tmax = block["input"]["time_max"]
            tzname = block["input"].get("timezone", self.tzname)
            events = list_events_between(self.svc, tmin, tmax, tzname)
            return {"events": events, "time_min": tmin, "time_max": tmax, "timezone": tzname}
        if block["name"] == "calendar_create_event":
            title = block["input"].get("title") or self.persona.get("default_title", "Appointment")
            start = block["input"]["start"]
            end = block["input"]["end"]
            tzname = block["input"].get("timezone", self.tzname)
            desc = block["input"].get("description")
            loc = block["input"].get("location")
            now_tz = datetime.now(pytz.timezone(tzname))
            if dtparser.isoparse(start).astimezone(pytz.timezone(tzname)) <= now_tz:
                return {"created": False, "reason": "past"}
            ev = create_event(self.svc, tzname, title, start, end, desc, loc)
            return {"created": True, "htmlLink": ev["htmlLink"]}
        return {"error": "unknown_tool"}

    def handle(self, user_text: str) -> str:
        if not self._first_reply_done:
            user_text = f"{self.persona['greeting']} {user_text}"
        self.messages.append({"role": "user", "content": user_text})

        for _ in range(16):
            resp = call_claude_via_lava(
                messages=self.messages,
                model=MODEL,
                max_tokens=900,
                system=self._system_prompt(),
                tools=self.tools
            )

            # Convert response to match expected format
            content = resp.get("content", [])
            self.messages.append({"role": "assistant", "content": content})

            tool_results = []
            had_tool = False
            for block in content:
                if block.get("type") == "tool_use":
                    had_tool = True
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block["id"],
                        "content": json.dumps(self._exec_tool(block))
                    })
            if had_tool:
                self.messages.append({"role": "user", "content": tool_results})
                continue

            out = " ".join([b["text"] for b in content if b.get("type") == "text"]).strip() or ""
            self._first_reply_done = True
            return out

        self._first_reply_done = True
        return "Sorry, I couldn't complete that just now. Please try again."
