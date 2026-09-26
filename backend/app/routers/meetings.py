from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.services.meeting_service import meeting_service
from app.services.user_service import user_service
from app.schemas.meeting import (
    MeetingResponse,
    MeetingDetailResponse,
    MeetingListResponse,
    InstantMeetingCreate,
    ScheduledMeetingCreate,
)
from app.schemas.participant import ParticipantResponse, JoinMeetingRequest

router = APIRouter(tags=["meetings"])



def get_default_user_id(db: Session) -> int:
    user = user_service.get_default_user(db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default user not configured. Run seed.py first.",
        )
    return user.id


@router.get("", response_model=MeetingListResponse)
def list_all_meetings(db: Session = Depends(get_db)):
    host_id = get_default_user_id(db)
    meetings = meeting_service.get_all_meetings(db, host_id)
    return {"meetings": meetings, "total": len(meetings)}


@router.get("/upcoming", response_model=MeetingListResponse)
def get_upcoming_meetings(db: Session = Depends(get_db)):
    host_id = get_default_user_id(db)
    meetings = meeting_service.get_upcoming_meetings(db, host_id)
    return {"meetings": meetings, "total": len(meetings)}


@router.get("/recent", response_model=MeetingListResponse)
def get_recent_meetings(db: Session = Depends(get_db)):
    host_id = get_default_user_id(db)
    meetings = meeting_service.get_recent_meetings(db, host_id)
    return {"meetings": meetings, "total": len(meetings)}


@router.post("/instant", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(
    data: InstantMeetingCreate,
    db: Session = Depends(get_db),
):
    host_id = get_default_user_id(db)
    meeting = meeting_service.create_instant_meeting(db, data, host_id)
    return meeting_service._enrich_response(meeting, db)


@router.post("/schedule", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def schedule_meeting(
    data: ScheduledMeetingCreate,
    db: Session = Depends(get_db),
):
    host_id = get_default_user_id(db)
    meeting = meeting_service.create_scheduled_meeting(db, data, host_id)
    return meeting_service._enrich_response(meeting, db)


@router.get("/{meeting_code}", response_model=MeetingDetailResponse)
def get_meeting(meeting_code: str, db: Session = Depends(get_db)):
    meeting = meeting_service.get_meeting_by_code(db, meeting_code)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_code}' not found.",
        )
    enriched = meeting_service._enrich_response(meeting, db)
    enriched["participants"] = meeting_service.get_participants(db, meeting_code)
    return enriched


@router.delete("/{meeting_code}")
def delete_meeting(meeting_code: str, db: Session = Depends(get_db)):
    meeting_service.delete_meeting(db, meeting_code)
    return {"message": "Meeting deleted"}


@router.post("/{meeting_code}/join", response_model=ParticipantResponse)
def join_meeting(
    meeting_code: str,
    data: JoinMeetingRequest,
    db: Session = Depends(get_db),
):
    participant = meeting_service.join_meeting(db, meeting_code, data.display_name)
    return participant


@router.post("/{meeting_code}/leave")
def leave_meeting(
    meeting_code: str,
    participant_id: int,
    db: Session = Depends(get_db),
):
    meeting_service.leave_meeting(db, meeting_code, participant_id)
    return {"message": "Left meeting successfully"}


@router.post("/{meeting_code}/end", response_model=MeetingResponse)
def end_meeting(meeting_code: str, db: Session = Depends(get_db)):
    meeting = meeting_service.end_meeting(db, meeting_code)
    return meeting_service._enrich_response(meeting, db)


@router.get("/{meeting_code}/participants", response_model=List[ParticipantResponse])
def list_participants(meeting_code: str, db: Session = Depends(get_db)):
    return meeting_service.get_participants(db, meeting_code)


@router.delete("/{meeting_code}/participants/{participant_id}")
def remove_participant(
    meeting_code: str,
    participant_id: int,
    db: Session = Depends(get_db),
):
    meeting_service.remove_participant(db, meeting_code, participant_id)
    return {"message": "Participant removed"}


@router.post("/{meeting_code}/mute-all")
def mute_all_participants(meeting_code: str, db: Session = Depends(get_db)):
    meeting_service.mute_all_participants(db, meeting_code)
    return {"message": "All participants muted"}
