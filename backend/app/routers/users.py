from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.user_service import user_service
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    """Returns the default logged-in user."""
    user = user_service.get_default_user(db)
    if not user:
        raise HTTPException(status_code=404, detail="Default user not found. Run seed.py first.")
    return user
