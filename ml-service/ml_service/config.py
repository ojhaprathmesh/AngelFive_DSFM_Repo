import os


class Config:
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    LSTM_MODEL_PATH = os.getenv("LSTM_MODEL_PATH", "model_assets/lstm_timeseries.pt")
    FINBERT_MODEL_NAME = os.getenv("FINBERT_MODEL_NAME", "ProsusAI/finbert")
