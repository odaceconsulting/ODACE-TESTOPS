"""
Configuration centralisée de l'API ODACE TestOps.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "ODACE TestOps API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Sécurité & JWT
    SECRET_KEY: str = "insecure-secret-key-for-dev-environment-odace-testops-32b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # Services
    DATABASE_URL: str = "postgresql+asyncpg://odace_app:odace_pass@localhost:5433/odace_testops"
    REDIS_URL: str = "redis://localhost:6379/0"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "odace-artifacts"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
