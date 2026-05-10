import numpy as np

from src.models.model_loader import get_lstm_model
from src.utils.serialization import params_to_dict


def adf_test(returns):
    from statsmodels.tsa.stattools import adfuller
    result = adfuller(np.array(returns), autolag="AIC")
    is_stationary = result[1] < 0.05
    return {
        "test_statistic": float(result[0]),
        "p_value": float(result[1]),
        "critical_values": {"1%": float(result[4]["1%"]), "5%": float(result[4]["5%"]), "10%": float(result[4]["10%"])},
        "is_stationary": bool(is_stationary),
        "interpretation": "Stationary" if is_stationary else "Non-stationary",
    }


def acf_pacf(returns, max_lags=20):
    from statsmodels.tsa.stattools import acf, pacf
    arr = np.array(returns)
    return {
        "lags": list(range(max_lags + 1)),
        "acf": acf(arr, nlags=max_lags, fft=True).tolist(),
        "pacf": pacf(arr, nlags=max_lags).tolist(),
        "confidence_interval": float(1.96 / np.sqrt(len(arr))),
    }


def arima_forecast(returns, order=(1, 0, 1), steps=5):
    from statsmodels.tsa.arima.model import ARIMA
    arr = np.array(returns)
    fitted = ARIMA(arr, order=tuple(order)).fit()
    forecast = fitted.forecast(steps=steps)
    forecast_list = forecast.tolist() if hasattr(forecast, "tolist") else list(forecast)
    return {
        "order": list(order),
        "aic": float(fitted.aic),
        "bic": float(fitted.bic),
        "params": params_to_dict(fitted.params, getattr(fitted, "param_names", None)),
        "forecast": [float(x) for x in forecast_list],
        "summary": str(fitted.summary()),
    }


def garch_forecast(returns, order=(1, 1), horizon=5):
    from arch import arch_model
    arr = np.array(returns)
    fitted = arch_model(arr * 100, vol="Garch", p=order[0], q=order[1]).fit(disp="off")
    cond_vol = fitted.conditional_volatility / 100
    forecast_var = fitted.forecast(horizon=horizon).variance.values[-1] / 10000
    return {
        "order": list(order),
        "aic": float(fitted.aic),
        "bic": float(fitted.bic),
        "params": params_to_dict(fitted.params, getattr(fitted, "param_names", None)),
        "conditional_volatility": cond_vol.tolist() if hasattr(cond_vol, "tolist") else list(cond_vol),
        "forecast": forecast_var.tolist() if hasattr(forecast_var, "tolist") else list(forecast_var),
    }


def lstm_forecast(returns, lookback=10, forecast_steps=5):
    import torch
    arr = np.array(returns, dtype=np.float32)
    if len(arr) < lookback + 5:
        raise ValueError(f"Insufficient data. Need at least {lookback + 5} data points")

    model = get_lstm_model()
    history = arr.copy()
    forecasts = []
    for _ in range(forecast_steps):
        window = history[-lookback:]
        mean = float(window.mean())
        std = float(window.std()) if float(window.std()) > 1e-8 else 1.0
        normalized = (window - mean) / std
        tensor = torch.tensor(normalized, dtype=torch.float32).view(1, lookback, 1)
        with torch.no_grad():
            pred_norm = model(tensor).item()
        prediction = (pred_norm * std) + mean
        forecasts.append(float(prediction))
        history = np.append(history, prediction)

    actual = arr[-forecast_steps:] if len(arr) >= forecast_steps else arr
    pred_eval = np.array(forecasts[: len(actual)], dtype=np.float32)
    rmse = float(np.sqrt(np.mean((pred_eval - actual) ** 2))) if len(actual) else 0.0
    mae = float(np.mean(np.abs(pred_eval - actual))) if len(actual) else 0.0
    return {
        "model": "LSTM",
        "lookback": lookback,
        "forecast_steps": forecast_steps,
        "forecast": forecasts,
        "rmse": rmse,
        "mae": mae,
        "training_loss": rmse,
    }


def mpt_optimize(returns, symbols, risk_free_rate=0.06):
    from scipy.optimize import minimize
    returns_matrix = np.array(returns, dtype=float)
    n_assets = len(symbols)
    expected_returns = np.mean(returns_matrix, axis=1) * 252
    cov_matrix = np.cov(returns_matrix) * 252

    # 1. Find the Minimum Variance Portfolio (MVP)
    def mvp_variance(weights):
        return weights.T @ cov_matrix @ weights

    mvp_constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    mvp_bounds = tuple((0, 1) for _ in range(n_assets))
    mvp_initial = np.array([1.0 / n_assets] * n_assets)
    mvp_res = minimize(mvp_variance, mvp_initial, method="SLSQP", bounds=mvp_bounds, constraints=mvp_constraints)

    mvp_return = mvp_res.x.T @ expected_returns if mvp_res.success else np.mean(expected_returns)

    # 2. Generate target returns from MVP return to Max Return
    max_ret = np.max(expected_returns)
    start_ret = mvp_return
    end_ret = max(max_ret, mvp_return + 0.05)

    target_returns = np.linspace(start_ret, end_ret, 30)
    portfolios = []

    for target_return in target_returns:
        def portfolio_variance(weights):
            return weights.T @ cov_matrix @ weights

        constraints = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w: w.T @ expected_returns - target_return},
        ]
        bounds = tuple((0, 1) for _ in range(n_assets))
        initial = np.array([1.0 / n_assets] * n_assets)
        result = minimize(portfolio_variance, initial, method="SLSQP", bounds=bounds, constraints=constraints)
        if result.success:
            weights = result.x
            port_return = float(weights.T @ expected_returns)
            vol = float(np.sqrt(weights.T @ cov_matrix @ weights))
            sharpe = (port_return - float(risk_free_rate)) / vol if vol > 0 else 0.0
            portfolios.append({"weights": weights.tolist(), "expected_return": port_return, "volatility": vol, "sharpe_ratio": float(sharpe)})

    portfolios.sort(key=lambda item: item["volatility"])

    efficient_portfolios = []
    if portfolios:
        last_vol = -1
        for p in portfolios:
            if p["volatility"] > last_vol:
                efficient_portfolios.append(p)
                last_vol = p["volatility"]

    optimal = max(efficient_portfolios, key=lambda item: item["sharpe_ratio"]) if efficient_portfolios else None
    return {
        "model": "MPT",
        "symbols": symbols,
        "risk_free_rate": float(risk_free_rate),
        "optimal_portfolio": optimal,
        "efficient_frontier": efficient_portfolios,
        "expected_returns": expected_returns.tolist(),
        "covariance_matrix": cov_matrix.tolist(),
    }


def black_litterman_optimize(returns, symbols, views=None, risk_aversion=3.0, tau=0.05):
    from scipy.optimize import minimize
    returns_matrix = np.array(returns, dtype=float)
    cov_matrix = np.cov(returns_matrix) * 252
    inv_vol = 1.0 / (np.diag(cov_matrix) + 1e-10)
    market_weights = inv_vol / np.sum(inv_vol)
    equilibrium_returns = risk_aversion * cov_matrix @ market_weights
    if views:
        view_returns = np.array([views.get(sym, equilibrium_returns[i]) for i, sym in enumerate(symbols)])
        bl_returns = (1 - tau) * equilibrium_returns + tau * view_returns
    else:
        bl_returns = equilibrium_returns

    def negative_sharpe(weights):
        port_return = weights.T @ bl_returns
        port_std = np.sqrt(weights.T @ cov_matrix @ weights)
        return -((port_return - 0.06) / port_std) if port_std > 0 else 1e10

    n_assets = len(symbols)
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = tuple((0.005, max(0.35, 1.5 / n_assets)) for _ in range(n_assets))
    result = minimize(negative_sharpe, market_weights, method="SLSQP", bounds=bounds, constraints=constraints)
    weights = result.x if result.success else market_weights
    weights = np.clip(weights, 0, 1)
    weights = weights / np.sum(weights)
    portfolio_return = float(weights.T @ bl_returns)
    portfolio_std = float(np.sqrt(weights.T @ cov_matrix @ weights))
    sharpe = (portfolio_return - 0.06) / portfolio_std if portfolio_std > 0 else 0.0
    return {
        "model": "Black-Litterman",
        "symbols": symbols,
        "risk_aversion": float(risk_aversion),
        "tau": float(tau),
        "optimal_weights": weights.tolist(),
        "expected_return": portfolio_return,
        "volatility": portfolio_std,
        "sharpe_ratio": float(sharpe),
        "equilibrium_returns": equilibrium_returns.tolist(),
        "bl_returns": bl_returns.tolist(),
        "market_weights": market_weights.tolist(),
    }


def enhanced_sharpe_ratio(returns, risk_free_rate=0.06, period="daily"):
    arr = np.array(returns, dtype=float)
    mean_return = np.mean(arr)
    std_return = np.std(arr)
    scale = {"daily": 252, "weekly": 52, "monthly": 12, "annual": 1}.get(period, 252)
    annual_mean = mean_return * scale
    annual_std = std_return * np.sqrt(scale)
    excess = annual_mean - risk_free_rate
    sharpe = excess / annual_std if annual_std > 0 else 0
    downside = arr[arr < 0]
    downside_std = np.std(downside) if len(downside) > 0 else std_return
    downside_annual = downside_std * np.sqrt(scale)
    sortino = excess / downside_annual if downside_annual > 0 else 0
    info = excess / annual_std if annual_std > 0 else 0
    return {
        "period": period,
        "risk_free_rate": float(risk_free_rate),
        "mean_return": float(mean_return),
        "std_return": float(std_return),
        "annualized_mean": float(annual_mean),
        "annualized_std": float(annual_std),
        "excess_return": float(excess),
        "sharpe_ratio": float(sharpe),
        "sortino_ratio": float(sortino),
        "information_ratio": float(info),
    }
