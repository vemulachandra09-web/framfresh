from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from ..database import get_db
from ..models import Subscription, SkipDate, Product, User
from ..schemas import SubscriptionCreate, SubscriptionResponse, SubscriptionPause, SkipDateCreate, SkipDateResponse
from ..auth import get_current_user
from ..services.notify import notify_user, notify_admins

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


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
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status != "active":
        raise HTTPException(status_code=400, detail="Only active subscriptions can be paused")

    sub.status = "paused"
    sub.paused_from = pause_data.paused_from
    sub.paused_until = pause_data.paused_until
    db.commit()
    db.refresh(sub)
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
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status != "paused":
        raise HTTPException(status_code=400, detail="Only paused subscriptions can be resumed")

    sub.status = "active"
    sub.paused_from = None
    sub.paused_until = None
    db.commit()
    db.refresh(sub)
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
        raise HTTPException(status_code=404, detail="Subscription not found")

    sub.status = "cancelled"
    db.commit()
    db.refresh(sub)
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
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status == "cancelled":
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
        raise HTTPException(status_code=404, detail="Subscription not found")
    skip = db.query(SkipDate).filter(SkipDate.id == skip_id, SkipDate.subscription_id == sub_id).first()
    if not skip:
        raise HTTPException(status_code=404, detail="Skip date not found")
    db.delete(skip)
    db.commit()
    return {"message": "Skip date removed"}
