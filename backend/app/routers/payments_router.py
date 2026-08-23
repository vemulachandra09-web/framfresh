import calendar
import logging
import random
import string
from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..database import get_db
from ..models import Invoice, Order, Payment, SkipDate, Subscription, User
from ..schemas import PaymentCreate, PaymentResponse
from ..services.notify import notify_admins, notify_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])
logger = logging.getLogger("farmfresh.payments")


def _next_invoice_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"INV-{suffix}"


def _add_month(d: date) -> date:
    month = d.month + 1
    year = d.year
    if month == 13:
        month = 1
        year += 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _period_end(start: date, billing_cycle: str) -> date:
    if billing_cycle == "weekly":
        return start + timedelta(days=6)
    if billing_cycle == "monthly":
        return _add_month(start) - timedelta(days=1)
    return start + timedelta(days=29)


def _billable_days(db: Session, sub: Subscription, start: date, end: date) -> int:
    if end < start:
        return 0
    skipped = (
        db.query(SkipDate)
        .filter(
            SkipDate.subscription_id == sub.id,
            SkipDate.skip_date >= start,
            SkipDate.skip_date <= end,
        )
        .count()
    )
    return max(0, (end - start).days + 1 - skipped)


def _subscription_period_start(sub: Subscription) -> date:
    if sub.paid_until:
        return sub.paid_until + timedelta(days=1)
    return sub.start_date


@router.get("/", response_model=list[PaymentResponse])
def list_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Payment)
        .options(
            joinedload(Payment.subscription).joinedload(Subscription.product),
            joinedload(Payment.invoice),
        )
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
    if data.subscription_id and data.order_id:
        raise HTTPException(status_code=400, detail="Pay either an order or a subscription, not both")

    subscription = None
    invoice = None
    billing_period_start = None
    billing_period_end = None
    amount = data.amount

    if data.subscription_id:
        subscription = (
            db.query(Subscription)
            .options(joinedload(Subscription.product))
            .filter(Subscription.id == data.subscription_id, Subscription.user_id == current_user.id)
            .first()
        )
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        if subscription.status == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot pay a cancelled subscription")

        billing_period_start = _subscription_period_start(subscription)
        full_period_end = _period_end(billing_period_start, subscription.billing_cycle)
        effective_end = date.today()
        if subscription.status == "paused" and subscription.paused_from:
            effective_end = subscription.paused_from
        if subscription.end_date and effective_end > subscription.end_date:
            effective_end = subscription.end_date
        billing_period_end = min(full_period_end, effective_end)

        days = _billable_days(db, subscription, billing_period_start, billing_period_end)
        amount = float(subscription.product.price_per_day) * subscription.quantity * days
        if amount <= 0:
            raise HTTPException(status_code=400, detail="No subscription amount is due")

        invoice = (
            db.query(Invoice)
            .filter(
                Invoice.subscription_id == subscription.id,
                Invoice.billing_period_start == billing_period_start,
                Invoice.billing_period_end == billing_period_end,
            )
            .first()
        )
        if not invoice:
            invoice = Invoice(
                invoice_number=_next_invoice_number(),
                user_id=current_user.id,
                subscription_id=subscription.id,
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                total_amount=amount,
                status="unpaid",
                due_date=billing_period_end,
            )
            db.add(invoice)
            db.flush()

    payment = Payment(
        user_id=current_user.id,
        order_id=data.order_id,
        subscription_id=data.subscription_id,
        invoice_id=invoice.id if invoice else None,
        billing_period_start=billing_period_start,
        billing_period_end=billing_period_end,
        amount=amount,
        payment_method=data.payment_method,
        upi_provider=data.upi_provider,
        transaction_id=data.transaction_id,
        status="success",
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    if invoice and subscription:
        invoice.status = "paid"
        invoice.paid_at = payment.paid_at
        subscription.paid_until = billing_period_end

    if data.order_id:
        order = db.query(Order).filter(Order.id == data.order_id).first()
        if order:
            order.status = "confirmed"
        else:
            logger.warning(
                "event=payment_order_missing user_id=%s order_id=%s amount=%.2f",
                current_user.id,
                data.order_id,
                amount,
            )

    notify_user(
        db,
        current_user.id,
        "Payment successful",
        f"Payment of Rs {amount:.2f} received via {data.payment_method.upper()}.",
        "payment",
    )
    notify_admins(
        db,
        "Payment received",
        f"{current_user.name} ({current_user.phone}) paid Rs {amount:.2f} via {data.payment_method.upper()}.",
        "payment",
    )

    db.commit()
    db.refresh(payment)
    logger.info(
        "event=payment_created payment_id=%s user_id=%s order_id=%s subscription_id=%s amount=%.2f method=%s status=%s",
        payment.id,
        current_user.id,
        data.order_id,
        data.subscription_id,
        amount,
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
        .options(
            joinedload(Payment.subscription).joinedload(Subscription.product),
            joinedload(Payment.invoice),
        )
        .filter(Payment.id == payment_id, Payment.user_id == current_user.id)
        .first()
    )
    if not payment:
        logger.warning("event=payment_not_found user_id=%s payment_id=%s", current_user.id, payment_id)
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment
