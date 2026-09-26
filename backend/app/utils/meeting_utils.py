import random
import string
from sqlalchemy.orm import Session
from app.models.meeting import Meeting


def generate_meeting_code(db: Session) -> str:
    """
    Generates a unique 9-digit meeting code formatted as 'XXX-XXX-XXX'.
    Checks the database to ensure uniqueness.
    Retries up to 10 times before raising an exception.
    """
    for _ in range(10):
        digits = "".join(random.choices(string.digits, k=9))
        code = f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
        exists = db.query(Meeting).filter(Meeting.meeting_code == code).first()
        if not exists:
            return code
    raise RuntimeError("Failed to generate a unique meeting code after 10 attempts")


def build_invite_link(meeting_code: str, base_url: str = "http://localhost:3000") -> str:
    """Constructs the shareable invite URL for a meeting."""
    return f"{base_url}/join/{meeting_code}"
