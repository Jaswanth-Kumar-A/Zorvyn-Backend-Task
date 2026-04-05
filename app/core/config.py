import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=ROOT_DIR / ".env", override=True)


@dataclass
class Settings:
    database_url_raw: str | None = os.getenv("DATABASE_URL")
    mysql_host: str = os.getenv("MYSQL_HOST", "localhost")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = os.getenv("MYSQL_USER", "root")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "finance_dashboard")
    cors_origins_raw: str = os.getenv("CORS_ORIGINS", "*")
    demo_auth_bypass_raw: str = os.getenv("DEMO_AUTH_BYPASS", "true")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change_me_in_production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    @property
    def database_url(self) -> str:
        if self.database_url_raw and self.database_url_raw.strip():
            return self.database_url_raw.strip()

        safe_user = quote_plus(self.mysql_user)
        safe_password = quote_plus(self.mysql_password)
        if self.mysql_host and self.mysql_user and self.mysql_database:
            return (
                "mysql+pymysql://"
                f"{safe_user}:{safe_password}"
                f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            )

        return "sqlite:///./finance_dashboard.db"

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]
        return origins or ["*"]

    @property
    def demo_auth_bypass(self) -> bool:
        return self.demo_auth_bypass_raw.strip().lower() in {"1", "true", "yes", "on"}


settings = Settings()
