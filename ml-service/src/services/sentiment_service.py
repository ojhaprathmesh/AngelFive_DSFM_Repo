from threading import Lock

import torch

from src.models.model_loader import get_finbert


LABEL_MAP = {
    "positive": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "label_0": "positive",
    "label_1": "negative",
    "label_2": "neutral",
}

_warmup_lock = Lock()
_warmup_started = False
_warmup_ready = False
_warmup_error = None


def warmup_finbert_model():
    global _warmup_started, _warmup_ready, _warmup_error
    with _warmup_lock:
        if _warmup_started:
            return
        _warmup_started = True
    try:
        # This triggers tokenizer + model download/load once per process.
        get_finbert()
        _warmup_ready = True
        _warmup_error = None
    except Exception as exc:
        _warmup_ready = False
        _warmup_error = str(exc)


def get_finbert_warmup_status() -> dict:
    return {
        "started": _warmup_started,
        "ready": _warmup_ready,
        "error": _warmup_error,
    }


def run_finbert_sentiment(text: str) -> dict:
    tokenizer, model = get_finbert()
    encoded = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        logits = model(**encoded).logits
        probs = torch.softmax(logits, dim=-1).squeeze(0)

    id2label = {idx: value.lower() for idx, value in model.config.id2label.items()}
    label_probs = {}
    for idx, prob in enumerate(probs.tolist()):
        canonical_label = LABEL_MAP.get(id2label.get(idx, f"label_{idx}"), "neutral")
        label_probs[canonical_label] = float(prob)

    positive = label_probs.get("positive", 0.0)
    negative = label_probs.get("negative", 0.0)
    neutral = label_probs.get("neutral", 0.0)

    sentiment = max(
        [("positive", positive), ("negative", negative), ("neutral", neutral)],
        key=lambda item: item[1],
    )[0]
    score = label_probs[sentiment]

    return {
        "model": "FinBERT",
        "text": text[:200],
        "sentiment": sentiment,
        "score": score,
        "confidence": score,
        "positive_probability": positive,
        "negative_probability": negative,
        "neutral_probability": neutral,
    }


def run_rule_based_sentiment(text: str) -> dict:
    text_lower = text.lower()
    bullish_patterns = [
        "bullish",
        "breakout",
        "resistance",
        "support",
        "uptrend",
        "rally",
        "surge",
        "gain",
        "profit",
        "growth",
        "strong",
        "buy",
        "long",
        "target",
        "higher",
    ]
    bearish_patterns = [
        "bearish",
        "breakdown",
        "sell-off",
        "downtrend",
        "crash",
        "plunge",
        "drop",
        "loss",
        "decline",
        "weak",
        "sell",
        "short",
        "lower",
        "fall",
    ]
    neutral_patterns = ["consolidate", "sideways", "range", "stable", "unchanged", "flat"]

    bullish_score = sum(1 for pattern in bullish_patterns if pattern in text_lower)
    bearish_score = sum(1 for pattern in bearish_patterns if pattern in text_lower)
    neutral_score = sum(1 for pattern in neutral_patterns if pattern in text_lower)

    total = bullish_score + bearish_score + neutral_score
    if total == 0:
        sentiment = "neutral"
        score = 0.5
    elif bullish_score > bearish_score and bullish_score > neutral_score:
        sentiment = "bullish"
        score = 0.5 + (bullish_score / total) * 0.4
    elif bearish_score > bullish_score and bearish_score > neutral_score:
        sentiment = "bearish"
        score = 0.5 - (bearish_score / total) * 0.4
    else:
        sentiment = "neutral"
        score = 0.5

    return {
        "model": "Rule-Based",
        "text": text[:200],
        "sentiment": sentiment,
        "score": float(score),
        "bullish_signals": bullish_score,
        "bearish_signals": bearish_score,
        "neutral_signals": neutral_score,
        "confidence": float(abs(score - 0.5) * 2),
        "matched_patterns": {
            "bullish": [p for p in bullish_patterns if p in text_lower],
            "bearish": [p for p in bearish_patterns if p in text_lower],
            "neutral": [p for p in neutral_patterns if p in text_lower],
        },
    }
