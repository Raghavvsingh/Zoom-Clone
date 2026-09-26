import os
import sys
from datetime import datetime, timezone, timedelta

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, create_tables
from app.models.user import User
from app.models.meeting import Meeting, MeetingStatus, MeetingType
from app.models.participant import Participant
from app.models.meeting_session import MeetingSession
from app.utils.meeting_utils import generate_meeting_code, build_invite_link
from app.config import settings


def seed_data():
    create_tables()
    db = SessionLocal()

    try:
        # Check if default user exists
        default_user = db.query(User).filter(User.is_default == True).first()
        if not default_user:
            default_user = User(
                display_name="Alex Morgan",
                email="alex.morgan@zoomclone.com",
                avatar_initials="AM",
                is_default=True,
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            print(f"Created default user: {default_user.display_name}")
        else:
            print(f"Default user already exists: {default_user.display_name}")

        print("Database seeded with default user Alex Morgan.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()

