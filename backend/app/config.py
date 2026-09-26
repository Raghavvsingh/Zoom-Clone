from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database — Railway provides a persistent /data volume.
    # Default to a local path for development.
    DATABASE_URL: str = "sqlite:///./zoom_clone.db"

    # The deployed Vercel frontend URL (set this env var on Railway)
    FRONTEND_URL: str = "http://localhost:3000"

    # Comma-separated list of extra allowed CORS origins (optional)
    EXTRA_CORS_ORIGINS: str = ""

    APP_ENV: str = "development"

    @property
    def cors_origins(self) -> List[str]:
        """Build the full CORS allow-list from env vars."""
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        # Add the configured Vercel frontend URL
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        # Support wildcard *.vercel.app subdomains
        origins.append("https://*.vercel.app")
        # Any extra origins passed as comma-separated string
        if self.EXTRA_CORS_ORIGINS:
            for o in self.EXTRA_CORS_ORIGINS.split(","):
                o = o.strip()
                if o and o not in origins:
                    origins.append(o)
        return origins

    class Config:
        env_file = ".env"


settings = Settings()
