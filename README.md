# FarmFresh - Milk Delivery Application

Fresh Milk. Pure Health. Daily to Your Doorstep.

## Tech Stack

- **Backend**: Python (FastAPI) + SQLAlchemy
- **Frontend**: React 18 + React Router + Recharts
- **Database**: PostgreSQL 15
- **Cache**: Redis

## Features

### Customer App (Mobile + Web)
- Daily milk subscription (250ml, 500ml, 1L, 2L)
- Pause/resume deliveries
- Monthly/weekly billing
- UPI payments (GPay, PhonePe, Paytm, BHIM)
- Real-time delivery tracking
- WhatsApp notifications
- Order history

### Admin Dashboard (Web)
- Dashboard with stats and revenue charts
- Customer management
- Subscription management
- Order management
- Delivery tracking
- Product management
- Revenue reports

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

#### Database
```bash
# Create PostgreSQL database
createdb farmfresh
psql farmfresh < database/schema.sql
psql farmfresh < database/seed.sql
```

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## Default Login

- **Admin**: Phone: `9999999999`, Password: `Admin@123`
- **Customer**: Phone: `9123456789`, Password: `Admin@123`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/products/ | List products |
| POST | /api/subscriptions/ | Create subscription |
| POST | /api/subscriptions/:id/pause | Pause subscription |
| POST | /api/subscriptions/:id/resume | Resume subscription |
| GET | /api/orders/ | List orders |
| POST | /api/payments/ | Make payment |
| GET | /api/deliveries/track/:id | Track delivery |
| GET | /api/admin/dashboard | Admin dashboard stats |
| GET | /api/admin/reports/revenue | Revenue report |

## Project Structure

```
farmfresh/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB connection
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # JWT authentication
│   │   ├── routers/             # API route handlers
│   │   └── services/            # Business logic (WhatsApp)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js               # Routes & layout
│   │   ├── App.css              # Full stylesheet
│   │   ├── context/             # Auth context
│   │   ├── services/            # API client
│   │   ├── components/          # Shared components
│   │   └── pages/               # Customer & admin pages
│   ├── package.json
│   └── Dockerfile
├── database/
│   ├── schema.sql               # PostgreSQL schema
│   └── seed.sql                 # Sample data
├── docker-compose.yml
└── README.md
```

## WhatsApp Integration

Set these in `.env` to enable WhatsApp notifications:
```
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
```

## Production Logging

The backend writes request logs, unhandled exception traces, and key business events such as login, order creation, payments, subscriptions, delivery updates, and WhatsApp commands to stdout. Configure verbosity with:
```
LOG_LEVEL=INFO
```

Use `DEBUG` only for short troubleshooting sessions. Logs mask phone numbers and do not include passwords, JWT tokens, or WhatsApp tokens.

## License

Private - All rights reserved.
