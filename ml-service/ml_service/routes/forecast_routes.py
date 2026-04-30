from datetime import datetime

from flask import Blueprint, jsonify, request

from ml_service.services.forecast_service import run_forecast


forecast_bp = Blueprint("forecast", __name__)


@forecast_bp.route("/forecast", methods=["POST"])
def generate_forecast():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "code": 400, "message": "Invalid request", "details": "Request body must be valid JSON"}), 400

    symbol = str(data.get("symbol", "")).upper()
    model = str(data.get("model", "LSTM")).upper()
    days = int(data.get("days", 30))
    returns = data.get("returns")
    if not returns or not isinstance(returns, list):
        return jsonify({"status": "error", "code": 400, "message": "Missing required fields", "details": "returns array is required"}), 400

    try:
        forecast_data = run_forecast(symbol=symbol, model=model, returns=returns, days=days)
    except ValueError as exc:
        return jsonify({"status": "error", "code": 400, "message": "Validation failed", "details": str(exc)}), 400
    except Exception as exc:
        return jsonify({"status": "error", "code": 500, "message": "Forecast generation failed", "details": str(exc)}), 500

    return (
        jsonify(
            {
                "status": "success",
                "message": f"Forecast generated successfully for {symbol}",
                "data": {
                    **forecast_data,
                    "generated_at": datetime.now().isoformat(),
                },
                "timestamp": datetime.now().isoformat(),
                "service": "ml-service",
            }
        ),
        200,
    )
