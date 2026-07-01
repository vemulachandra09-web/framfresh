from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
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

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FarmFresh API",
    description="Milk Delivery Subscription Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
