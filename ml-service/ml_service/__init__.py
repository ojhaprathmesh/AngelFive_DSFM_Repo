import json
import logging
import os
import threading
import traceback
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from ml_service.config import Config
from ml_service.routes.dsfm_routes import dsfm_bp
from ml_service.routes.forecast_routes import forecast_bp
from ml_service.routes.health_routes import health_bp
from ml_service.routes.model_routes import models_bp
from ml_service.services.sentiment_service import warmup_finbert_model


load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    CORS(app, origins=Config.CORS_ORIGINS)

    @app.before_request
    def log_request():
        logger.info("📥 %s %s - IP: %s", request.method, request.path, request.remote_addr)
        if request.is_json and request.get_json(silent=True):
            logger.info("Request body: %s", json.dumps(request.get_json(), indent=2))

    @app.after_request
    def log_response(response):
        logger.info("📤 %s %s - Status: %s", request.method, request.path, response.status_code)
        return response

    @app.errorhandler(Exception)
    def handle_exception(error):
        logger.error("Unhandled exception: %s", str(error))
        logger.error(traceback.format_exc())
        return (
            jsonify(
                {
                    "status": "error",
                    "code": 500,
                    "message": "Internal server error",
                    "details": str(error) if Config.DEBUG else "An unexpected error occurred",
                    "timestamp": datetime.now().isoformat(),
                    "service": "ml-service",
                }
            ),
            500,
        )

    @app.errorhandler(404)
    def handle_not_found(_error):
        return (
            jsonify(
                {
                    "status": "error",
                    "code": 404,
                    "message": "Endpoint not found",
                    "details": f"The requested endpoint '{request.path}' does not exist",
                    "timestamp": datetime.now().isoformat(),
                    "service": "ml-service",
                }
            ),
            404,
        )

    app.register_blueprint(health_bp)
    app.register_blueprint(forecast_bp)
    app.register_blueprint(models_bp)
    app.register_blueprint(dsfm_bp)

    # Warm FinBERT in background to avoid first-request timeout from proxy/UI.
    should_start_warmup = not Config.DEBUG or os.environ.get("WERKZEUG_RUN_MAIN") == "true"
    if should_start_warmup:
        threading.Thread(target=warmup_finbert_model, daemon=True).start()

    return app
