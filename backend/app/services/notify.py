from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Notification, User


def notify_user(db: Session, user_id, title: str, message: str, ntype: str):
    db.add(Notification(
        user_id=user_id, title=title, type=ntype,
        channel="in_app", message=message,
        is_read=False, is_sent=True, sent_at=datetime.utcnow(),
    ))


def notify_admins(db: Session, title: str, message: str, ntype: str):
    admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()
    for admin in admins:
        db.add(Notification(
            user_id=admin.id, title=title, type=ntype,
            channel="in_app", message=message,
            is_read=False, is_sent=True, sent_at=datetime.utcnow(),
        ))
