import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

logger = logging.getLogger("database")

def get_engine():
    db_url = settings.DATABASE_URL

    if db_url.startswith("sqlite:///"):
        # Extract file path
        raw_path = db_url.replace("sqlite:///", "")
        
        # Check directory writability
        target_dir = os.path.dirname(raw_path) if raw_path.startswith("/") else os.path.dirname(os.path.abspath(raw_path))
        
        if target_dir:
            try:
                os.makedirs(target_dir, exist_ok=True)
                test_file = os.path.join(target_dir, ".test_write")
                with open(test_file, "w") as f:
                    f.write("1")
                os.remove(test_file)
            except Exception as e:
                logger.warning(f"Database directory '{target_dir}' not writable ({e}). Falling back to local './zoom_clone.db'.")
                db_url = "sqlite:///./zoom_clone.db"

    return create_engine(
        db_url,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
        echo=False,
    )

engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
