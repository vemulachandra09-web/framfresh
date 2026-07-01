from datetime import date, datetime
from fastapi import APIRouter, Request, Query, Response
from sqlalchemy.orm import Session, joinedload
from ..database import SessionLocal
from ..models import User, Subscription, Order, Payment, Notification
from ..config import settings
from ..services.whatsapp import send_whatsapp_message

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Bot"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _notify(db: Session, user_id, title: str, msg: str, ntype: str):
    db.add(Notification(
        user_id=user_id, title=title, type=ntype,
        channel="whatsapp", message=msg, is_read=False, is_sent=True, sent_at=datetime.utcnow(),
    ))


@router.get("/webhook")
def verify_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        return Response(content=challenge, media_type="text/plain")
    return {"status": "forbidden"}


@router.post("/webhook")
async def receive_message(request: Request):
    body = await request.json()

    entries = body.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            for msg in messages:
                if msg.get("type") != "text":
                    continue
                phone = msg["from"].lstrip("91")
                text = msg["text"]["body"].strip().lower()
                reply = await process_command(phone, text)
                await send_whatsapp_message(phone, reply)

    return {"status": "ok"}


async def process_command(phone: str, command: str) -> str:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            return (
                "Welcome to FarmFresh! 🐄\n\n"
                "Your phone number is not registered.\n"
                "Please download our app and register first.\n\n"
                "Type 'help' for available commands."
            )

        cmd = command.split()[0] if command else ""

        if cmd == "help":
            return _cmd_help(user.name)
        elif cmd == "bill":
            return _cmd_bill(db, user)
        elif cmd == "status":
            return _cmd_status(db, user)
        elif cmd == "pause":
            return _cmd_pause(db, user)
        elif cmd == "resume":
            return _cmd_resume(db, user)
        elif cmd == "today":
            return _cmd_today(db, user)
        elif cmd in ("hi", "hello", "hey"):
            return f"Hello {user.name}! 👋\n\nType 'help' to see what I can do."
        else:
            return (
                f"Sorry, I didn't understand '{command}'.\n\n"
                "Type 'help' to see available commands."
            )
    finally:
        db.close()


def _cmd_help(name: str) -> str:
    return (
        f"Hi {name}! 🐄 Here's what you can do:\n\n"
        "📋 *bill* — View your subscription bill\n"
        "📊 *status* — Check subscription status\n"
        "⏸️ *pause* — Pause active subscription\n"
        "▶️ *resume* — Resume paused subscription\n"
        "📦 *today* — Today's delivery status\n"
        "❓ *help* — Show this menu\n\n"
        "Just type any command!"
    )


def _cmd_bill(db: Session, user: User) -> str:
    subs = (
        db.query(Subscription)
        .options(joinedload(Subscription.product))
        .filter(Subscription.user_id == user.id, Subscription.status.in_(["active", "paused"]))
        .all()
    )
    if not subs:
        return "You don't have any active subscriptions. 📋"

    lines = [f"📋 *Your Bill Summary*\n"]
    total = 0
    for sub in subs:
        start = sub.start_date
        today = date.today()
        days = max(0, (today - start).days)
        per_day = float(sub.product.price_per_day) * sub.quantity if sub.product else 0
        amount = days * per_day
        total += amount
        lines.append(
            f"• {sub.product.name if sub.product else 'Product'}\n"
            f"  {days} days × ₹{per_day}/day = *₹{amount:.0f}*\n"
            f"  Status: {sub.status}\n"
        )
    lines.append(f"\n💰 *Total Due: ₹{total:.0f}*")
    return "\n".join(lines)


def _cmd_status(db: Session, user: User) -> str:
    subs = (
        db.query(Subscription)
        .options(joinedload(Subscription.product))
        .filter(Subscription.user_id == user.id)
        .order_by(Subscription.created_at.desc())
        .limit(5)
        .all()
    )
    if not subs:
        return "No subscriptions found. Visit our app to subscribe! 🥛"

    lines = ["📊 *Your Subscriptions*\n"]
    for sub in subs:
        status_icon = {"active": "🟢", "paused": "🟡", "cancelled": "🔴"}.get(sub.status, "⚪")
        name = sub.product.name if sub.product else "Product"
        lines.append(f"{status_icon} {name} — {sub.status} (qty: {sub.quantity})")
        if sub.paused_until:
            lines.append(f"   Paused until: {sub.paused_until}")
    return "\n".join(lines)


def _cmd_pause(db: Session, user: User) -> str:
    active = (
        db.query(Subscription)
        .options(joinedload(Subscription.product))
        .filter(Subscription.user_id == user.id, Subscription.status == "active")
        .all()
    )
    if not active:
        return "No active subscriptions to pause. ⏸️"

    paused_names = []
    for sub in active:
        sub.status = "paused"
        sub.paused_from = date.today()
        name = sub.product.name if sub.product else "Subscription"
        paused_names.append(name)
        _notify(db, user.id, f"{name} paused", f"Your {name} subscription has been paused via WhatsApp.", "subscription")

    db.commit()
    names = ", ".join(paused_names)
    return (
        f"⏸️ *Paused!*\n\n"
        f"Subscriptions paused: {names}\n\n"
        "Type 'resume' when you're ready to restart deliveries."
    )


def _cmd_resume(db: Session, user: User) -> str:
    paused = (
        db.query(Subscription)
        .options(joinedload(Subscription.product))
        .filter(Subscription.user_id == user.id, Subscription.status == "paused")
        .all()
    )
    if not paused:
        return "No paused subscriptions to resume. ▶️"

    resumed_names = []
    for sub in paused:
        sub.status = "active"
        sub.paused_from = None
        sub.paused_until = None
        name = sub.product.name if sub.product else "Subscription"
        resumed_names.append(name)
        _notify(db, user.id, f"{name} resumed", f"Your {name} subscription has been resumed via WhatsApp.", "subscription")

    db.commit()
    names = ", ".join(resumed_names)
    return (
        f"▶️ *Resumed!*\n\n"
        f"Subscriptions resumed: {names}\n\n"
        "Your deliveries will continue from tomorrow."
    )


def _cmd_today(db: Session, user: User) -> str:
    today = date.today()
    orders = (
        db.query(Order)
        .filter(Order.user_id == user.id, Order.delivery_date == today)
        .all()
    )
    if not orders:
        return f"No deliveries scheduled for today ({today}). 📦"

    lines = [f"📦 *Today's Deliveries ({today})*\n"]
    for order in orders:
        icon = {"pending": "⏳", "confirmed": "✅", "out_for_delivery": "🚚", "delivered": "📦"}.get(order.status, "❓")
        lines.append(f"{icon} {order.order_number} — ₹{order.total_amount} — {order.status.replace('_', ' ')}")
    return "\n".join(lines)
