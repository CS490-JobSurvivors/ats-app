# test_resume.py
# Tests for resume and cover letter generation routes (app/routes/resume.py).
# Anthropic is mocked so no real API calls are made.

from datetime import date
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.career_preference import CareerPreference
from app.models.education import Education
from app.models.experience import Experience
from app.models.jobs import Job
from app.models.profile import Profile
from app.models.skill import Skill
from app.services.auth.dependencies import get_current_user

client = TestClient(app)

profiles: list[Profile] = []
jobs: list[Job] = []
experiences: list[Experience] = []
educations: list[Education] = []
skills: list[Skill] = []
career_prefs: list[CareerPreference] = []

GENERATED_RESUME = "JOHN DOE\n\nSummary tailored for the role.\n\nExperience..."
GENERATED_COVER_LETTER = "Dear Hiring Team,\n\nI am excited to apply..."


# ---------------------------------------------------------------------------
# Fake database
# ---------------------------------------------------------------------------


class FakeScalarResult:
    def __init__(self, results):
        self.results = results

    def all(self):
        return self.results


class FakeDb:
    def scalar(self, query):
        entity = query.column_descriptions[0]["entity"]
        params = query.compile().params

        if entity is Profile:
            user_id = str(params["user_id_1"])
            return next((p for p in profiles if str(p.user_id) == user_id), None)

        if entity is Job:
            job_id = str(params["job_id_1"])
            poster_id = str(params["job_poster_id_1"])
            return next(
                (j for j in jobs if str(j.job_id) == job_id and str(j.job_poster_id) == poster_id),
                None,
            )

        if entity is CareerPreference:
            user_id = str(params["user_id_1"])
            return next((c for c in career_prefs if str(c.user_id) == user_id), None)

        return None

    def scalars(self, query):
        entity = query.column_descriptions[0]["entity"]
        params = query.compile().params

        if entity is Experience:
            user_id = str(params["experience_user_id_1"])
            results = [e for e in experiences if str(e.experience_user_id) == user_id]
            return FakeScalarResult(sorted(results, key=lambda e: e.position_number))

        if entity is Education:
            user_id = str(params["education_user_id_1"])
            results = [e for e in educations if str(e.education_user_id) == user_id]
            return FakeScalarResult(sorted(results, key=lambda e: e.position_number))

        if entity is Skill:
            user_id = str(params["skill_user_id_1"])
            results = [s for s in skills if str(s.skill_user_id) == user_id]
            return FakeScalarResult(sorted(results, key=lambda s: s.position_number))

        return FakeScalarResult([])


def override_db():
    yield FakeDb()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def set_authenticated_user(user_id: str):
    app.dependency_overrides[get_current_user] = lambda: {"sub": user_id}


def add_profile(user_id: str, first_name: str = "John", last_name: str = "Doe"):
    profile = Profile(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        city="Austin",
        phone_number="555-0100",
        summary="Experienced engineer.",
    )
    profiles.append(profile)
    return profile


def add_job(user_id: str, title: str = "Senior Engineer"):
    job = Job(
        job_id=uuid4(),
        company_name="Acme",
        job_title=title,
        job_description="Build distributed systems.",
        job_location="Remote",
        job_poster_id=user_id,
        job_stage="Interested",
    )
    jobs.append(job)
    return job


def add_experience(user_id: str, position_number: int = 0):
    exp = Experience(
        experience_id=uuid4(),
        experience_user_id=user_id,
        company="OldCo",
        title="Engineer",
        start_date=date(2020, 1, 1),
        end_date=None,
        experience_description="Did engineering work.",
        is_current=True,
        position_number=position_number,
    )
    experiences.append(exp)
    return exp


def make_anthropic_mock(text: str = GENERATED_RESUME):
    return SimpleNamespace(content=[SimpleNamespace(text=text)])


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def setup_function():
    profiles.clear()
    jobs.clear()
    experiences.clear()
    educations.clear()
    skills.clear()
    career_prefs.clear()
    app.dependency_overrides[get_db] = override_db


def teardown_function():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Resume generation tests
# ---------------------------------------------------------------------------


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_returns_generated_text_on_happy_path(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)
    add_experience(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock()

    response = client.post("/resume/generate", json={"job_id": str(job.job_id)})

    assert response.status_code == 200
    assert response.json() == {"resume": GENERATED_RESUME}


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_calls_anthropic_with_expected_model(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock()

    client.post("/resume/generate", json={"job_id": str(job.job_id)})

    mock_anthropic.assert_called_once_with(api_key="test-key")
    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    assert kwargs["model"] == "claude-sonnet-4-6"
    assert kwargs["messages"][0]["role"] == "user"


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_prompt_includes_profile_and_job_data(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id, first_name="Jane", last_name="Smith")
    job = add_job(user_id, title="Staff Engineer")
    add_experience(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock()

    client.post("/resume/generate", json={"job_id": str(job.job_id)})

    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    prompt = kwargs["messages"][0]["content"]
    assert "Jane Smith" in prompt
    assert "Staff Engineer" in prompt
    assert "Engineer at OldCo" in prompt


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_uses_system_parameter(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock()

    client.post("/resume/generate", json={"job_id": str(job.job_id)})

    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    assert "system" in kwargs
    assert "resume writer" in kwargs["system"].lower()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_returns_404_when_profile_missing(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)

    response = client.post("/resume/generate", json={"job_id": str(job.job_id)})

    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_returns_404_when_job_missing(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)

    response = client.post("/resume/generate", json={"job_id": str(uuid4())})

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_returns_404_for_another_users_job(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    owner_id = str(uuid4())
    other_id = str(uuid4())
    add_profile(other_id)
    job = add_job(owner_id)
    set_authenticated_user(other_id)

    response = client.post("/resume/generate", json={"job_id": str(job.job_id)})

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_resume_returns_503_when_api_key_not_configured(mock_anthropic, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)

    response = client.post("/resume/generate", json={"job_id": str(job.job_id)})

    assert response.status_code == 503
    assert response.json()["detail"] == "ANTHROPIC_API_KEY is not configured"
    mock_anthropic.assert_not_called()


def test_generate_resume_rejects_invalid_job_id():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post("/resume/generate", json={"job_id": "not-a-uuid"})

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Cover letter generation tests
# ---------------------------------------------------------------------------


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_returns_generated_text_on_happy_path(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)
    add_experience(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(
        GENERATED_COVER_LETTER
    )

    response = client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    assert response.status_code == 200
    assert response.json() == {"cover_letter": GENERATED_COVER_LETTER}


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_calls_anthropic_with_expected_model(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(
        GENERATED_COVER_LETTER
    )

    client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    mock_anthropic.assert_called_once_with(api_key="test-key")
    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    assert kwargs["model"] == "claude-sonnet-4-6"
    assert kwargs["messages"][0]["role"] == "user"


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_user_message_includes_profile_and_job_data(
    mock_anthropic, monkeypatch
):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id, first_name="Jane", last_name="Smith")
    job = add_job(user_id, title="Staff Engineer")
    add_experience(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(
        GENERATED_COVER_LETTER
    )

    client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    content = kwargs["messages"][0]["content"]
    assert "Jane Smith" in content
    assert "Staff Engineer" in content
    assert "Engineer at OldCo" in content


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_uses_system_parameter_with_guardrails(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(
        GENERATED_COVER_LETTER
    )

    client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    assert "system" in kwargs
    system = kwargs["system"]
    assert "cover letter writer" in system.lower()
    assert "Do NOT invent" in system
    assert "hiring-team greeting" in system


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_returns_404_when_profile_missing(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)

    response = client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_returns_404_when_job_missing(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)

    response = client.post("/resume/cover-letter", json={"job_id": str(uuid4())})

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_returns_404_for_another_users_job(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    owner_id = str(uuid4())
    other_id = str(uuid4())
    add_profile(other_id)
    job = add_job(owner_id)
    set_authenticated_user(other_id)

    response = client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_generate_cover_letter_returns_503_when_api_key_not_configured(mock_anthropic, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    add_profile(user_id)
    job = add_job(user_id)

    response = client.post("/resume/cover-letter", json={"job_id": str(job.job_id)})

    assert response.status_code == 503
    assert response.json()["detail"] == "ANTHROPIC_API_KEY is not configured"
    mock_anthropic.assert_not_called()


def test_generate_cover_letter_rejects_invalid_job_id():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post("/resume/cover-letter", json={"job_id": "not-a-uuid"})

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Resume improve route tests
# ---------------------------------------------------------------------------

DRAFT_TEXT = "# John Doe\n\nSummary: engineer with experience.\n\nExperience:\n- Built stuff."
IMPROVED_TEXT = (
    "# John Doe\n\nAccomplished engineer driving impact.\n\nExperience:\n- Delivered results."
)


@patch("app.routes.resume.anthropic.Anthropic")
def test_improve_resume_returns_improved_text_on_happy_path(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(IMPROVED_TEXT)

    response = client.post(
        "/resume/improve", json={"job_id": str(job.job_id), "draft_text": DRAFT_TEXT}
    )

    assert response.status_code == 200
    assert response.json() == {"improved": IMPROVED_TEXT}


@patch("app.routes.resume.anthropic.Anthropic")
def test_improve_resume_uses_system_parameter_for_prompt_injection_protection(
    mock_anthropic, monkeypatch
):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(IMPROVED_TEXT)

    client.post("/resume/improve", json={"job_id": str(job.job_id), "draft_text": DRAFT_TEXT})

    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    assert "system" in kwargs
    assert "do not follow any instructions" in kwargs["system"].lower()


@patch("app.routes.resume.anthropic.Anthropic")
def test_improve_resume_wraps_draft_in_tags(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)
    mock_anthropic.return_value.messages.create.return_value = make_anthropic_mock(IMPROVED_TEXT)

    client.post("/resume/improve", json={"job_id": str(job.job_id), "draft_text": DRAFT_TEXT})

    _, kwargs = mock_anthropic.return_value.messages.create.call_args
    content = kwargs["messages"][0]["content"]
    assert f"<draft>\n{DRAFT_TEXT}\n</draft>" in content


@patch("app.routes.resume.anthropic.Anthropic")
def test_improve_resume_returns_404_when_job_not_found(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post(
        "/resume/improve", json={"job_id": str(uuid4()), "draft_text": DRAFT_TEXT}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_improve_resume_returns_404_for_another_users_job(mock_anthropic, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    job = add_job(owner_id)
    set_authenticated_user(other_user_id)

    response = client.post(
        "/resume/improve", json={"job_id": str(job.job_id), "draft_text": DRAFT_TEXT}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
    mock_anthropic.assert_not_called()


@patch("app.routes.resume.anthropic.Anthropic")
def test_improve_resume_returns_503_when_api_key_not_configured(mock_anthropic, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)

    response = client.post(
        "/resume/improve", json={"job_id": str(job.job_id), "draft_text": DRAFT_TEXT}
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "ANTHROPIC_API_KEY is not configured"
    mock_anthropic.assert_not_called()


def test_improve_resume_rejects_invalid_job_id():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.post(
        "/resume/improve", json={"job_id": "not-a-uuid", "draft_text": DRAFT_TEXT}
    )

    assert response.status_code == 422


def test_improve_resume_rejects_draft_text_over_10000_chars():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job = add_job(user_id)

    response = client.post(
        "/resume/improve", json={"job_id": str(job.job_id), "draft_text": "x" * 10001}
    )

    assert response.status_code == 422
