import logging
import random
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import EmailOtpRequest, EmailOtpVerify, UserCreate, UserLogin, UserResponse, UserUpdate, Token
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..config import settings
from ..logging_config import mask_phone

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
logger = logging.getLogger("farmfresh.auth")


_login_attempts: dict[str, list] = {}
_email_otps: dict[str, dict] = {}
_verified_emails: dict[str, datetime] = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 300
OTP_EXPIRE_MINUTES = 10
EMAIL_VERIFICATION_EXPIRE_MINUTES = 30


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _cleanup_email_codes():
    now = datetime.utcnow()
    for email, data in list(_email_otps.items()):
        if data["expires_at"] < now:
            _email_otps.pop(email, None)
    for email, expires_at in list(_verified_emails.items()):
        if expires_at < now:
            _verified_emails.pop(email, None)


def _send_otp_email(email: str, otp: str) -> bool:
    if not settings.smtp_host:
        logger.warning("event=email_otp_dev email=%s otp=%s", email, otp)
        return False

    msg = EmailMessage()
    msg["Subject"] = "Your FarmFresh verification code"
    msg["From"] = settings.smtp_from_email or settings.smtp_username
    msg["To"] = email
    msg.set_content(
        f"Your FarmFresh email verification code is {otp}.\n\n"
        f"This code expires in {OTP_EXPIRE_MINUTES} minutes."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(msg)
    return True


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


@router.post("/email-otp/send")
def send_email_otp(payload: EmailOtpRequest, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    _cleanup_email_codes()
    otp = f"{random.randint(0, 999999):06d}"
    _email_otps[email] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES),
    }

    sent = _send_otp_email(email, otp)
    response = {"detail": "OTP sent to your email"}
    if not sent:
        response["dev_otp"] = otp
    return response


@router.post("/email-otp/verify")
def verify_email_otp(payload: EmailOtpVerify):
    email = _normalize_email(payload.email)
    _cleanup_email_codes()
    saved = _email_otps.get(email)
    if not saved or saved["otp"] != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    _email_otps.pop(email, None)
    _verified_emails[email] = datetime.utcnow() + timedelta(minutes=EMAIL_VERIFICATION_EXPIRE_MINUTES)
    return {"detail": "Email verified"}


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    _cleanup_email_codes()
    if not user_data.email:
        raise HTTPException(status_code=400, detail="Email is required")
    if user_data.email:
        email = _normalize_email(str(user_data.email))
        if _verified_emails.get(email) is None:
            raise HTTPException(status_code=400, detail="Please verify your email OTP before registering")
        user_data.email = email

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
    if user_data.email:
        _verified_emails.pop(user_data.email, None)

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
