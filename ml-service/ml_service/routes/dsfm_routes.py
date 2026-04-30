import logging

from flask import Blueprint, jsonify, request

from ml_service.services.dsfm_service import (
    acf_pacf,
    adf_test,
    arima_forecast,
    black_litterman_optimize,
    enhanced_sharpe_ratio,
    garch_forecast,
    lstm_forecast,
    mpt_optimize,
)
from ml_service.services.sentiment_service import run_finbert_sentiment, run_rule_based_sentiment


logger = logging.getLogger(__name__)
dsfm_bp = Blueprint("dsfm", __name__, url_prefix="/dsfm")


@dsfm_bp.route("/adf-test", methods=["POST"])
def adf_test_route():
    data = request.get_json()
    if not data or "returns" not in data:
        return jsonify({"error": "Returns data required"}), 400
    return jsonify(adf_test(data["returns"])), 200


@dsfm_bp.route("/acf-pacf", methods=["POST"])
def acf_pacf_route():
    data = request.get_json()
    if not data or "returns" not in data:
        return jsonify({"error": "Returns data required"}), 400
    return jsonify(acf_pacf(data["returns"], int(data.get("max_lags", 20)))), 200


@dsfm_bp.route("/arima", methods=["POST"])
def arima_route():
    data = request.get_json()
    if not data or "returns" not in data:
        return jsonify({"error": "Returns data required"}), 400
    order = data.get("order", [1, 0, 1])
    return jsonify(arima_forecast(data["returns"], order=order, steps=5)), 200


@dsfm_bp.route("/garch", methods=["POST"])
def garch_route():
    data = request.get_json()
    if not data or "returns" not in data:
        return jsonify({"error": "Returns data required"}), 400
    order = data.get("order", [1, 1])
    return jsonify(garch_forecast(data["returns"], order=order, horizon=5)), 200


@dsfm_bp.route("/lstm", methods=["POST"])
def lstm_route():
    data = request.get_json()
    if not data or "returns" not in data:
        return jsonify({"error": "Returns data required"}), 400
    try:
        result = lstm_forecast(
            returns=data["returns"],
            lookback=int(data.get("lookback", 10)),
            forecast_steps=int(data.get("forecast_steps", 5)),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result), 200


@dsfm_bp.route("/sentiment/finbert", methods=["POST"])
def finbert_route():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Text data required"}), 400
    return jsonify(run_finbert_sentiment(str(data["text"]))), 200


@dsfm_bp.route("/sentiment/rule-based", methods=["POST"])
def rule_based_route():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Text data required"}), 400
    return jsonify(run_rule_based_sentiment(str(data["text"]))), 200


@dsfm_bp.route("/mpt", methods=["POST"])
def mpt_route():
    data = request.get_json()
    if not data or "returns" not in data or "symbols" not in data:
        return jsonify({"error": "Returns matrix and symbols list required"}), 400
    risk_free_rate = float(data.get("risk_free_rate", data.get("riskFreeRate", 0.06)))
    return jsonify(mpt_optimize(data["returns"], data["symbols"], risk_free_rate=risk_free_rate)), 200


@dsfm_bp.route("/black-litterman", methods=["POST"])
def black_litterman_route():
    data = request.get_json()
    if not data or "returns" not in data or "symbols" not in data:
        return jsonify({"error": "Returns matrix and symbols list required"}), 400
    return (
        jsonify(
            black_litterman_optimize(
                data["returns"],
                data["symbols"],
                views=data.get("views", {}),
                risk_aversion=float(data.get("risk_aversion", data.get("riskAversion", 3.0))),
                tau=float(data.get("tau", 0.05)),
            )
        ),
        200,
    )


@dsfm_bp.route("/sharpe-ratio", methods=["POST"])
def sharpe_route():
    data = request.get_json()
    if not data or "returns" not in data:
        return jsonify({"error": "Returns data required"}), 400
    return (
        jsonify(
            enhanced_sharpe_ratio(
                data["returns"],
                risk_free_rate=float(data.get("risk_free_rate", 0.06)),
                period=str(data.get("period", "daily")),
            )
        ),
        200,
    )
