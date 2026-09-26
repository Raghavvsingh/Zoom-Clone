from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, Enum, func
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ENDED = "ended"


class MeetingType(str, enum.Enum):
    INSTANT = "instant"
    SCHEDULED = "scheduled"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String(15), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(
        Enum(MeetingStatus),
        default=MeetingStatus.SCHEDULED,
        nullable=False,
        index=True,
    )
    meeting_type = Column(
        Enum(MeetingType),
        default=MeetingType.INSTANT,
        nullable=False,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=60)
    invite_link = Column(String(500), nullable=True)
    is_waiting_room_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    host = relationship("User", back_populates="hosted_meetings", foreign_keys=[host_id])
    participants = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan"
    )
    sessions = relationship(
        "MeetingSession", back_populates="meeting", cascade="all, delete-orphan"
    )
