from datetime import date, datetime, time, timedelta
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.core.config import settings
from app.db import Base, engine, get_db
from app import models, schemas
from app.security import hash_password, verify_password, create_access_token, get_current_user, require_admin

Base.metadata.create_all(bind=engine)

# Demo data makes the application usable immediately after the first run.
def seed_demo_data():
    from datetime import datetime, timedelta
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        if db.query(models.Service).count() == 0:
            demo_services = [
                models.Service(name="General Consultation", description="Discuss your concerns with a qualified practitioner.", duration_minutes=30),
                models.Service(name="Dental Check-up", description="Routine dental examination and consultation.", duration_minutes=30),
                models.Service(name="Wellness Consultation", description="A one-to-one wellness and lifestyle consultation.", duration_minutes=45),
            ]
            db.add_all(demo_services)
            db.commit()
        if db.query(models.Slot).count() == 0:
            services = db.query(models.Service).filter(models.Service.active == True).all()
            now = datetime.now()
            slots = []
            for day_offset in range(1, 15):
                day = (now + timedelta(days=day_offset)).date()
                for service in services:
                    for hour in (9, 10, 11, 14, 15, 16):
                        start = datetime.combine(day, time(hour, 0))
                        slots.append(models.Slot(service_id=service.id, start_at=start,
                            end_at=start + timedelta(minutes=service.duration_minutes), capacity=2))
            db.add_all(slots)
            db.commit()
    finally:
        db.close()

seed_demo_data()

app = FastAPI(title="Service Booking API", version="1.0.0",
              description="Appointment booking API with customer and admin roles.")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def health():
    return {"message": "Service Booking API is running"}

@app.post("/auth/register", response_model=schemas.TokenOut, status_code=201)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(models.User).filter(func.lower(models.User.email) == email).first():
        raise HTTPException(409, "Email is already registered")
    user = models.User(name=data.name.strip(), email=email, password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_access_token(user.id), "user": user}

@app.post("/auth/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(func.lower(models.User.email) == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_access_token(user.id), "user": user}

@app.get("/services", response_model=list[schemas.ServiceOut])
def list_services(db: Session = Depends(get_db)):
    return db.query(models.Service).filter(models.Service.active == True).order_by(models.Service.name).all()

def slot_available(db: Session, slot: models.Slot, exclude_booking_id: int | None = None):
    q = db.query(func.count(models.Booking.id)).filter(
        models.Booking.slot_id == slot.id, models.Booking.status == "confirmed")
    if exclude_booking_id:
        q = q.filter(models.Booking.id != exclude_booking_id)
    return max(0, slot.capacity - q.scalar())

@app.get("/slots", response_model=list[schemas.SlotOut])
def list_slots(service_id: int, date: date = Query(...), db: Session = Depends(get_db)):
    start = datetime.combine(date, time.min)
    end = start + timedelta(days=1)
    slots = db.query(models.Slot).filter(models.Slot.service_id == service_id,
        models.Slot.active == True, models.Slot.start_at >= start, models.Slot.start_at < end
    ).order_by(models.Slot.start_at).all()
    return [{"id": s.id, "service_id": s.service_id, "start_at": s.start_at,
             "end_at": s.end_at, "capacity": s.capacity, "available": slot_available(db, s)}
            for s in slots if slot_available(db, s) > 0 and s.start_at > datetime.now()]

def booking_output(b: models.Booking):
    return {"id": b.id, "status": b.status, "notes": b.notes,
            "service_name": b.service.name, "start_at": b.slot.start_at, "end_at": b.slot.end_at}

@app.get("/bookings/me", response_model=list[schemas.BookingOut])
def my_bookings(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Booking).options(joinedload(models.Booking.service), joinedload(models.Booking.slot)
        ).filter(models.Booking.user_id == user.id).order_by(models.Booking.created_at.desc()).all()
    return [booking_output(b) for b in rows]

@app.post("/bookings", response_model=schemas.BookingOut, status_code=201)
def create_booking(data: schemas.BookingIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    slot = db.query(models.Slot).filter(models.Slot.id == data.slot_id, models.Slot.active == True).first()
    if not slot or slot.start_at <= datetime.now():
        raise HTTPException(404, "Available slot not found")
    if slot_available(db, slot) < 1:
        raise HTTPException(409, "This slot is fully booked")
    booking = models.Booking(user_id=user.id, service_id=slot.service_id, slot_id=slot.id, notes=data.notes)
    db.add(booking); db.commit()
    booking = db.query(models.Booking).options(joinedload(models.Booking.service), joinedload(models.Booking.slot)).get(booking.id)
    return booking_output(booking)

@app.patch("/bookings/{booking_id}/reschedule", response_model=schemas.BookingOut)
def reschedule(booking_id: int, data: schemas.RescheduleIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id, models.Booking.user_id == user.id).first()
    if not booking or booking.status != "confirmed":
        raise HTTPException(404, "Active booking not found")
    new_slot = db.query(models.Slot).filter(models.Slot.id == data.slot_id,
        models.Slot.service_id == booking.service_id, models.Slot.active == True).first()
    if not new_slot or new_slot.start_at <= datetime.now() or slot_available(db, new_slot) < 1:
        raise HTTPException(409, "Selected slot is unavailable")
    booking.slot_id = new_slot.id
    db.commit()
    booking = db.query(models.Booking).options(joinedload(models.Booking.service), joinedload(models.Booking.slot)).get(booking.id)
    return booking_output(booking)

@app.patch("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id, models.Booking.user_id == user.id).first()
    if not booking or booking.status != "confirmed":
        raise HTTPException(404, "Active booking not found")
    booking.status = "cancelled"; db.commit()
    return {"message": "Booking cancelled"}

@app.post("/admin/services", response_model=schemas.ServiceOut, status_code=201)
def create_service(data: schemas.ServiceIn, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(models.Service).filter(func.lower(models.Service.name) == data.name.lower()).first():
        raise HTTPException(409, "Service already exists")
    service = models.Service(**data.model_dump())
    db.add(service); db.commit(); db.refresh(service)
    return service

@app.post("/admin/slots", status_code=201)
def create_slot(data: schemas.SlotIn, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if data.end_at <= data.start_at:
        raise HTTPException(422, "End time must be after start time")
    if not db.get(models.Service, data.service_id):
        raise HTTPException(404, "Service not found")
    slot = models.Slot(**data.model_dump())
    db.add(slot); db.commit(); db.refresh(slot)
    return {"id": slot.id, "message": "Slot created"}

@app.get("/admin/bookings")
def all_bookings(admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(models.Booking).options(joinedload(models.Booking.user), joinedload(models.Booking.service),
        joinedload(models.Booking.slot)).order_by(models.Booking.created_at.desc()).all()
    return [{"id": b.id, "customer": b.user.name, "email": b.user.email, "service": b.service.name,
             "start_at": b.slot.start_at, "status": b.status} for b in rows]
