import os
import logging

from datetime import datetime


_LOGGER_INITIALIZED = False
log_level = {
                "debug": logging.DEBUG, 
                "info": logging.INFO, 
                "warning": logging.WARNING,
                "error": logging.ERROR,
                "critical": logging.CRITICAL
            }

def setup_logger(log_dir: str = "logs", level: str = "info"):
    global log_level
    global _LOGGER_INITIALIZED

    logger = logging.getLogger("sage")
    
    if _LOGGER_INITIALIZED:
        return logger
    
    _LOGGER_INITIALIZED = True

    os.makedirs(log_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = os.path.join(log_dir, f"session_{timestamp}.log")

    logger.setLevel(log_level[level])

    handler = logging.FileHandler(log_path)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger

def make_logger(name: str | None = None):
    if name is None:
        return logging.getLogger("sage")
    return logging.getLogger(f"sage.{name}")