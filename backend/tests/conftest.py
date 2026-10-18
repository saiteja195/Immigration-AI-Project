import asyncio

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.core import security
from app.core.config import settings
from app.core.db import get_db
from app.main import app

settings.scheduler_enabled = False  # tests call the reminder engine directly


@pytest.fixture
def db():
    d = AsyncMongoMockClient()["test"]
    asyncio.run(d.users.create_index("email", unique=True))
    return d


@pytest.fixture
def client(db, monkeypatch):
    app.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr("app.main.get_db", lambda: db)  # startup creates indexes on the test database
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True, scope="session")
def fast_password_hashing():
    """Cheap Argon2 settings so tests that sign up users run quickly. Production keeps the strong defaults."""
    original = security._hasher
    security._hasher = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1)
    yield
    security._hasher = original
