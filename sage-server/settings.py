from pathlib import Path
from dotenv import dotenv_values

ENV = Path(__file__).resolve().parent / ".env"

class Settings:

    def __init__(self):
        self._config = dotenv_values(ENV)

    def __getattr__(self, name):
        if name in self._config:
            return self._config[name]
        raise AttributeError(f"environment variable '{name}' has not been configured")

settings = Settings()