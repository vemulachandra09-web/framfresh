import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .logging_config import setup_logging
from .routers import (
    auth_router,
    products_router,
    subscriptions_router,
    orders_router,
    payments_router,
    delivery_router,
    notifications_router,
    whatsapp_router,
    admin_router,
)

logger = setup_logging(settings.log_level)

try:
    Base.metadata.create_all(bind=engine)
    logger.info("event=database_schema_ready")
except Exception:
    logger.exception("event=database_schema_failed")
    raise

app = FastAPI(
    title="FarmFresh API",
    description="Milk Delivery Subscription Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173","https://framfresh-1-878z.onrender.com",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    start = time.perf_counter()
    path = request.url.path

    if path != "/health":
        logger.info(
            "event=request_started request_id=%s method=%s path=%s client=%s",
            request_id,
            request.method,
            path,
            request.client.host if request.client else "",
        )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        logging.getLogger("farmfresh.request").exception(
            "event=request_failed request_id=%s method=%s path=%s duration_ms=%.2f",
            request_id,
            request.method,
            path,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["x-request-id"] = request_id
    if path != "/health":
        logger.info(
            "event=request_completed request_id=%s method=%s path=%s status_code=%s duration_ms=%.2f",
            request_id,
            request.method,
            path,
            response.status_code,
            duration_ms,
        )
    return response


app.include_router(auth_router.router)
app.include_router(products_router.router)
app.include_router(subscriptions_router.router)
app.include_router(orders_router.router)
app.include_router(payments_router.router)
app.include_router(delivery_router.router)
app.include_router(notifications_router.router)
app.include_router(whatsapp_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"message": "FarmFresh API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
