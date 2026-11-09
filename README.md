# Service Booking App

Responsive full-stack appointment booking MVP for a clinic or service center.

## Stack
- Frontend: React + Vite, React Router, plain responsive CSS
- Backend: FastAPI, SQLAlchemy 2, Pydantic, JWT authentication
- Database: PostgreSQL (SQLite fallback for quick local development)
- Migrations: Alembic
- Tests: pytest + FastAPI TestClient

## Features
- Customer registration and login
- Browse available services and appointment slots
- Create, reschedule, and cancel bookings
- View personal booking history
- Admin-only service, slot, and booking management
- JWT authentication and role-based authorization
- Input validation, API docs, and responsive UI

## 1. Run the backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000 and Swagger docs at http://127.0.0.1:8000/docs.

By default, the app uses SQLite (`sqlite:///./service_booking.db`) so you can run it immediately.
For PostgreSQL, edit `DATABASE_URL` in `backend/.env`, for example:
`postgresql+psycopg://postgres:your_password@localhost:5432/service_booking`

## 2. Run the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## 3. Create an admin

Register a normal account from the UI, then promote it in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

For SQLite, use a SQLite browser or Python sqlite3. Restart/re-login after changing the role.
Do not expose public admin registration in production.

## 4. Database migrations

The API creates tables automatically on first local run for convenience. To use Alembic:

```bash
cd backend
alembic upgrade head
```

A starter Alembic configuration and initial migration are included. If you change models,
generate a migration with `alembic revision --autogenerate -m "describe change"`.

## 5. Tests

```bash
cd backend
pytest -q
```

## API overview
- `POST /auth/register`
- `POST /auth/login`
- `GET /services`
- `GET /slots?service_id=1&date=2026-11-10`
- `GET /bookings/me`
- `POST /bookings`
- `PATCH /bookings/{booking_id}/reschedule`
- `PATCH /bookings/{booking_id}/cancel`
- Admin: `POST /admin/services`, `POST /admin/slots`, `GET /admin/bookings`

## Notes before production
Add email verification/password reset, rate limiting, audit logging, payment integration if needed,
database backups, HTTPS, secure secret management, and stricter timezone/business-hour rules.
