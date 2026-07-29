import os
from typing import Optional
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
    RESEND_API_KEY: str
    RESEND_FROM_EMAIL: str = "Envision 2026 TechFest <onboarding@resend.dev>"
    BREVO_API_KEY: Optional[str] = None
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
