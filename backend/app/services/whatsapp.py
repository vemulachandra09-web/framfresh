import httpx
from ..config import settings


async def send_whatsapp_message(phone: str, message: str) -> bool:
    if not settings.whatsapp_token:
        return False

    url = f"{settings.whatsapp_api_url}/{settings.whatsapp_phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": f"91{phone}",
        "type": "text",
        "text": {"body": message},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.status_code == 200


async def send_order_confirmation(phone: str, name: str, product: str, amount: float):
    message = (
        f"Hello {name} \U0001f44b\n"
        f"Your order for {product} has been confirmed.\n\n"
        f"Amount: ₹{amount:.2f}\n\n"
        "Thank you for choosing FarmFresh! \U0001f95b"
    )
    return await send_whatsapp_message(phone, message)


async def send_delivery_update(phone: str, name: str, partner: str, eta: int):
    message = (
        f"Hello {name} \U0001f44b\n"
        f"Your delivery is on the way \U0001f69a\n\n"
        f"Delivery Partner: {partner}\n"
        f"Estimated time: {eta} mins\n\n"
        "Thank you for choosing FarmFresh! \U0001f95b"
    )
    return await send_whatsapp_message(phone, message)


async def send_delivery_completed(phone: str, name: str):
    message = (
        f"Hello {name} \U0001f44b\n"
        "Your delivery has been completed! ✅\n\n"
        "Enjoy your fresh dairy products.\n"
        "Thank you for choosing FarmFresh! \U0001f95b"
    )
    return await send_whatsapp_message(phone, message)
