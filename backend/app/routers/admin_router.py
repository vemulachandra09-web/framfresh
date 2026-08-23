from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from ..database import get_db
from ..models import User, Subscription, SkipDate, Order, OrderItem, Payment, Delivery, DeliveryRating, Product
from ..schemas import (
    DashboardStats, OrderResponse, UserResponse,
    SubscriptionResponse, DeliveryResponse, DeliveryListResponse, ProductResponse,
    PaymentResponse,
)
from ..auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(admin=Depends(require_admin), db: Session = Depends(get_db)):
    total_customers = db.query(User).filter(User.role == "customer").count()
    active_subs = db.query(Subscription).filter(Subscription.status == "active").count()
    todays_orders = db.query(Order).filter(Order.delivery_date == date.today()).count()

    month_start = date.today().replace(day=1)
    monthly_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == "success", Payment.paid_at >= month_start)
        .scalar()
    )

    recent = (
        db.query(Order)
        .options(
            joinedload(Order.user),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardStats(
        total_customers=total_customers,
        active_subscriptions=active_subs,
        todays_orders=todays_orders,
        monthly_revenue=float(monthly_revenue),
        recent_orders=recent,
    )


@router.get("/customers", response_model=list[UserResponse])
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(User)
        .filter(User.role == "customer")
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
def list_all_subscriptions(
    status: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Subscription).options(joinedload(Subscription.user), joinedload(Subscription.product), joinedload(Subscription.skip_dates))
    if status:
        query = query.filter(Subscription.status == status)
    return query.offset((page - 1) * limit).limit(limit).all()


@router.get("/orders", response_model=list[OrderResponse])
def list_all_orders(
    status: str = None,
    delivery_date: date = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Order).options(
        joinedload(Order.user),
        joinedload(Order.items).joinedload(OrderItem.product),
    )
    if status:
        query = query.filter(Order.status == status)
    if delivery_date:
        query = query.filter(Order.delivery_date == delivery_date)
    return query.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit).all()


@router.get("/payments", response_model=list[PaymentResponse])
def list_all_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(Payment)
        .options(
            joinedload(Payment.user),
            joinedload(Payment.subscription).joinedload(Subscription.product),
            joinedload(Payment.invoice),
        )
        .order_by(Payment.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


@router.get("/deliveries", response_model=list[DeliveryListResponse])
def list_all_deliveries(
    status: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Delivery).options(
        joinedload(Delivery.order).joinedload(Order.user),
        joinedload(Delivery.delivery_partner),
        joinedload(Delivery.rating),
    )
    if status:
        query = query.filter(Delivery.status == status)
    deliveries = query.order_by(Delivery.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    results = []
    for d in deliveries:
        resp = DeliveryListResponse.model_validate(d)
        if d.order:
            resp.order_number = d.order.order_number
            resp.customer_name = d.order.user.name if d.order.user else None
        results.append(resp)
    return results


@router.post("/generate-orders")
def generate_daily_orders(admin=Depends(require_admin), db: Session = Depends(get_db)):
    import random, string
    today = date.today()
    active_subs = db.query(Subscription).filter(Subscription.status == "active").all()
    created = 0
    skipped = 0
    for sub in active_subs:
        is_skipped = db.query(SkipDate).filter(
            SkipDate.subscription_id == sub.id, SkipDate.skip_date == today
        ).first()
        if is_skipped:
            skipped += 1
            continue
        existing = (
            db.query(Order)
            .filter(Order.subscription_id == sub.id, Order.delivery_date == today)
            .first()
        )
        if existing:
            continue
        product = db.query(Product).filter(Product.id == sub.product_id).first()
        if not product:
            continue
        order_number = "FF-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        total = float(product.price_per_day) * sub.quantity
        order = Order(
            order_number=order_number,
            user_id=sub.user_id,
            subscription_id=sub.id,
            delivery_date=today,
            total_amount=total,
            status="confirmed",
        )
        db.add(order)
        db.flush()
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=sub.quantity,
            unit_price=float(product.price_per_day),
            total_price=total,
        )
        db.add(item)
        partners = db.query(User).filter(User.role == "delivery_partner").all()
        if partners:
            partner = random.choice(partners)
            delivery = Delivery(
                order_id=order.id,
                delivery_partner_id=partner.id,
                status="on_the_way",
                estimated_time=random.randint(10, 30),
            )
            db.add(delivery)
        created += 1
    db.commit()
    msg = f"Generated {created} orders for {today}"
    if skipped:
        msg += f" ({skipped} skipped by customers)"
    return {"message": msg}


@router.get("/reports/revenue")
def revenue_report(
    start_date: date = None,
    end_date: date = None,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    daily_revenue = (
        db.query(
            func.date(Payment.paid_at).label("date"),
            func.sum(Payment.amount).label("revenue"),
            func.count(Payment.id).label("transactions"),
        )
        .filter(
            Payment.status == "success",
            Payment.paid_at >= start_date,
            Payment.paid_at <= end_date,
        )
        .group_by(func.date(Payment.paid_at))
        .order_by(func.date(Payment.paid_at))
        .all()
    )

    return [
        {"date": str(row.date), "revenue": float(row.revenue), "transactions": row.transactions}
        for row in daily_revenue
    ]
