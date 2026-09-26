from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from app.models.meeting import MeetingStatus, MeetingType
from app.schemas.participant import ParticipantResponse


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Meeting title")
    description: Optional[str] = Field(None, max_length=2000)
    scheduled_at: Optional[datetime] = None
    duration_minutes: int = Field(60, ge=1, le=1440, description="Duration in minutes")
    meeting_type: MeetingType = MeetingType.INSTANT

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be blank")
        return v.strip()

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip() or None
        return v


class InstantMeetingCreate(BaseModel):
    title: str = Field("My Meeting", min_length=1, max_length=200)
    host_display_name: Optional[str] = Field(None, max_length=100)


class ScheduledMeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    scheduled_at: datetime = Field(..., description="Meeting start time in ISO format")
    duration_minutes: int = Field(60, ge=1, le=1440)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be blank")
        return v.strip()

    @field_validator("scheduled_at")
    @classmethod
    def scheduled_at_must_be_future(cls, v: datetime) -> datetime:
        from datetime import timezone
        # Allow scheduling from now onwards - we use UTC for comparison
        now = datetime.now(timezone.utc)
        if v.tzinfo is None:
            # Treat naive datetime as UTC
            from datetime import timezone
            v = v.replace(tzinfo=timezone.utc)
        if v < now:
            raise ValueError("Scheduled time must be in the future")
        return v


class MeetingResponse(BaseModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    host_id: int
    host_display_name: Optional[str] = None
    status: MeetingStatus
    meeting_type: MeetingType
    scheduled_at: Optional[datetime] = None
    duration_minutes: int
    invite_link: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    participant_count: int = 0

    class Config:
        from_attributes = True


class MeetingDetailResponse(MeetingResponse):
    participants: List[ParticipantResponse] = []

    class Config:
        from_attributes = True


class MeetingListResponse(BaseModel):
    meetings: List[MeetingResponse]
    total: int
