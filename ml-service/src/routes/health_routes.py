import os
from datetime import datetime

import psutil
from flask import Blueprint, jsonify

from src.config import Config
from src.services.sentiment_service import get_finbert_warmup_status


health_bp = Blueprint("health", __name__)


@health_bp.route("/", methods=["GET"])
def root():
    return (
        jsonify(
            {
                "service": "AngelFive ML Service",
                "status": "running",
                "available_endpoints": ["/health", "/forecast", "/models", "/dsfm/*"],
            }
        ),
        200,
    )


@health_bp.route("/health", methods=["GET"])
def health_check():
    warmup = get_finbert_warmup_status()
    return (
        jsonify(
            {
                "status": "success",
                "message": "ML service is healthy and running",
                "timestamp": datetime.now().isoformat(),
                "service": "ml-service",
                "version": "2.0.0",
                "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
                "model_warmup": {"finbert": warmup},
            }
        ),
        200,
    )


@health_bp.route("/health/detailed", methods=["GET"])
def detailed_health_check():
    warmup = get_finbert_warmup_status()
    return (
        jsonify(
            {
                "status": "success",
                "message": "Detailed health check passed",
                "timestamp": datetime.now().isoformat(),
                "service": "ml-service",
                "version": "2.0.0",
                "system": {
                    "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
                    "platform": os.sys.platform,
                    "cpu_count": os.cpu_count(),
                    "memory_usage": f"{psutil.virtual_memory().percent}%",
                    "disk_usage": f"{psutil.disk_usage('/').percent}%",
                },
                "configuration": {"debug": Config.DEBUG, "host": Config.HOST, "port": Config.PORT},
                "model_warmup": {"finbert": warmup},
            }
        ),
        200,
    )
