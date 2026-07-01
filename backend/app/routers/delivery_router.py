from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from ..database import get_db
from ..models import Delivery, DeliveryRating, Order, User
from ..schemas import DeliveryResponse, DeliveryUpdate, DeliveryRatingCreate, DeliveryRatingResponse
from ..auth import get_current_user
from ..services.notify import notify_user, notify_admins

router = APIRouter(prefix="/api/deliveries", tags=["Deliveries"])


@router.get("/track/{order_id}", response_model=DeliveryResponse)
def track_delivery(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    delivery = db.query(Delivery).filter(Delivery.order_id == order_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery tracking not available")
    return delivery


@router.put("/{delivery_id}", response_model=DeliveryResponse)
def update_delivery_status(
    delivery_id: UUID,
    data: DeliveryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    if current_user.role not in ("admin", "delivery_partner"):
        raise HTTPException(status_code=403, detail="Not authorized")

    delivery.status = data.status
    if data.latitude:
        delivery.latitude = data.latitude
    if data.longitude:
        delivery.longitude = data.longitude
    if data.notes:
        delivery.notes = data.notes

    order = db.query(Order).filter(Order.id == delivery.order_id).first()

    if data.status == "on_the_way" and order:
        notify_user(db, order.user_id,
                    "Delivery on the way!",
                    f"Your order {order.order_number} is on the way. ETA: {delivery.estimated_time or 15} mins.",
                    "delivery")

    if data.status == "delivered":
        delivery.delivered_at = datetime.utcnow()
        if order:
            order.status = "delivered"
            notify_user(db, order.user_id,
                        "Delivery completed",
                        f"Order {order.order_number} has been delivered. Tap to rate your experience!",
                        "delivery")

    db.commit()
    db.refresh(delivery)
    return delivery


@router.post("/{delivery_id}/rate", response_model=DeliveryRatingResponse)
def rate_delivery(
    delivery_id: UUID,
    data: DeliveryRatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delivery = (
        db.query(Delivery)
        .options(joinedload(Delivery.order))
        .filter(Delivery.id == delivery_id)
        .first()
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery.order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your delivery")
    if delivery.status != "delivered":
        raise HTTPException(status_code=400, detail="Can only rate delivered orders")

    existing = db.query(DeliveryRating).filter(DeliveryRating.delivery_id == delivery_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already rated this delivery")

    rating = DeliveryRating(
        delivery_id=delivery_id,
        user_id=current_user.id,
        quality_rating=data.quality_rating,
        timing_rating=data.timing_rating,
        comment=data.comment,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/{delivery_id}/rating", response_model=DeliveryRatingResponse)
def get_rating(
    delivery_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rating = db.query(DeliveryRating).filter(DeliveryRating.delivery_id == delivery_id).first()
    if not rating:
        raise HTTPException(status_code=404, detail="No rating found")
    return rating
