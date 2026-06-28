from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.career_preference import CareerPreference
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
prefs: list[CareerPreference] = []


class FakeDb:
    def add(self, obj: CareerPreference):
        prefs.append(obj)

    def commit(self):
        return None

    def refresh(self, obj: CareerPreference):
        pass

    def scalar(self, query):
        params = query.compile().params
        user_id = str(params.get("user_id_1", ""))
        return next((p for p in prefs if str(p.user_id) == user_id), None)


def override_db():
    yield FakeDb()


def set_authenticated_user(user_id: str):
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": user_id,
        "email": "user@example.com",
    }


def setup_function():
    prefs.clear()
    app.dependency_overrides[get_db] = override_db


def teardown_function():
    app.dependency_overrides.clear()


def pref_payload(**kwargs):
    base = {
        "target_roles": ["Software Engineer"],
        "location_preference": "New York",
        "work_mode": "Remote",
        "salary_minimum": 80000,
    }
    base.update(kwargs)
    return base


def test_get_returns_404_when_no_preferences_exist():
    set_authenticated_user(str(uuid4()))
    response = client.get("/career-preferences")
    assert response.status_code == 404


def test_put_creates_preferences_for_new_user():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.put("/career-preferences", json=pref_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == user_id
    assert body["target_roles"] == ["Software Engineer"]
    assert body["location_preference"] == "New York"
    assert body["work_mode"] == "Remote"
    assert body["salary_minimum"] == 80000


def test_put_sets_correct_owner():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    body = client.put("/career-preferences", json=pref_payload()).json()

    assert body["user_id"] == user_id


def test_put_upserts_existing_preferences():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    client.put("/career-preferences", json=pref_payload())
    response = client.put(
        "/career-preferences",
        json=pref_payload(work_mode="Hybrid", salary_minimum=100000),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["work_mode"] == "Hybrid"
    assert body["salary_minimum"] == 100000
    assert len([p for p in prefs if str(p.user_id) == user_id]) == 1


def test_get_returns_owned_preferences():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    client.put("/career-preferences", json=pref_payload())
    response = client.get("/career-preferences")

    assert response.status_code == 200
    assert response.json()["user_id"] == user_id


def test_get_returns_404_for_different_user():
    user_a = str(uuid4())
    user_b = str(uuid4())

    set_authenticated_user(user_a)
    client.put("/career-preferences", json=pref_payload())

    set_authenticated_user(user_b)
    response = client.get("/career-preferences")

    assert response.status_code == 404


def test_put_accepts_null_fields():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.put(
        "/career-preferences",
        json={
            "target_roles": None,
            "location_preference": None,
            "work_mode": None,
            "salary_minimum": None,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["target_roles"] is None
    assert body["location_preference"] is None
    assert body["work_mode"] is None
    assert body["salary_minimum"] is None
