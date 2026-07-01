import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from ..database import get_db
from ..models import Payment, Order, User
from ..schemas import PaymentCreate, PaymentResponse
from ..auth import get_current_user
from ..services.notify import notify_user, notify_admins

router = APIRouter(prefix="/api/payments", tags=["Payments"])
logger = logging.getLogger("farmfresh.payments")


@router.get("/", response_model=list[PaymentResponse])
def list_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Payment)
        .filter(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )


@router.post("/", response_model=PaymentResponse)
def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = Payment(
        user_id=current_user.id,
        order_id=data.order_id,
        amount=data.amount,
        payment_method=data.payment_method,
        upi_provider=data.upi_provider,
        transaction_id=data.transaction_id,
        status="success",
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    if data.order_id:
        order = db.query(Order).filter(Order.id == data.order_id).first()
        if order:
            order.status = "confirmed"
        else:
            logger.warning(
                "event=payment_order_missing user_id=%s order_id=%s amount=%.2f",
                current_user.id,
                data.order_id,
                data.amount,
            )

    notify_user(db, current_user.id,
                "Payment successful",
                f"Payment of ₹{data.amount} received via {data.payment_method.upper()}.",
                "payment")
    notify_admins(db,
                  "Payment received",
                  f"{current_user.name} ({current_user.phone}) paid ₹{data.amount} via {data.payment_method.upper()}.",
                  "payment")

    db.commit()
    db.refresh(payment)
    logger.info(
        "event=payment_created payment_id=%s user_id=%s order_id=%s amount=%.2f method=%s status=%s",
        payment.id,
        current_user.id,
        data.order_id,
        data.amount,
        data.payment_method,
        payment.status,
    )
    return payment


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.user_id == current_user.id)
        .first()
    )
    if not payment:
        logger.warning("event=payment_not_found user_id=%s payment_id=%s", current_user.id, payment_id)
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment
