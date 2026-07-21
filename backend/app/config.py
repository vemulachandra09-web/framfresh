from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://farmfresh:farmfresh123@localhost:5432/farmfresh"
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    whatsapp_api_url: str = "https://graph.facebook.com/v18.0"
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""
    whatsapp_verify_token: str = "farmfresh_whatsapp_verify_2026"
    redis_url: str = "redis://localhost:6379/0"
    log_level: str = "INFO"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
