import logging
import random
import string
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from ..database import get_db
from ..models import Order, OrderItem, Delivery, Product, User
from ..schemas import OrderCreate, OrderResponse
from ..auth import get_current_user
from ..services.notify import notify_user, notify_admins

router = APIRouter(prefix="/api/orders", tags=["Orders"])
logger = logging.getLogger("farmfresh.orders")


def generate_order_number() -> str:
    chars = string.ascii_uppercase + string.digits
    return "FF-" + "".join(random.choices(chars, k=8))


@router.post("/", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        logger.warning(
            "event=order_product_missing user_id=%s product_id=%s",
            current_user.id,
            data.product_id,
        )
        raise HTTPException(status_code=404, detail="Product not found")

    total = float(product.price_per_day) * data.quantity
    order = Order(
        order_number=generate_order_number(),
        user_id=current_user.id,
        delivery_date=data.delivery_date,
        total_amount=total,
        status="pending",
    )
    db.add(order)
    db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        quantity=data.quantity,
        unit_price=float(product.price_per_day),
        total_price=total,
    )
    db.add(item)
    notify_user(db, current_user.id,
                "Order placed",
                f"Your order {order.order_number} for {product.name} (x{data.quantity}) has been placed. Total: ₹{total:.0f}.",
                "order")
    notify_admins(db,
                  "New order received",
                  f"{current_user.name} ({current_user.phone}) ordered {product.name} x{data.quantity} — ₹{total:.0f}. Order: {order.order_number}.",
                  "order")
    db.commit()
    db.refresh(order)
    logger.info(
        "event=order_created order_id=%s order_number=%s user_id=%s product_id=%s quantity=%s total=%.2f",
        order.id,
        order.order_number,
        current_user.id,
        product.id,
        data.quantity,
        total,
    )
    return order


@router.get("/", response_model=list[OrderResponse])
def list_orders(
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.delivery).joinedload(Delivery.delivery_partner),
        )
        .filter(Order.user_id == current_user.id)
    )
    if status:
        query = query.filter(Order.status == status)
    return query.order_by(Order.delivery_date.desc()).all()


@router.get("/today/deliveries", response_model=list[OrderResponse])
def todays_deliveries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Order)
        .filter(
            Order.user_id == current_user.id,
            Order.delivery_date == date.today(),
        )
        .all()
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
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
        logger.warning("event=order_not_found user_id=%s order_id=%s", current_user.id, order_id)
        raise HTTPException(status_code=404, detail="Order not found")
    return order
