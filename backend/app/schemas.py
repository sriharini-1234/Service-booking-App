from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ServiceIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = ""
    duration_minutes: int = Field(default=30, ge=10, le=480)

class ServiceOut(ServiceIn):
    id: int
    active: bool
    model_config = ConfigDict(from_attributes=True)

class SlotIn(BaseModel):
    service_id: int
    start_at: datetime
    end_at: datetime
    capacity: int = Field(default=1, ge=1, le=100)

class SlotOut(BaseModel):
    id: int
    service_id: int
    start_at: datetime
    end_at: datetime
    capacity: int
    available: int

class BookingIn(BaseModel):
    slot_id: int
    notes: str = Field(default="", max_length=500)

class RescheduleIn(BaseModel):
    slot_id: int

class BookingOut(BaseModel):
    id: int
    status: str
    notes: str
    service_name: str
    start_at: datetime
    end_at: datetime
