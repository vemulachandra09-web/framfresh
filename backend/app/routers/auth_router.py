import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, UserResponse, UserUpdate, Token
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..logging_config import mask_phone

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
logger = logging.getLogger("farmfresh.auth")


_login_attempts: dict[str, list] = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 300


def _check_rate_limit(phone: str):
    import time
    now = time.time()
    attempts = _login_attempts.get(phone, [])
    attempts = [t for t in attempts if now - t < LOCKOUT_SECONDS]
    _login_attempts[phone] = attempts
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        logger.warning("event=login_rate_limited phone=%s", mask_phone(phone))
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Try again after {LOCKOUT_SECONDS // 60} minutes",
        )


def _record_failed_attempt(phone: str):
    import time
    _login_attempts.setdefault(phone, []).append(time.time())


def _clear_attempts(phone: str):
    _login_attempts.pop(phone, None)


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == user_data.phone).first():
        logger.warning("event=register_duplicate_phone phone=%s", mask_phone(user_data.phone))
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if user_data.email and db.query(User).filter(User.email == user_data.email).first():
        logger.warning("event=register_duplicate_email phone=%s", mask_phone(user_data.phone))
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        address=user_data.address,
        city=user_data.city,
        pincode=user_data.pincode,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(
        "event=user_registered user_id=%s phone=%s role=%s",
        user.id,
        mask_phone(user.phone),
        user.role,
    )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    _check_rate_limit(credentials.phone)

    user = db.query(User).filter(User.phone == credentials.phone).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        _record_failed_attempt(credentials.phone)
        logger.warning("event=login_failed phone=%s", mask_phone(credentials.phone))
        raise HTTPException(status_code=401, detail="Invalid phone number or password")

    if not user.is_active:
        logger.warning(
            "event=login_inactive_user user_id=%s phone=%s",
            user.id,
            mask_phone(user.phone),
        )
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact support")

    _clear_attempts(credentials.phone)
    logger.info(
        "event=login_success user_id=%s phone=%s role=%s",
        user.id,
        mask_phone(user.phone),
        user.role,
    )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    logger.info("event=user_profile_updated user_id=%s", current_user.id)
    return current_user
