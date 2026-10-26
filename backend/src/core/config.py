from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Financial Dashboard API"
    VERSION: str = "0.1.0"
    
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    
    BRAPI_TOKEN: str = ""
    CRON_SECRET: str
    TELEGRAM_BOT_TOKEN: str = ""
    
    GOOGLE_DRIVE_FOLDER_ID: str = ""
    GOOGLE_SHEET_ID: str = ""
    GOOGLE_CREDENTIALS_FILE: str = "../ficancas-0bdc8ab4dc02.json"

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    BACKGROUND_WORKERS_ENABLED: bool = False
    
    # Set to False in production to disable /api/docs and /openapi.json
    DOCS_ENABLED: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
