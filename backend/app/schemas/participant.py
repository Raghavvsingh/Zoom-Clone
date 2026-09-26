from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class JoinMeetingRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100, description="Participant display name")

    class __validators__:
        pass

    from pydantic import field_validator

    @field_validator("display_name")
    @classmethod
    def display_name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Display name cannot be blank")
        return v.strip()


class ParticipantResponse(BaseModel):
    id: int
    meeting_id: int
    display_name: str
    is_host: bool
    is_muted: bool
    is_video_off: bool
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ParticipantUpdate(BaseModel):
    is_muted: Optional[bool] = None
    is_video_off: Optional[bool] = None
