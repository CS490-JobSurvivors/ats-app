from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.skill import Skill
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
skills: list[Skill] = []


class FakeScalarResult:
    def __init__(self, items):
        self.items = items

    def all(self):
        return self.items


class FakeDb:
    def add(self, obj: Skill):
        if obj.skill_id is None:
            obj.skill_id = uuid4()
        skills.append(obj)

    def commit(self):
        return None

    def refresh(self, obj: Skill):
        pass

    def delete(self, obj: Skill):
        if obj in skills:
            skills.remove(obj)

    def scalars(self, query):
        params = query.compile().params
        user_id = str(params.get("skill_user_id_1", ""))
        return FakeScalarResult([s for s in skills if str(s.skill_user_id) == user_id])

    def scalar(self, query):
        compiled = query.compile()
        params = compiled.params
        sql = str(compiled)

        if "count" in sql.lower():
            user_id = str(params.get("skill_user_id_1", ""))
            return sum(1 for s in skills if str(s.skill_user_id) == user_id)

        if "lower" in sql.lower():
            user_id = str(params.get("skill_user_id_1", ""))
            name_lower = next(
                (v for k, v in params.items() if k not in ("skill_user_id_1", "skill_id_1")),
                None,
            )
            exclude_id = (
                str(params["skill_id_1"])
                if ("!=" in sql or "<>" in sql) and "skill_id_1" in params
                else None
            )
            for s in skills:
                if str(s.skill_user_id) != user_id:
                    continue
                if name_lower and s.skill_name.lower() != name_lower:
                    continue
                if exclude_id and str(s.skill_id) == exclude_id:
                    continue
                return s
            return None

        if "skill_id_1" in params and "skill_user_id_1" in params:
            for s in skills:
                if str(s.skill_id) == str(params["skill_id_1"]) and str(s.skill_user_id) == str(
                    params["skill_user_id_1"]
                ):
                    return s
            return None

        return None


def override_db():
    yield FakeDb()


def auth_user(user_id: str):
    return {"sub": user_id, "email": "skill-owner@example.com"}


def set_authenticated_user(user_id: str):
    app.dependency_overrides[get_current_user] = lambda: auth_user(user_id)


def setup_function():
    skills.clear()
    app.dependency_overrides[get_db] = override_db


def teardown_function():
    app.dependency_overrides.clear()


def skill_payload(name="Python", category="Programming", proficiency="Advanced"):
    return {"skill_name": name, "category": category, "proficiency": proficiency}


def test_create_skill_assigns_authenticated_user_as_owner():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post("/skills", json=skill_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["skill_name"] == "Python"
    assert body["category"] == "Programming"
    assert body["proficiency"] == "Advanced"
    assert body["skill_user_id"] == user_id


def test_create_skill_assigns_position_based_on_count():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    first = client.post("/skills", json=skill_payload("Python"))
    second = client.post("/skills", json=skill_payload("JavaScript"))

    assert first.json()["position_number"] == 0
    assert second.json()["position_number"] == 1


def test_create_skill_rejects_duplicate_name():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    client.post("/skills", json=skill_payload("Python"))
    response = client.post("/skills", json=skill_payload("python"))

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_create_skill_allows_same_name_for_different_users():
    user_a = str(uuid4())
    user_b = str(uuid4())

    set_authenticated_user(user_a)
    client.post("/skills", json=skill_payload("Python"))

    set_authenticated_user(user_b)
    response = client.post("/skills", json=skill_payload("Python"))

    assert response.status_code == 201


def test_create_skill_rejects_empty_name():
    set_authenticated_user(str(uuid4()))
    response = client.post(
        "/skills", json={"skill_name": "", "category": None, "proficiency": None}
    )
    assert response.status_code == 422


def test_list_skills_returns_only_owned_skills():
    user_a = str(uuid4())
    user_b = str(uuid4())

    set_authenticated_user(user_a)
    client.post("/skills", json=skill_payload("Python"))

    set_authenticated_user(user_b)
    client.post("/skills", json=skill_payload("JavaScript"))

    response = client.get("/skills")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["skill_name"] == "JavaScript"
    assert body[0]["skill_user_id"] == user_b


def test_update_skill_only_updates_owned_skills():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    skill_id = client.post("/skills", json=skill_payload("Python")).json()["skill_id"]

    set_authenticated_user(other_id)
    response = client.patch(f"/skills/{skill_id}", json={"skill_name": "Stolen"})
    assert response.status_code == 404

    set_authenticated_user(owner_id)
    response = client.patch(f"/skills/{skill_id}", json={"skill_name": "Python 3"})
    assert response.status_code == 200
    assert response.json()["skill_name"] == "Python 3"


def test_update_skill_rejects_duplicate_name():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    client.post("/skills", json=skill_payload("Python"))
    skill_id = client.post("/skills", json=skill_payload("JavaScript")).json()["skill_id"]

    response = client.patch(f"/skills/{skill_id}", json={"skill_name": "python"})
    assert response.status_code == 409


def test_update_skill_allows_renaming_to_same_name():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    skill_id = client.post("/skills", json=skill_payload("Python")).json()["skill_id"]
    response = client.patch(f"/skills/{skill_id}", json={"skill_name": "Python"})

    assert response.status_code == 200


def test_delete_skill_only_deletes_owned_skills():
    owner_id = str(uuid4())
    other_id = str(uuid4())

    set_authenticated_user(owner_id)
    skill_id = client.post("/skills", json=skill_payload("Python")).json()["skill_id"]

    set_authenticated_user(other_id)
    response = client.delete(f"/skills/{skill_id}")
    assert response.status_code == 404

    set_authenticated_user(owner_id)
    response = client.delete(f"/skills/{skill_id}")
    assert response.status_code == 204

    assert client.get("/skills").json() == []


def test_reorder_skills_updates_position_numbers():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    id_a = client.post("/skills", json=skill_payload("Python")).json()["skill_id"]
    id_b = client.post("/skills", json=skill_payload("JavaScript")).json()["skill_id"]

    response = client.patch(
        "/skills/reorder",
        json=[
            {"skill_id": id_a, "position_number": 1},
            {"skill_id": id_b, "position_number": 0},
        ],
    )
    assert response.status_code == 204

    skill_a = next(s for s in skills if str(s.skill_id) == id_a)
    skill_b = next(s for s in skills if str(s.skill_id) == id_b)
    assert skill_a.position_number == 1
    assert skill_b.position_number == 0
