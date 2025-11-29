import copy
import pytest
from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)


# Snapshot original activities so tests can restore state between cases
_orig_activities = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Restore a clean copy for each test
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(_orig_activities))
    yield


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    email = "testuser@example.com"
    # signup
    resp = client.post(f"/activities/Chess Club/signup?email={email}")
    assert resp.status_code == 200
    assert email in app_module.activities["Chess Club"]["participants"]

    # unregister
    resp = client.delete(f"/activities/Chess Club/unregister?email={email}")
    assert resp.status_code == 200
    assert email not in app_module.activities["Chess Club"]["participants"]


def test_duplicate_signup_returns_400():
    existing = app_module.activities["Chess Club"]["participants"][0]
    resp = client.post(f"/activities/Chess Club/signup?email={existing}")
    assert resp.status_code == 400


def test_unregister_nonexistent_returns_404():
    resp = client.delete("/activities/Chess Club/unregister?email=notpresent@example.com")
    assert resp.status_code == 404


def test_activity_not_found_returns_404():
    resp = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert resp.status_code == 404
    resp = client.delete("/activities/NoSuchActivity/unregister?email=a@b.com")
    assert resp.status_code == 404
