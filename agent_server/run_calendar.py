# run_calendar.py
# Persona factory + thin wrappers for your main loop.

from scheduler_core_llm import SchedulerSession

PERSONAS = {
    "1": {
        "label": "Doctor",
        "greeting": "Hello, this is Dr. Khan’s office.",
        "default_title": "Doctor's Appointment",
        "work_start": "08:00",
        "work_end": "17:00",
        "credentials_path": "creds/doctor/credentials.json",
        "token_path": "creds/doctor/token.json",
        "tz": "America/Los_Angeles",
    },
    "2": {
        "label": "Hair Stylist",
        "greeting": "Hi, this is Golden Shears Salon.",
        "default_title": "Haircut",
        "work_start": "09:00",
        "work_end": "19:00",
        "credentials_path": "creds/hair/credentials.json",
        "token_path": "creds/hair/token.json",
        "tz": "America/Los_Angeles",
    },
    "3": {
        "label": "Academic Counsellor",
        "greeting": "Hello, Academic Counseling Office speaking.",
        "default_title": "Advising Session",
        "work_start": "09:00",
        "work_end": "17:00",
        "credentials_path": "creds/counsellor/credentials.json",
        "token_path": "creds/counsellor/token.json",
        "tz": "America/Los_Angeles",
    },
}

def make_session(choice: int | str) -> SchedulerSession:
    key = str(choice).strip()
    persona = PERSONAS.get(key)
    if not persona:
        raise ValueError("choice must be 1, 2, or 3")
    return SchedulerSession(persona)

def handle_turn(session: SchedulerSession, user_text: str) -> str:
    return session.handle(user_text)
