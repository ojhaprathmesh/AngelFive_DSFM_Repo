from pathlib import Path
from threading import Lock

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ml_service.config import Config
from ml_service.models.lstm_model import TimeSeriesLSTM


_finbert_lock = Lock()
_lstm_lock = Lock()
_finbert_tokenizer = None
_finbert_model = None
_lstm_model = None


def get_finbert():
    global _finbert_model, _finbert_tokenizer
    if _finbert_model is None or _finbert_tokenizer is None:
        with _finbert_lock:
            if _finbert_model is None or _finbert_tokenizer is None:
                _finbert_tokenizer = AutoTokenizer.from_pretrained(Config.FINBERT_MODEL_NAME)
                _finbert_model = AutoModelForSequenceClassification.from_pretrained(Config.FINBERT_MODEL_NAME)
                _finbert_model.eval()
    return _finbert_tokenizer, _finbert_model


def get_lstm_model():
    global _lstm_model
    if _lstm_model is None:
        with _lstm_lock:
            if _lstm_model is None:
                model = TimeSeriesLSTM()
                model_path = Path(Config.LSTM_MODEL_PATH)
                if not model_path.exists():
                    raise FileNotFoundError(
                        f"LSTM weights not found at '{model_path}'. Run scripts/init_lstm_weights.py first."
                    )
                state_dict = torch.load(model_path, map_location=torch.device("cpu"))
                model.load_state_dict(state_dict)
                model.eval()
                _lstm_model = model
    return _lstm_model
