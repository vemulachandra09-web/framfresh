import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from ..database import get_db
from ..models import Subscription, SkipDate, Product, User
from ..schemas import SubscriptionCreate, SubscriptionResponse, SubscriptionPause, SkipDateCreate, SkipDateResponse
from ..auth import get_current_user
from ..services.notify import notify_user, notify_admins

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])
logger = logging.getLogger("farmfresh.subscriptions")


@router.get("/", response_model=list[SubscriptionResponse])
def list_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Subscription)
        .options(joinedload(Subscription.product), joinedload(Subscription.skip_dates))
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .all()
    )


@router.post("/", response_model=SubscriptionResponse)
def create_subscription(
    data: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        logger.warning(
            "event=subscription_product_missing user_id=%s product_id=%s",
            current_user.id,
            data.product_id,
        )
        raise HTTPException(status_code=404, detail="Product not found")

    subscription = Subscription(
        user_id=current_user.id,
        product_id=data.product_id,
        quantity=data.quantity,
        billing_cycle=data.billing_cycle,
        start_date=data.start_date,
        delivery_time=data.delivery_time,
    )
    db.add(subscription)
    notify_user(db, current_user.id,
                "Subscription started",
                f"Your {product.name} subscription starts on {data.start_date}. {data.quantity}x {data.billing_cycle}.",
                "subscription")
    notify_admins(db,
                  "New subscription",
                  f"{current_user.name} ({current_user.phone}) subscribed to {product.name} — {data.quantity}x {data.billing_cycle}, starting {data.start_date}.",
                  "subscription")
    db.commit()
    logger.info(
        "event=subscription_created subscription_id=%s user_id=%s product_id=%s quantity=%s billing_cycle=%s",
        subscription.id,
        current_user.id,
        data.product_id,
        data.quantity,
        data.billing_cycle,
    )
    return (
        db.query(Subscription)
        .options(joinedload(Subscription.product), joinedload(Subscription.skip_dates))
        .filter(Subscription.id == subscription.id)
        .first()
    )


@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription(
    sub_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=subscription_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.post("/{sub_id}/pause", response_model=SubscriptionResponse)
def pause_subscription(
    sub_id: UUID,
    pause_data: SubscriptionPause,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=subscription_pause_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status != "active":
        logger.warning(
            "event=subscription_pause_invalid_status user_id=%s subscription_id=%s status=%s",
            current_user.id,
            sub_id,
            sub.status,
        )
        raise HTTPException(status_code=400, detail="Only active subscriptions can be paused")

    sub.status = "paused"
    sub.paused_from = pause_data.paused_from
    sub.paused_until = pause_data.paused_until
    db.commit()
    db.refresh(sub)
    logger.info(
        "event=subscription_paused subscription_id=%s user_id=%s paused_from=%s paused_until=%s",
        sub.id,
        current_user.id,
        sub.paused_from,
        sub.paused_until,
    )
    return sub


@router.post("/{sub_id}/resume", response_model=SubscriptionResponse)
def resume_subscription(
    sub_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=subscription_resume_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status != "paused":
        logger.warning(
            "event=subscription_resume_invalid_status user_id=%s subscription_id=%s status=%s",
            current_user.id,
            sub_id,
            sub.status,
        )
        raise HTTPException(status_code=400, detail="Only paused subscriptions can be resumed")

    sub.status = "active"
    sub.paused_from = None
    sub.paused_until = None
    db.commit()
    db.refresh(sub)
    logger.info("event=subscription_resumed subscription_id=%s user_id=%s", sub.id, current_user.id)
    return sub


@router.post("/{sub_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    sub_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=subscription_cancel_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")

    sub.status = "cancelled"
    db.commit()
    db.refresh(sub)
    logger.info("event=subscription_cancelled subscription_id=%s user_id=%s", sub.id, current_user.id)
    return sub


@router.get("/{sub_id}/skip-dates", response_model=list[SkipDateResponse])
def list_skip_dates(
    sub_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=skip_dates_subscription_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")
    return db.query(SkipDate).filter(SkipDate.subscription_id == sub_id).order_by(SkipDate.skip_date).all()


@router.post("/{sub_id}/skip-dates", response_model=list[SkipDateResponse])
def add_skip_dates(
    sub_id: UUID,
    data: SkipDateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=skip_dates_add_subscription_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status == "cancelled":
        logger.warning("event=skip_dates_add_cancelled_subscription user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=400, detail="Cannot skip dates on cancelled subscription")

    from datetime import date as date_type
    today = date_type.today()
    existing = {
        row.skip_date
        for row in db.query(SkipDate).filter(SkipDate.subscription_id == sub_id).all()
    }

    added = []
    for d in data.dates:
        if d <= today:
            continue
        if d in existing:
            continue
        skip = SkipDate(subscription_id=sub_id, skip_date=d)
        db.add(skip)
        added.append(skip)

    db.commit()
    for s in added:
        db.refresh(s)
    logger.info(
        "event=skip_dates_added subscription_id=%s user_id=%s requested=%s added=%s",
        sub_id,
        current_user.id,
        len(data.dates),
        len(added),
    )
    return added


@router.delete("/{sub_id}/skip-dates/{skip_id}")
def remove_skip_date(
    sub_id: UUID,
    skip_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub_id, Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        logger.warning("event=skip_date_remove_subscription_not_found user_id=%s subscription_id=%s", current_user.id, sub_id)
        raise HTTPException(status_code=404, detail="Subscription not found")
    skip = db.query(SkipDate).filter(SkipDate.id == skip_id, SkipDate.subscription_id == sub_id).first()
    if not skip:
        logger.warning("event=skip_date_not_found user_id=%s subscription_id=%s skip_id=%s", current_user.id, sub_id, skip_id)
        raise HTTPException(status_code=404, detail="Skip date not found")
    db.delete(skip)
    db.commit()
    logger.info("event=skip_date_removed subscription_id=%s user_id=%s skip_id=%s", sub_id, current_user.id, skip_id)
    return {"message": "Skip date removed"}
