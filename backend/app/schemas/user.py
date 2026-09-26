from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    display_name: str
    email: str


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    avatar_initials: Optional[str] = None
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True
