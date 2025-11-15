import json

from pathlib import Path

DIR = Path(__file__).resolve().parent
TEMPLATES = DIR / "templates"

class EventManager:

    def __init__(self):

        self._templates = {}

        for file in TEMPLATES.glob("*.json"):
            name = file.stem

            with open(file, 'r') as f:
                self._templates[name] = json.load(f)

    def serve(self, event, **kwargs):

        template = self._templates[event]

        for key, value in kwargs.items():
            template[key] = value
    
