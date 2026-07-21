from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, datetime
from typing import Optional
from uuid import UUID


SUPPORTED_PINCODE = "515411"
UNSUPPORTED_PINCODE_MESSAGE = f"Sorry, we currently deliver only in pincode {SUPPORTED_PINCODE}."


class UserCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    email_otp: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_must_be_10_digits(cls, v):
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return digits

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("pincode")
    @classmethod
    def pincode_format(cls, v):
        if v is not None and v != "":
            digits = "".join(c for c in v if c.isdigit())
            if len(digits) != 6:
                raise ValueError("Pincode must be exactly 6 digits")
            if digits != SUPPORTED_PINCODE:
                raise ValueError(UNSUPPORTED_PINCODE_MESSAGE)
            return digits
        return v


class EmailOtpRequest(BaseModel):
    email: EmailStr


class EmailOtpVerify(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_must_be_6_digits(cls, v):
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) != 6:
            raise ValueError("OTP must be 6 digits")
        return digits


class UserLogin(BaseModel):
    phone: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    pincode: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None

    @field_validator("name")
    @classmethod
    def update_name_valid(cls, v):
        if v is not None:
            name = v.strip()
            if len(name) < 2:
                raise ValueError("Name must be at least 2 characters")
            if len(name) > 50:
                raise ValueError("Name cannot exceed 50 characters")
            if not all(c.isalpha() or c.isspace() for c in name):
                raise ValueError("Name should contain only letters")
            return name
        return v

    @field_validator("address")
    @classmethod
    def update_address_valid(cls, v):
        if v is not None:
            address = v.strip()
            if len(address) < 5:
                raise ValueError("Address must be at least 5 characters")
            if len(address) > 200:
                raise ValueError("Address is too long")
            return address
        return v

    @field_validator("city")
    @classmethod
    def update_city_valid(cls, v):
        if v is not None:
            city = v.strip()
            if len(city) < 2:
                raise ValueError("City must be at least 2 characters")
            if len(city) > 50:
                raise ValueError("City cannot exceed 50 characters")
            if not all(c.isalpha() or c.isspace() for c in city):
                raise ValueError("City should contain only letters")
            return city
        return v

    @field_validator("pincode")
    @classmethod
    def update_pincode_valid(cls, v):
        if v is not None:
            digits = "".join(c for c in v if c.isdigit())
            if len(digits) != 6:
                raise ValueError("Pincode must be exactly 6 digits")
            if digits != SUPPORTED_PINCODE:
                raise ValueError(UNSUPPORTED_PINCODE_MESSAGE)
            return digits
        return v


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    category: str
    quantity_ml: int
    price_per_day: float
    image_url: Optional[str]
    is_available: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    quantity_ml: int
    price_per_day: float
    image_url: Optional[str] = None


class SubscriptionCreate(BaseModel):
    product_id: UUID
    quantity: int = 1
    billing_cycle: str = "monthly"
    start_date: date
    delivery_time: str = "morning"


class SkipDateCreate(BaseModel):
    dates: list[date]


class SkipDateResponse(BaseModel):
    id: UUID
    subscription_id: UUID
    skip_date: date

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    product_id: UUID
    quantity: int
    billing_cycle: str
    start_date: date
    end_date: Optional[date]
    delivery_time: str
    status: str
    paused_from: Optional[date]
    paused_until: Optional[date]
    product: Optional[ProductResponse] = None
    user: Optional[UserResponse] = None
    skip_dates: list[SkipDateResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionPause(BaseModel):
    paused_from: date
    paused_until: date


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: float
    total_price: float
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True


class DeliveryResponse(BaseModel):
    id: UUID
    order_id: UUID
    delivery_partner_id: Optional[UUID]
    status: str
    estimated_time: Optional[int]
    delivered_at: Optional[datetime]
    latitude: Optional[float]
    longitude: Optional[float]
    delivery_partner: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class DeliveryRatingBrief(BaseModel):
    quality_rating: int
    timing_rating: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True


class DeliveryListResponse(BaseModel):
    id: UUID
    order_id: UUID
    delivery_partner_id: Optional[UUID]
    status: str
    estimated_time: Optional[int]
    delivered_at: Optional[datetime]
    latitude: Optional[float]
    longitude: Optional[float]
    delivery_partner: Optional[UserResponse] = None
    order_number: Optional[str] = None
    customer_name: Optional[str] = None
    rating: Optional[DeliveryRatingBrief] = None

    class Config:
        from_attributes = True


class DeliveryUpdate(BaseModel):
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    user_id: UUID
    delivery_date: date
    total_amount: float
    status: str
    items: list[OrderItemResponse] = []
    delivery: Optional[DeliveryResponse] = None
    user: Optional[UserResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    product_id: UUID
    quantity: int = 1
    delivery_date: date


class PaymentCreate(BaseModel):
    order_id: Optional[UUID] = None
    amount: float
    payment_method: str
    upi_provider: Optional[str] = None
    transaction_id: Optional[str] = None


class PaymentResponse(BaseModel):
    id: UUID
    user_id: UUID
    order_id: Optional[UUID]
    amount: float
    payment_method: str
    upi_provider: Optional[str]
    transaction_id: Optional[str]
    status: str
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryRatingCreate(BaseModel):
    quality_rating: int
    timing_rating: int
    comment: Optional[str] = None

    @field_validator("quality_rating", "timing_rating")
    @classmethod
    def rating_range(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class DeliveryRatingResponse(BaseModel):
    id: UUID
    delivery_id: UUID
    user_id: UUID
    quality_rating: int
    timing_rating: int
    comment: Optional[str]
    user: Optional[UserResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: UUID
    title: str
    type: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_customers: int
    active_subscriptions: int
    todays_orders: int
    monthly_revenue: float
    recent_orders: list[OrderResponse]
