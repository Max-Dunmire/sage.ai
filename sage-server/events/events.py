import json

from pathlib import Path
from copy import deepcopy

DIR = Path(__file__).resolve().parent
TEMPLATES = DIR / "templates"

class EventManager:

    def __init__(self):

        self._templates = {}

        for file in TEMPLATES.glob("*.json"):
            name = file.stem

            with open(file, 'r') as f:
                self._templates[name] = json.load(f)

    def serve(self, event: str, **kwargs) -> str:

        template = deepcopy(self._templates[event])

        def insert(k: str, v: int | bool | str, d: dict) -> None:
            for key, value in d.items():
                if isinstance(value, dict):
                    insert(k, v, value)
                elif key == k:
                    d[key] = v

        for key, value in kwargs.items():
            insert(key, value, template)
    
        return json.dumps(template)
