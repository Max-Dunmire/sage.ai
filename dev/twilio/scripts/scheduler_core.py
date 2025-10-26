from dotenv import load_dotenv; load_dotenv("../.env")
import os, json, pytz
from datetime import datetime, timedelta, time as dtime
from dateutil import parser as dtparser
from anthropic import Anthropic

USER_TZ = "America/Los_Angeles"
SCOPES = ["https://www.googleapis.com/auth/calendar"]
MODEL = "claude-3-5-haiku-20241022"

api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("Set ANTHROPIC_API_KEY in your environment.")
client = Anthropic(api_key=api_key)

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

def list_events_between(svc, time_min_iso: str, time_max_iso: str, tzname: str):
    items = svc.events().list(
        calendarId="primary",
        timeMin=time_min_iso,
        timeMax=time_max_iso,
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
                    "required": ["time_min","time_max"]
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
                    "required": ["title","start","end"]
                }
            }
        ]

    def _system_prompt(self):
        ws = self.persona.get("work_start","08:00")
        we = self.persona.get("work_end","17:00")
        greet = self.persona["greeting"]
        now = datetime.now(pytz.timezone(self.tzname)).isoformat()
        return f"""You are a warm, efficient human secretary for the {self.persona['label']} persona.
Speak naturally and briefly. Friendly, not chatty.

Use the brand greeting only on your first reply: "{greet}"
Timezone: {self.tzname}. Current datetime: {now}.
Privacy: Never reveal event titles or metadata. Only time ranges.

Scheduling:
- Parse constraints like "after 3 pm next week" and duration.
- Compute next-week bounds: Monday 00:00 to the following Monday 00:00 in {self.tzname}.
- Call calendar_events_between once for that week.
- Merge overlaps. Treat all-day as busy.
- Offer up to 5 exact options within {ws}-{we} unless the user says otherwise, format: "Tue Oct 28, 3:00–3:30 PM".
- If the user picks one, restate and ask:
  Do you want me to book "<Day of the Week>, <Month> <Day>, <Year>, <Start Time> - <End Time> (<Length in Minutes>)"?
  Reply yes or no.
- Only after “yes”, call calendar_create_event.
Keep replies short and human. Avoid lists unless offering slots.
"""

    def _exec_tool(self, block):
        if block.name == "calendar_events_between":
            tmin = block.input["time_min"]
            tmax = block.input["time_max"]
            tzname = block.input.get("timezone", self.tzname)
            events = list_events_between(self.svc, tmin, tmax, tzname)
            return {"events": events, "time_min": tmin, "time_max": tmax, "timezone": tzname}
        if block.name == "calendar_create_event":
            title = block.input.get("title") or self.persona.get("default_title","Appointment")
            start = block.input["start"]
            end = block.input["end"]
            tzname = block.input.get("timezone", self.tzname)
            desc = block.input.get("description")
            loc = block.input.get("location")
            now_tz = datetime.now(pytz.timezone(tzname))
            if dtparser.isoparse(start).astimezone(pytz.timezone(tzname)) <= now_tz:
                return {"created": False, "reason": "past"}
            ev = create_event(self.svc, tzname, title, start, end, desc, loc)
            return {"created": True, "htmlLink": ev["htmlLink"]}
        return {"error": "unknown_tool"}

    def handle(self, user_text: str) -> str:
        if not self._first_reply_done:
            user_text = f"{self.persona['greeting']} {user_text}"
        self.messages.append({"role":"user","content": user_text})

        for _ in range(16):
            resp = client.messages.create(
                model=MODEL,
                system=self._system_prompt(),
                max_tokens=900,
                tools=self.tools,
                messages=self.messages
            )
            self.messages.append({"role":"assistant","content": resp.content})

            tool_results = []
            had_tool = False
            for block in resp.content:
                if block.type == "tool_use":
                    had_tool = True
                    tool_results.append({
                        "type":"tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(self._exec_tool(block))
                    })
            if had_tool:
                self.messages.append({"role":"user","content": tool_results})
                continue

            out = " ".join([b.text for b in resp.content if b.type == "text"]).strip() or ""
            self._first_reply_done = True
            return out

        self._first_reply_done = True
        return "Sorry, I couldn’t complete that just now. Please try again."
