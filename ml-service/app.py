#!/usr/bin/env python3
"""ML service entrypoint using Flask application factory pattern."""

import logging

from src import create_app
from src.config import Config


app = create_app()
logger = logging.getLogger(__name__)


if __name__ == "__main__":
    logger.info("Starting ML Service on %s:%s", Config.HOST, Config.PORT)
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)