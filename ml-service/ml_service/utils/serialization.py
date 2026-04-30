from typing import Any

import numpy as np


def to_serializable(value: Any) -> Any:
    if isinstance(value, (np.generic,)):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def params_to_dict(params: Any, param_names: Any = None) -> dict:
    try:
        if hasattr(params, "to_dict"):
            return {str(k): float(v) for k, v in params.to_dict().items()}
        if hasattr(params, "index") and hasattr(params, "values"):
            return {str(k): float(v) for k, v in zip(params.index, params.values)}
        if param_names is not None:
            values = params if not hasattr(params, "values") else params.values
            return {str(name): float(val) for name, val in zip(param_names, values)}
        values = list(params) if hasattr(params, "__iter__") else [float(params)]
        return {f"param_{idx}": float(val) for idx, val in enumerate(values)}
    except Exception:
        return {"error": "Could not serialize parameters"}
