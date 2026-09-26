from sqlalchemy.orm import Session
from typing import Optional
from app.models.user import User


class UserService:
    def get_default_user(self, db: Session) -> Optional[User]:
        return db.query(User).filter(User.is_default == True).first()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def create_user(
        self,
        db: Session,
        display_name: str,
        email: str,
        is_default: bool = False,
    ) -> User:
        initials = "".join(part[0].upper() for part in display_name.split()[:2])
        user = User(
            display_name=display_name,
            email=email,
            avatar_initials=initials,
            is_default=is_default,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


user_service = UserService()
