import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE_PATH = BASE_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Tech Fest API"
    JWT_ALGORITHM: str = "HS256"
    FRONTEND_URL: str = "https://envision-2026-seven.vercel.app"
    
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    RESEND_API_KEY: str
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    RAZORPAY_KEY_ID: str = "rzp_test_TGuT8hs5QZ9uy9"
    RAZORPAY_KEY_SECRET: str = "Smb0IOLOAy5wzyp7cX2IOTqL"
    RAZORPAY_WEBHOOK_SECRET: str = "whsec_mocksecret123"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
