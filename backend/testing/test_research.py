from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.jobs import Job
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
jobs: list[Job] = []
active_user_id = ""


class FakeDb:
    def scalar(self, query):
        params = query.compile().params
        job_id = str(params.get("job_id_1", ""))
        poster_id = str(params.get("job_poster_id_1", ""))
        for job in jobs:
            if str(job.job_id) == job_id and str(job.job_poster_id) == poster_id:
                return job
        return None

    def scalars(self, query):
        params = query.compile().params
        poster_id = str(params.get("job_poster_id_1", ""))
        results = [job for job in jobs if str(job.job_poster_id) == poster_id]
        return type("FakeResult", (), {"all": lambda self: results})()

    def add(self, obj):
        pass

    def commit(self):
        pass

    def refresh(self, obj):
        pass


def get_fake_db():
    yield FakeDb()


def set_authenticated_user(user_id: str):
    global active_user_id
    active_user_id = user_id
    app.dependency_overrides[get_current_user] = lambda: {"sub": user_id}
    app.dependency_overrides[get_db] = get_fake_db


def make_fake_claude_response(text: str) -> MagicMock:
    content_block = MagicMock()
    content_block.text = text
    response = MagicMock()
    response.content = [content_block]
    return response


def seed_job(user_id: str) -> str:
    job = Job(
        job_title="Software Engineer",
        company_name="Acme Corp",
        job_stage="Interested",
        job_poster_id=user_id,
    )
    job.job_id = uuid4()
    jobs.append(job)
    return str(job.job_id)


def setup_function():
    jobs.clear()
    app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_research_returns_200_with_research_text():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = seed_job(user_id)

    fake_response = make_fake_claude_response("## Acme Corp\nGreat company to work for.")

    with patch("app.routes.research._get_anthropic_client") as mock_client:
        mock_client.return_value.messages.create.return_value = fake_response
        response = client.post(
            f"/jobs/{job_id}/research",
            json={"user_context": "What is their tech stack?"},
        )

    assert response.status_code == 200
    assert "research" in response.json()
    assert len(response.json()["research"]) > 0


def test_research_passes_company_and_role_to_claude():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = seed_job(user_id)

    fake_response = make_fake_claude_response("Some research output.")

    with patch("app.routes.research._get_anthropic_client") as mock_client:
        mock_instance = mock_client.return_value
        mock_instance.messages.create.return_value = fake_response
        client.post(
            f"/jobs/{job_id}/research",
            json={"user_context": "Tell me about their culture."},
        )
        call_kwargs = mock_instance.messages.create.call_args
        prompt = call_kwargs[1]["messages"][0]["content"]
        assert "Acme Corp" in prompt
        assert "Software Engineer" in prompt
        assert "Tell me about their culture." in prompt


# ---------------------------------------------------------------------------
# Failure / edge cases
# ---------------------------------------------------------------------------


def test_research_returns_404_for_non_owner():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = seed_job(owner_id)

    set_authenticated_user(str(uuid4()))
    response = client.post(
        f"/jobs/{job_id}/research",
        json={"user_context": "Tell me about their culture."},
    )

    assert response.status_code == 404


def test_research_returns_422_for_empty_context():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = seed_job(user_id)

    response = client.post(
        f"/jobs/{job_id}/research",
        json={"user_context": ""},
    )

    assert response.status_code == 422


def test_research_returns_503_when_api_key_missing():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = seed_job(user_id)

    with patch("app.routes.research.os.environ.get", return_value=None):
        response = client.post(
            f"/jobs/{job_id}/research",
            json={"user_context": "What is their tech stack?"},
        )

    assert response.status_code == 503


# ---------------------------------------------------------------------------
# Regression — existing job routes unaffected
# ---------------------------------------------------------------------------


def test_list_jobs_still_works_after_research_route_added():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.get("/jobs")
    assert response.status_code == 200
