from datetime import UTC, datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.jobs import Job
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
jobs: list[Job] = []
active_user_id = ""


class FakeScalarResult:
    def __init__(self, query):
        self.query = query

    def all(self):
        user_id = str(self.query.compile().params["job_poster_id_1"])

        return [job for job in jobs if str(job.job_poster_id) == user_id]


class FakeDb:
    def add(self, job: Job):
        if job.job_id is None:
            job.job_id = uuid4()
        if job.created_at is None:
            job.created_at = datetime.now(UTC)
        if job.updated_at is None:
            job.updated_at = datetime.now(UTC)

        jobs.append(job)

    def commit(self):
        return None

    def refresh(self, job: Job):
        job.updated_at = datetime.now(UTC)

    def scalars(self, _query):
        return FakeScalarResult(_query)

    def scalar(self, query):
        params = query.compile().params

        for job in jobs:
            if str(job.job_id) == str(params["job_id_1"]) and str(job.job_poster_id) == str(
                params["job_poster_id_1"]
            ):
                return job

        return None


def override_db():
    yield FakeDb()


def auth_user(user_id: str):
    return {"sub": user_id, "email": "job-owner@example.com"}


def set_authenticated_user(user_id: str):
    global active_user_id

    active_user_id = user_id
    app.dependency_overrides[get_current_user] = lambda: auth_user(user_id)


def create_job_payload(company: str = "Acme"):
    return {
        "company_name": company,
        "job_title": "Software Engineer",
        "job_description": "Build and maintain product features.",
        "application_link": "https://example.com/jobs/software-engineer",
        "job_location": "Remote",
        "deadline": "2026-07-15",
    }


def setup_function():
    jobs.clear()
    app.dependency_overrides[get_db] = override_db


def teardown_function():
    app.dependency_overrides.clear()


def test_create_job_assigns_authenticated_user_as_owner():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post("/jobs", json=create_job_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["company_name"] == "Acme"
    assert body["job_location"] == "Remote"
    assert body["deadline"] == "2026-07-15"
    assert body["job_stage"] == "Interested"
    assert body["job_poster_id"] == user_id


def test_create_job_rejects_invalid_job_stage():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {**create_job_payload(), "job_stage": "Not a real stage"}

    response = client.post("/jobs", json=payload)

    assert response.status_code == 422
    assert jobs == []


def test_list_jobs_returns_only_authenticated_users_jobs():
    first_user_id = str(uuid4())
    second_user_id = str(uuid4())

    set_authenticated_user(first_user_id)
    first_response = client.post("/jobs", json=create_job_payload("First User Company"))
    assert first_response.status_code == 201

    set_authenticated_user(second_user_id)
    second_response = client.post("/jobs", json=create_job_payload("Second User Company"))
    assert second_response.status_code == 201

    response = client.get("/jobs")

    assert response.status_code == 200
    user_jobs = response.json()
    assert len(user_jobs) == 1
    assert user_jobs[0]["company_name"] == "Second User Company"
    assert user_jobs[0]["job_stage"] == "Interested"
    assert user_jobs[0]["job_poster_id"] == second_user_id


def test_update_job_only_updates_owned_jobs():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.patch(
        f"/jobs/{job_id}",
        json={"job_title": "Unauthorized Update"},
    )

    assert denied_response.status_code == 404

    set_authenticated_user(owner_id)
    update_response = client.patch(
        f"/jobs/{job_id}",
        json={
            "job_title": "Senior Software Engineer",
            "job_stage": "Interview",
            "job_location": "New York",
            "deadline": "2026-08-01",
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["job_title"] == "Senior Software Engineer"
    assert update_response.json()["job_stage"] == "Interview"
    assert update_response.json()["job_location"] == "New York"
    assert update_response.json()["deadline"] == "2026-08-01"
