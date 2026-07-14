import os

import pytest
from fastapi.testclient import TestClient

os.environ["INTERNAL_API_KEY"] = "test-key"

from app.main import app  # noqa: E402  (env var must be set before import)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-Internal-Api-Key": "test-key"}
