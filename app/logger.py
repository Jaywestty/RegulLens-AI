# app/logger.py

import sys
from loguru import logger

def setup_logger():
    """
    Configures Loguru for the entire application.
    
    We remove the default handler and add our own with a structured format.
    
    Why JSON-style structured logs?
    When your app runs on a server, logs get collected by monitoring tools.
    Structured logs (key=value pairs) are machine-readable — you can filter,
    search, and alert on specific fields. Plain text logs are hard to query.
    
    In production, Render's dashboard will display these cleanly.
    """
    logger.remove()
    
    logger.add(
        sys.stdout,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{line} | {message}",
        level="INFO",
        colorize=True,
    )
    
    logger.add(
        "logs/app.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{line} | {message}",
        level="INFO",
        rotation="10 MB",
        retention="7 days",
        compression="zip",
    )

    return logger