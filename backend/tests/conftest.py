import asyncio

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

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
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
