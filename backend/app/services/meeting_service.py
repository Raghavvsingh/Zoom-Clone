from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, and_, or_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status

from app.models.meeting import Meeting, MeetingStatus, MeetingType
from app.models.participant import Participant
from app.models.meeting_session import MeetingSession
from app.schemas.meeting import InstantMeetingCreate, ScheduledMeetingCreate
from app.utils.meeting_utils import generate_meeting_code, build_invite_link
from app.config import settings


class MeetingService:
    def _enrich_response(self, meeting: Meeting, db: Session) -> dict:
        """Convert a Meeting ORM object to a response dict with computed fields."""
        active_participants = (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.left_at == None,
            )
            .count()
        )
        host_name = meeting.host.display_name if meeting.host else "Unknown"
        return {
            "id": meeting.id,
            "meeting_code": meeting.meeting_code,
            "title": meeting.title,
            "description": meeting.description,
            "host_id": meeting.host_id,
            "host_display_name": host_name,
            "status": meeting.status,
            "meeting_type": meeting.meeting_type,
            "scheduled_at": meeting.scheduled_at,
            "duration_minutes": meeting.duration_minutes,
            "invite_link": meeting.invite_link,
            "created_at": meeting.created_at,
            "started_at": meeting.started_at,
            "ended_at": meeting.ended_at,
            "participant_count": active_participants,
        }

    def create_instant_meeting(
        self, db: Session, data: InstantMeetingCreate, host_id: int
    ) -> Meeting:
        code = generate_meeting_code(db)
        invite_link = build_invite_link(code, settings.FRONTEND_URL)
        now = datetime.now(timezone.utc)

        meeting = Meeting(
            meeting_code=code,
            title=data.title or "Instant Meeting",
            description=None,
            host_id=host_id,
            status=MeetingStatus.ACTIVE,
            meeting_type=MeetingType.INSTANT,
            scheduled_at=now,
            duration_minutes=60,
            invite_link=invite_link,
            started_at=now,
        )
        db.add(meeting)
        db.flush()

        # Add host as first and only participant initially
        host_name = data.host_display_name or "Alex Morgan"
        participant = Participant(
            meeting_id=meeting.id,
            display_name=host_name,
            is_host=True,
        )
        db.add(participant)

        # Create a meeting session
        session = MeetingSession(meeting_id=meeting.id, started_at=now, peak_participant_count=1)
        db.add(session)

        db.commit()
        db.refresh(meeting)
        return meeting

    def create_scheduled_meeting(
        self, db: Session, data: ScheduledMeetingCreate, host_id: int
    ) -> Meeting:
        code = generate_meeting_code(db)
        invite_link = build_invite_link(code, settings.FRONTEND_URL)

        # Ensure scheduled_at is timezone-aware
        scheduled_at = data.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

        meeting = Meeting(
            meeting_code=code,
            title=data.title,
            description=data.description,
            host_id=host_id,
            status=MeetingStatus.SCHEDULED,
            meeting_type=MeetingType.SCHEDULED,
            scheduled_at=scheduled_at,
            duration_minutes=data.duration_minutes,
            invite_link=invite_link,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        return meeting

    def get_meeting_by_code(self, db: Session, code: str) -> Optional[Meeting]:
        return (
            db.query(Meeting)
            .options(joinedload(Meeting.host))
            .filter(Meeting.meeting_code == code)
            .first()
        )

    def get_all_meetings(self, db: Session, host_id: int) -> List[dict]:
        meetings = (
            db.query(Meeting)
            .options(joinedload(Meeting.host))
            .filter(Meeting.host_id == host_id)
            .order_by(desc(Meeting.created_at))
            .all()
        )
        return [self._enrich_response(m, db) for m in meetings]

    def get_upcoming_meetings(self, db: Session, host_id: int) -> List[dict]:
        now = datetime.now(timezone.utc)
        meetings = (
            db.query(Meeting)
            .options(joinedload(Meeting.host))
            .filter(
                Meeting.host_id == host_id,
                Meeting.status == MeetingStatus.SCHEDULED,
                Meeting.scheduled_at > now,
            )
            .order_by(asc(Meeting.scheduled_at))
            .all()
        )
        return [self._enrich_response(m, db) for m in meetings]

    def get_recent_meetings(self, db: Session, host_id: int, limit: int = 15) -> List[dict]:
        """Returns recently ended or active meetings."""
        meetings = (
            db.query(Meeting)
            .options(joinedload(Meeting.host))
            .filter(
                Meeting.host_id == host_id,
                or_(
                    Meeting.status == MeetingStatus.ENDED,
                    Meeting.status == MeetingStatus.ACTIVE,
                ),
            )
            .order_by(desc(Meeting.created_at))
            .limit(limit)
            .all()
        )
        return [self._enrich_response(m, db) for m in meetings]

    def join_meeting(
        self, db: Session, code: str, display_name: str
    ) -> Participant:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting with code '{code}' not found.",
            )
        if meeting.status == MeetingStatus.ENDED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This meeting has already ended.",
            )

        # If meeting was scheduled and is now being joined, activate it
        if meeting.status == MeetingStatus.SCHEDULED:
            meeting.status = MeetingStatus.ACTIVE
            meeting.started_at = datetime.now(timezone.utc)
            # Create a session
            session = MeetingSession(
                meeting_id=meeting.id,
                started_at=datetime.now(timezone.utc),
                peak_participant_count=1,
            )
            db.add(session)

        # Prevent duplicate active participant entries for same name in current meeting
        existing = (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.display_name == display_name,
                Participant.left_at == None,
            )
            .first()
        )
        if existing:
            return existing

        # Determine host role
        is_host_user = False
        if meeting.host and meeting.host.display_name.strip().lower() == display_name.strip().lower():
            is_host_user = True
        elif (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.left_at == None,
            )
            .count()
            == 0
        ):
            # First attendee acts as host if no one active
            is_host_user = True

        participant = Participant(
            meeting_id=meeting.id,
            display_name=display_name,
            is_host=is_host_user,
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)
        return participant

    def leave_meeting(
        self, db: Session, code: str, participant_id: int
    ) -> bool:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        participant = (
            db.query(Participant)
            .filter(
                Participant.id == participant_id,
                Participant.meeting_id == meeting.id,
            )
            .first()
        )
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")

        participant.left_at = datetime.now(timezone.utc)

        # Count remaining active participants
        remaining = (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.left_at == None,
                Participant.id != participant_id,
            )
            .count()
        )

        if remaining == 0 and participant.is_host:
            # End meeting if host leaves and no one else remains
            meeting.status = MeetingStatus.ENDED
            meeting.ended_at = datetime.now(timezone.utc)
            # Update last session
            last_session = (
                db.query(MeetingSession)
                .filter(
                    MeetingSession.meeting_id == meeting.id,
                    MeetingSession.ended_at == None,
                )
                .order_by(desc(MeetingSession.started_at))
                .first()
            )
            if last_session:
                last_session.ended_at = datetime.now(timezone.utc)

        db.commit()
        return True

    def end_meeting(self, db: Session, code: str) -> Meeting:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        now = datetime.now(timezone.utc)
        meeting.status = MeetingStatus.ENDED
        meeting.ended_at = now

        # Leave all active participants
        db.query(Participant).filter(
            Participant.meeting_id == meeting.id,
            Participant.left_at == None,
        ).update({"left_at": now})

        # End all open sessions
        last_session = (
            db.query(MeetingSession)
            .filter(
                MeetingSession.meeting_id == meeting.id,
                MeetingSession.ended_at == None,
            )
            .first()
        )
        if last_session:
            last_session.ended_at = now

        db.commit()
        db.refresh(meeting)
        return meeting

    def get_participants(self, db: Session, code: str) -> List[Participant]:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.left_at == None,
            )
            .order_by(desc(Participant.is_host), asc(Participant.joined_at))
            .all()
        )

    def remove_participant(
        self, db: Session, code: str, participant_id: int
    ) -> bool:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        participant = (
            db.query(Participant)
            .filter(
                Participant.id == participant_id,
                Participant.meeting_id == meeting.id,
            )
            .first()
        )
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        participant.left_at = datetime.now(timezone.utc)
        db.commit()
        return True

    def mute_all_participants(self, db: Session, code: str) -> bool:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        db.query(Participant).filter(
            Participant.meeting_id == meeting.id,
            Participant.left_at == None,
            Participant.is_host == False,
        ).update({"is_muted": True})
        db.commit()
        return True

    def delete_meeting(self, db: Session, code: str) -> bool:
        meeting = self.get_meeting_by_code(db, code)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        db.delete(meeting)
        db.commit()
        return True


meeting_service = MeetingService()
