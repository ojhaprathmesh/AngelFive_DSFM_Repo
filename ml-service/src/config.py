import os


class Config:
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    # ProsusAI/finbert is ~440MB (too big for 512MB RAM free tier)
    # mrm8488/distilbert-finetuned-financial-news-sentiment-analysis is ~260MB
    FINBERT_MODEL_NAME = os.getenv("FINBERT_MODEL_NAME", "mrm8488/distilbert-finetuned-financial-news-sentiment-analysis")
    WARMUP_ENABLED = os.getenv("ML_WARMUP_ENABLED", "false").lower() == "true"
