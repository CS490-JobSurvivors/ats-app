from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.education import Education
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
education: list[Education] = []


class FakeScalarResult:
    def __init__(self, items):
        self.items = items

    def all(self):
        return self.items


class FakeDb:
    def add(self, obj: Education):
        if obj.education_id is None:
            obj.education_id = uuid4()
        education.append(obj)

    def commit(self):
        return None

    def refresh(self, obj: Education):
        pass

    def delete(self, obj: Education):
        if obj in education:
            education.remove(obj)

    def scalars(self, query):
        params = query.compile().params
        user_id = str(params.get("education_user_id_1", ""))
        owned = [e for e in education if str(e.education_user_id) == user_id]
        # The list route orders by position_number ascending.
        return FakeScalarResult(sorted(owned, key=lambda e: e.position_number))

    def scalar(self, query):
        compiled = query.compile()
        params = compiled.params
        sql = str(compiled)

        if "count" in sql.lower():
            user_id = str(params.get("education_user_id_1", ""))
            return sum(1 for e in education if str(e.education_user_id) == user_id)

        if "education_id_1" in params and "education_user_id_1" in params:
            for e in education:
                if (
                    str(e.education_id) == str(params["education_id_1"])
                    and str(e.education_user_id) == str(params["education_user_id_1"])
                ):
                    return e
            return None

        return None


def override_db():
    yield FakeDb()


def auth_user(user_id: str):
    return {"sub": user_id, "email": "education-owner@example.com"}


def set_authenticated_user(user_id: str):
    app.dependency_overrides[get_current_user] = lambda: auth_user(user_id)


def setup_function():
    education.clear()
    app.dependency_overrides[get_db] = override_db


def teardown_function():
    app.dependency_overrides.clear()


def education_payload(
    institution_name="State University",
    degree="BS",
    major="Computer Science",
    start_date="2018-09-01",
    end_date="2022-05-15",
    GPA=3.8,
    is_current=False,
):
    return {
        "institution_name": institution_name,
        "degree": degree,
        "major": major,
        "start_date": start_date,
        "end_date": end_date,
        "GPA": GPA,
        "is_current": is_current,
    }


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def test_create_education_assigns_authenticated_user_as_owner():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post("/education", json=education_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["institution_name"] == "State University"
    assert body["degree"] == "BS"
    assert body["major"] == "Computer Science"
    assert body["GPA"] == 3.8
    assert body["education_user_id"] == user_id


def test_create_education_assigns_position_based_on_count():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    first = client.post("/education", json=education_payload("First University"))
    second = client.post("/education", json=education_payload("Second University"))

    assert first.json()["position_number"] == 0
    assert second.json()["position_number"] == 1


def test_create_education_ignores_client_supplied_position_number():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {**education_payload(), "position_number": 99}

    response = client.post("/education", json=payload)

    assert response.status_code == 201
    assert response.json()["position_number"] == 0


def test_create_education_allows_optional_fields_to_be_omitted():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {
        "institution_name": "Open University",
        "degree": "MS",
        "major": "Data Science",
        "start_date": "2020-01-01",
    }

    response = client.post("/education", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["end_date"] is None
    assert body["GPA"] is None
    assert body["is_current"] is False


def test_create_education_rejects_empty_institution_name():
    set_authenticated_user(str(uuid4()))
    payload = {**education_payload(), "institution_name": ""}

    response = client.post("/education", json=payload)

    assert response.status_code == 422
    assert education == []


def test_create_education_rejects_end_date_before_start_date():
    set_authenticated_user(str(uuid4()))
    payload = education_payload(start_date="2022-05-15", end_date="2018-09-01")

    response = client.post("/education", json=payload)

    assert response.status_code == 422
    assert education == []


def test_create_education_allows_missing_end_date_when_current():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = education_payload(end_date=None, is_current=True)

    response = client.post("/education", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["is_current"] is True
    assert body["end_date"] is None


def test_create_education_rejects_non_uuid_authenticated_subject():
    app.dependency_overrides[get_current_user] = lambda: {"sub": "not-a-uuid"}

    response = client.post("/education", json=education_payload())

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authenticated user"


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


def test_list_education_returns_only_owned_records():
    user_a = str(uuid4())
    user_b = str(uuid4())

    set_authenticated_user(user_a)
    client.post("/education", json=education_payload("A University"))

    set_authenticated_user(user_b)
    client.post("/education", json=education_payload("B University"))

    response = client.get("/education")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["institution_name"] == "B University"
    assert body[0]["education_user_id"] == user_b


def test_list_education_orders_by_position_number_ascending():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    id_a = client.post("/education", json=education_payload("First")).json()["education_id"]
    id_b = client.post("/education", json=education_payload("Second")).json()["education_id"]

    # Move the first record behind the second.
    client.patch(
        "/education/reorder",
        json=[
            {"education_id": id_a, "position_number": 1},
            {"education_id": id_b, "position_number": 0},
        ],
    )

    body = client.get("/education").json()

    assert [e["institution_name"] for e in body] == ["Second", "First"]


def test_list_education_returns_empty_list_when_user_has_no_records():
    set_authenticated_user(str(uuid4()))

    response = client.get("/education")

    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


def test_update_education_only_updates_owned_records():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    education_id = client.post("/education", json=education_payload()).json()["education_id"]

    set_authenticated_user(other_id)
    denied = client.patch(f"/education/{education_id}", json={"degree": "Stolen"})
    assert denied.status_code == 404

    set_authenticated_user(owner_id)
    allowed = client.patch(f"/education/{education_id}", json={"degree": "MS"})
    assert allowed.status_code == 200
    assert allowed.json()["degree"] == "MS"


def test_update_education_applies_partial_changes_only():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    education_id = client.post("/education", json=education_payload()).json()["education_id"]

    response = client.patch(f"/education/{education_id}", json={"GPA": 4.0})

    assert response.status_code == 200
    body = response.json()
    assert body["GPA"] == 4.0
    assert body["institution_name"] == "State University"
    assert body["major"] == "Computer Science"


def test_update_education_returns_404_for_missing_record():
    set_authenticated_user(str(uuid4()))

    response = client.patch(f"/education/{uuid4()}", json={"degree": "PhD"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Education record not found"


def test_update_education_rejects_end_date_before_start_date():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    education_id = client.post("/education", json=education_payload()).json()["education_id"]

    response = client.patch(
        f"/education/{education_id}",
        json={"start_date": "2022-01-01", "end_date": "2019-01-01", "is_current": False},
    )

    assert response.status_code == 422


def test_update_education_rejects_end_date_before_existing_start_date_when_only_end_date_patched():
    # S2-BR-015: patching only end_date without start_date must still validate
    # against the stored start_date (schema-level validator skips this case)
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    education_id = client.post(
        "/education", json=education_payload(start_date="2018-09-01", end_date="2022-05-15")
    ).json()["education_id"]

    response = client.patch(
        f"/education/{education_id}",
        json={"end_date": "2010-01-01"},
    )

    assert response.status_code == 422


def test_update_education_rejects_empty_institution_name():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    education_id = client.post("/education", json=education_payload()).json()["education_id"]

    response = client.patch(f"/education/{education_id}", json={"institution_name": ""})

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


def test_delete_education_only_deletes_owned_records():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    education_id = client.post("/education", json=education_payload()).json()["education_id"]

    set_authenticated_user(other_id)
    denied = client.delete(f"/education/{education_id}")
    assert denied.status_code == 404

    set_authenticated_user(owner_id)
    allowed = client.delete(f"/education/{education_id}")
    assert allowed.status_code == 204

    assert client.get("/education").json() == []


def test_delete_education_returns_404_for_missing_record():
    set_authenticated_user(str(uuid4()))

    response = client.delete(f"/education/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Education record not found"


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------


def test_reorder_education_updates_position_numbers():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    id_a = client.post("/education", json=education_payload("First")).json()["education_id"]
    id_b = client.post("/education", json=education_payload("Second")).json()["education_id"]

    response = client.patch(
        "/education/reorder",
        json=[
            {"education_id": id_a, "position_number": 1},
            {"education_id": id_b, "position_number": 0},
        ],
    )

    assert response.status_code == 204
    record_a = next(e for e in education if str(e.education_id) == id_a)
    record_b = next(e for e in education if str(e.education_id) == id_b)
    assert record_a.position_number == 1
    assert record_b.position_number == 0


def test_reorder_education_ignores_entries_owned_by_other_users():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    owned_id = client.post("/education", json=education_payload()).json()["education_id"]

    # Another user attempts to reorder a record they do not own.
    set_authenticated_user(other_id)
    response = client.patch(
        "/education/reorder",
        json=[{"education_id": owned_id, "position_number": 5}],
    )

    assert response.status_code == 204
    untouched = next(e for e in education if str(e.education_id) == owned_id)
    assert untouched.position_number == 0
