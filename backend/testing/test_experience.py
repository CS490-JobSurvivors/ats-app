from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.experience import Experience
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
experiences: list[Experience] = []


class FakeScalarResult:
    def __init__(self, items):
        self.items = items

    def all(self):
        return self.items


class FakeDb:
    def add(self, obj: Experience):
        if obj.experience_id is None:
            obj.experience_id = uuid4()
        experiences.append(obj)

    def commit(self):
        return None

    def refresh(self, obj: Experience):
        pass

    def delete(self, obj: Experience):
        if obj in experiences:
            experiences.remove(obj)

    def scalars(self, query):
        params = query.compile().params
        user_id = str(params.get("experience_user_id_1", ""))
        owned = [e for e in experiences if str(e.experience_user_id) == user_id]
        return FakeScalarResult(sorted(owned, key=lambda e: e.position_number))

    def scalar(self, query):
        compiled = query.compile()
        params = compiled.params
        sql = str(compiled)

        if "count" in sql.lower():
            user_id = str(params.get("experience_user_id_1", ""))
            return sum(1 for e in experiences if str(e.experience_user_id) == user_id)

        if "experience_id_1" in params and "experience_user_id_1" in params:
            for e in experiences:
                if str(e.experience_id) == str(params["experience_id_1"]) and str(
                    e.experience_user_id
                ) == str(params["experience_user_id_1"]):
                    return e
            return None

        return None


def override_db():
    yield FakeDb()


def auth_user(user_id: str):
    return {"sub": user_id, "email": "experience-owner@example.com"}


def set_authenticated_user(user_id: str):
    app.dependency_overrides[get_current_user] = lambda: auth_user(user_id)


def setup_function():
    experiences.clear()
    app.dependency_overrides[get_db] = override_db


def teardown_function():
    app.dependency_overrides.clear()


def experience_payload(
    company="Acme Corp",
    title="Software Engineer",
    start_date="2020-06-01",
    end_date="2023-05-31",
    is_current=False,
    experience_description=None,
):
    payload = {
        "company": company,
        "title": title,
        "start_date": start_date,
        "end_date": end_date,
        "is_current": is_current,
    }
    if experience_description is not None:
        payload["experience_description"] = experience_description
    return payload


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def test_create_experience_assigns_authenticated_user_as_owner():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post("/experiences", json=experience_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["company"] == "Acme Corp"
    assert body["title"] == "Software Engineer"
    assert body["experience_user_id"] == user_id


def test_create_experience_assigns_position_based_on_count():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    first = client.post("/experiences", json=experience_payload("First Co"))
    second = client.post("/experiences", json=experience_payload("Second Co"))

    assert first.json()["position_number"] == 0
    assert second.json()["position_number"] == 1


def test_create_experience_ignores_client_supplied_position_number():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {**experience_payload(), "position_number": 99}

    response = client.post("/experiences", json=payload)

    assert response.status_code == 201
    assert response.json()["position_number"] == 0


def test_create_experience_allows_optional_fields_to_be_omitted():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {
        "company": "Startup Inc",
        "title": "Intern",
        "start_date": "2022-01-01",
    }

    response = client.post("/experiences", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["end_date"] is None
    assert body["experience_description"] is None
    assert body["is_current"] is False


def test_create_experience_rejects_empty_company():
    set_authenticated_user(str(uuid4()))
    payload = {**experience_payload(), "company": ""}

    response = client.post("/experiences", json=payload)

    assert response.status_code == 422
    assert experiences == []


def test_create_experience_rejects_empty_title():
    set_authenticated_user(str(uuid4()))
    payload = {**experience_payload(), "title": ""}

    response = client.post("/experiences", json=payload)

    assert response.status_code == 422
    assert experiences == []


def test_create_experience_rejects_end_date_before_start_date():
    set_authenticated_user(str(uuid4()))
    payload = experience_payload(start_date="2023-01-01", end_date="2021-01-01")

    response = client.post("/experiences", json=payload)

    assert response.status_code == 422
    assert experiences == []


def test_create_experience_allows_missing_end_date_when_is_current():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = experience_payload(end_date=None, is_current=True)

    response = client.post("/experiences", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["is_current"] is True
    assert body["end_date"] is None


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


def test_list_experiences_returns_only_owned_records():
    user_a = str(uuid4())
    user_b = str(uuid4())

    set_authenticated_user(user_a)
    client.post("/experiences", json=experience_payload("Company A"))

    set_authenticated_user(user_b)
    client.post("/experiences", json=experience_payload("Company B"))

    response = client.get("/experiences")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["company"] == "Company B"
    assert body[0]["experience_user_id"] == user_b


def test_list_experiences_orders_by_position_number_ascending():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    id_a = client.post("/experiences", json=experience_payload("First Co")).json()["experience_id"]
    id_b = client.post("/experiences", json=experience_payload("Second Co")).json()["experience_id"]

    client.patch(
        "/experiences/reorder",
        json=[
            {"experience_id": id_a, "position_number": 1},
            {"experience_id": id_b, "position_number": 0},
        ],
    )

    body = client.get("/experiences").json()

    assert [e["company"] for e in body] == ["Second Co", "First Co"]


def test_list_experiences_returns_empty_list_when_user_has_no_records():
    set_authenticated_user(str(uuid4()))

    response = client.get("/experiences")

    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


def test_update_experience_only_updates_owned_records():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    exp_id = client.post("/experiences", json=experience_payload()).json()["experience_id"]

    set_authenticated_user(other_id)
    denied = client.patch(f"/experiences/{exp_id}", json={"title": "Stolen"})
    assert denied.status_code == 404

    set_authenticated_user(owner_id)
    allowed = client.patch(f"/experiences/{exp_id}", json={"title": "Senior Engineer"})
    assert allowed.status_code == 200
    assert allowed.json()["title"] == "Senior Engineer"


def test_update_experience_applies_partial_changes_only():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    exp_id = client.post("/experiences", json=experience_payload()).json()["experience_id"]

    response = client.patch(f"/experiences/{exp_id}", json={"title": "Lead Engineer"})

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Lead Engineer"
    assert body["company"] == "Acme Corp"


def test_update_experience_returns_404_for_missing_record():
    set_authenticated_user(str(uuid4()))

    response = client.patch(f"/experiences/{uuid4()}", json={"title": "Ghost"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Experience not found"


def test_update_experience_rejects_end_date_before_start_date():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    exp_id = client.post("/experiences", json=experience_payload()).json()["experience_id"]

    response = client.patch(
        f"/experiences/{exp_id}",
        json={"start_date": "2023-01-01", "end_date": "2019-01-01", "is_current": False},
    )

    assert response.status_code == 422


def test_update_experience_rejects_empty_company():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    exp_id = client.post("/experiences", json=experience_payload()).json()["experience_id"]

    response = client.patch(f"/experiences/{exp_id}", json={"company": ""})

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


def test_delete_experience_only_deletes_owned_records():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    exp_id = client.post("/experiences", json=experience_payload()).json()["experience_id"]

    set_authenticated_user(other_id)
    denied = client.delete(f"/experiences/{exp_id}")
    assert denied.status_code == 404

    set_authenticated_user(owner_id)
    allowed = client.delete(f"/experiences/{exp_id}")
    assert allowed.status_code == 204

    assert client.get("/experiences").json() == []


def test_delete_experience_returns_404_for_missing_record():
    set_authenticated_user(str(uuid4()))

    response = client.delete(f"/experiences/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Experience not found"


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------


def test_reorder_experiences_updates_position_numbers():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    id_a = client.post("/experiences", json=experience_payload("First Co")).json()["experience_id"]
    id_b = client.post("/experiences", json=experience_payload("Second Co")).json()["experience_id"]

    response = client.patch(
        "/experiences/reorder",
        json=[
            {"experience_id": id_a, "position_number": 1},
            {"experience_id": id_b, "position_number": 0},
        ],
    )

    assert response.status_code == 204
    record_a = next(e for e in experiences if str(e.experience_id) == id_a)
    record_b = next(e for e in experiences if str(e.experience_id) == id_b)
    assert record_a.position_number == 1
    assert record_b.position_number == 0


def test_reorder_experiences_ignores_entries_owned_by_other_users():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    owned_id = client.post("/experiences", json=experience_payload()).json()["experience_id"]

    set_authenticated_user(other_id)
    response = client.patch(
        "/experiences/reorder",
        json=[{"experience_id": owned_id, "position_number": 5}],
    )

    assert response.status_code == 204
    untouched = next(e for e in experiences if str(e.experience_id) == owned_id)
    assert untouched.position_number == 0
