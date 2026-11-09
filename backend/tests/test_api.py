from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)

def override_db():
    db = TestingSession()
    try: yield db
    finally: db.close()

app.dependency_overrides[get_db] = override_db
client = TestClient(app)

def test_register_and_duplicate_email():
    payload = {"name": "Test User", "email": "test@example.com", "password": "strongpass123"}
    r = client.post("/auth/register", json=payload)
    assert r.status_code == 201
    assert "access_token" in r.json()
    assert client.post("/auth/register", json=payload).status_code == 409

def test_login_rejects_wrong_password():
    r = client.post("/auth/login", json={"email": "test@example.com", "password": "wrongpass"})
    assert r.status_code == 401

def test_services_endpoint():
    assert client.get("/services").status_code == 200
