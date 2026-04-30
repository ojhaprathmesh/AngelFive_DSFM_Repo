from datetime import datetime

from flask import Blueprint, jsonify


models_bp = Blueprint("models", __name__)

AVAILABLE_MODELS = {
    "LSTM": {"type": "deep-learning", "framework": "PyTorch"},
    "ARIMA": {"type": "statistical", "framework": "statsmodels"},
    "GARCH": {"type": "volatility", "framework": "arch"},
    "FINBERT": {"type": "nlp-sentiment", "framework": "transformers"},
    "RULE_BASED": {"type": "nlp-sentiment", "framework": "custom"},
}


@models_bp.route("/models", methods=["GET"])
def get_available_models():
    return (
        jsonify(
            {
                "status": "success",
                "message": "Available models retrieved successfully",
                "data": {
                    "models": AVAILABLE_MODELS,
                    "count": len(AVAILABLE_MODELS),
                    "supported_symbols": ["SENSEX", "NIFTY50"],
                },
                "timestamp": datetime.now().isoformat(),
                "service": "ml-service",
            }
        ),
        200,
    )
