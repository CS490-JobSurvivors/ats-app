from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.followup import FollowUp
from app.models.interviews import Interview
from app.models.job_stage_history import JobStageHistory
from app.models.jobs import Job
from app.services.auth.dependencies import get_current_user

client = TestClient(app)
jobs: list[Job] = []
stage_histories: list[JobStageHistory] = []
followups: list[FollowUp] = []
interviews: list[Interview] = []
documents: list[Document] = []
document_versions: list[DocumentVersion] = []
active_user_id = ""


class FakeScalarResult:
    def __init__(self, results):
        self.results = results

    def all(self):
        return self.results


class FakeDb:
    def add(self, obj: Job | JobStageHistory | Interview | FollowUp | Document):
        if isinstance(obj, JobStageHistory):
            if obj.job_history_id is None:
                obj.job_history_id = uuid4()
            if obj.changed_at is None:
                obj.changed_at = datetime.now(UTC)
            stage_histories.append(obj)
            return
        if isinstance(obj, Interview):
            if obj.interview_id is None:
                obj.interview_id = uuid4()
            interviews.append(obj)
            return
        if isinstance(obj, FollowUp):
            if obj.followup_id is None:
                obj.followup_id = uuid4()
            if obj.created_at is None:
                obj.created_at = datetime.now(UTC)
            followups.append(obj)
            return
        if isinstance(obj, Document):
            if obj.document_id is None:
                obj.document_id = uuid4()
            if obj.created_at is None:
                obj.created_at = datetime.now(UTC)
            if obj.status is None:
                obj.status = "active"
            if obj.tags is None:
                obj.tags = []
            documents.append(obj)
            return
        if isinstance(obj, DocumentVersion):
            if obj.version_id is None:
                obj.version_id = uuid4()
            if obj.created_at is None:
                obj.created_at = datetime.now(UTC)
            document_versions.append(obj)
            return
        if obj.job_id is None:
            obj.job_id = uuid4()
        if obj.created_at is None:
            obj.created_at = datetime.now(UTC)
        if obj.updated_at is None:
            obj.updated_at = datetime.now(UTC)
        jobs.append(obj)

    def commit(self):
        return None

    def refresh(self, obj: Job | JobStageHistory | Interview | FollowUp | Document):
        # Only Job stamps updated_at on refresh. Documents manage updated_at
        # explicitly in the route, so refreshing must not fabricate one --
        # otherwise a freshly created document would look like it was edited.
        if isinstance(obj, Job):
            obj.updated_at = datetime.now(UTC)

    def scalars(self, query):
        entity = query.column_descriptions[0]["entity"]
        params = query.compile().params

        if entity is Job:
            user_id = str(params["job_poster_id_1"])
            return FakeScalarResult([job for job in jobs if str(job.job_poster_id) == user_id])

        if entity is JobStageHistory:
            job_id = str(params["job_id_1"])
            results = [history for history in stage_histories if str(history.job_id) == job_id]
            return FakeScalarResult(sorted(results, key=lambda history: history.changed_at))

        if entity is FollowUp:
            job_id = str(params["job_id_1"])
            user_id = str(params["user_id_1"])
            results = [
                followup
                for followup in followups
                if str(followup.job_id) == job_id and str(followup.user_id) == user_id
            ]
            return FakeScalarResult(sorted(results, key=lambda followup: followup.due_date))

        if entity is Interview:
            job_id = str(params["job_id_1"])
            user_id = str(params["user_id_1"])
            results = [
                interview
                for interview in interviews
                if str(interview.job_id) == job_id and str(interview.user_id) == user_id
            ]
            return FakeScalarResult(
                sorted(results, key=lambda interview: interview.scheduled_at_date)
            )

        if entity is Document:
            user_id = str(params["user_id_1"])
            results = [document for document in documents if str(document.user_id) == user_id]
            for document in results:
                if document.status is None:
                    document.status = "active"
            if "job_id_1" in params:
                job_id = str(params["job_id_1"])
                results = [document for document in results if str(document.job_id) == job_id]
            if "status_1" in params:
                status = params["status_1"]
                results = [
                    document
                    for document in results
                    if (document.status or "active") == status
                ]
            if "doc_type_1" in params:
                allowed_types = set()
                for key, value in params.items():
                    if not key.startswith("doc_type_"):
                        continue
                    if isinstance(value, (list, tuple, set)):
                        allowed_types.update(value)
                    else:
                        allowed_types.add(value)
                results = [document for document in results if document.doc_type in allowed_types]
            return FakeScalarResult(
                sorted(results, key=lambda document: document.created_at, reverse=True)
            )

        if entity is DocumentVersion:
            document_id = str(params["document_id_1"])
            results = [v for v in document_versions if str(v.document_id) == document_id]
            return FakeScalarResult(sorted(results, key=lambda v: v.version_number, reverse=True))

        return FakeScalarResult([])

    def scalar(self, query):
        entity = query.column_descriptions[0]["entity"]
        params = query.compile().params

        if "job_history_id_1" in params:
            for history in stage_histories:
                if str(history.job_history_id) == str(params["job_history_id_1"]) and str(
                    history.job_id
                ) == str(params["job_id_1"]):
                    return history

            return None

        if entity is JobStageHistory:
            job_id = str(params["job_id_1"])
            results = [history for history in stage_histories if str(history.job_id) == job_id]
            if not results:
                return None

            return max(results, key=lambda history: history.changed_at)

        if entity is Interview:
            for interview in interviews:
                if (
                    str(interview.interview_id) == str(params["interview_id_1"])
                    and str(interview.job_id) == str(params["job_id_1"])
                    and str(interview.user_id) == str(params["user_id_1"])
                ):
                    return interview

            return None

        if entity is FollowUp:
            for followup in followups:
                if (
                    str(followup.followup_id) == str(params["followup_id_1"])
                    and str(followup.job_id) == str(params["job_id_1"])
                    and str(followup.user_id) == str(params["user_id_1"])
                ):
                    return followup

            return None

        if entity is DocumentVersion:
            document_id = str(params["document_id_1"])
            nums = [
                v.version_number for v in document_versions if str(v.document_id) == document_id
            ]
            return max(nums) if nums else None

        if entity is Document:
            if "document_id_1" not in params:
                versions = [
                    document.doc_version
                    for document in documents
                    if str(document.job_id) == str(params["job_id_1"])
                    and str(document.user_id) == str(params["user_id_1"])
                    and document.doc_type == params["doc_type_1"]
                ]
                return max(versions) if versions else None

            for document in documents:
                if str(document.document_id) != str(params["document_id_1"]) or str(
                    document.user_id
                ) != str(params["user_id_1"]):
                    continue
                if "job_id_1" in params and str(document.job_id) != str(params["job_id_1"]):
                    continue
                if document.status is None:
                    document.status = "active"

                return document

            return None

        for job in jobs:
            if str(job.job_id) == str(params["job_id_1"]) and str(job.job_poster_id) == str(
                params["job_poster_id_1"]
            ):
                return job

        return None

    def delete(self, obj: Job | JobStageHistory | Interview | FollowUp | Document):
        if isinstance(obj, JobStageHistory):
            stage_histories.remove(obj)
            return
        if isinstance(obj, Interview):
            interviews.remove(obj)
            return
        if isinstance(obj, FollowUp):
            followups.remove(obj)
            return
        if isinstance(obj, Document):
            documents.remove(obj)
            return

        jobs.remove(obj)


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
    stage_histories.clear()
    followups.clear()
    interviews.clear()
    documents.clear()
    document_versions.clear()
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


def test_list_jobs_uses_latest_stage_history_as_current_stage():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    jobs[0].job_stage = "Applied"
    stage_histories.extend(
        [
            JobStageHistory(
                job_history_id=uuid4(),
                job_id=job_id,
                from_stage="Applied",
                to_stage="Offer",
                changed_by=user_id,
                changed_at=datetime(2026, 7, 4, tzinfo=UTC),
            ),
            JobStageHistory(
                job_history_id=uuid4(),
                job_id=job_id,
                from_stage="Offer",
                to_stage="Rejected",
                changed_by=user_id,
                changed_at=datetime(2026, 7, 5, tzinfo=UTC),
            ),
        ]
    )

    response = client.get("/jobs")

    assert response.status_code == 200
    body = response.json()
    assert body[0]["job_stage"] == "Rejected"
    assert jobs[0].job_stage == "Rejected"


def test_job_metrics_returns_zero_counts_when_no_jobs():
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    response = client.get("/jobs/metrics")

    assert response.status_code == 200
    body = response.json()
    assert body["total_applications"] == 0
    assert body["awaiting_response"] == 0
    assert body["responded"] == 0
    assert body["stage_counts"] == {
        "Interested": 0,
        "Applied": 0,
        "Interview": 0,
        "Offer": 0,
        "Rejected": 0,
        "Archived": 0,
    }


def test_job_metrics_computes_stage_counts_and_response_tracking():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    client.post("/jobs", json=create_job_payload("Interested Co"))
    for stage in ["Applied"]:
        response = client.post("/jobs", json=create_job_payload("Applied Co"))
        client.patch(f"/jobs/{response.json()['job_id']}", json={"job_stage": stage})
    for stage in ["Interview"]:
        response = client.post("/jobs", json=create_job_payload("Interview Co"))
        client.patch(f"/jobs/{response.json()['job_id']}", json={"job_stage": stage})
    for stage in ["Offer"]:
        response = client.post("/jobs", json=create_job_payload("Offer Co"))
        client.patch(f"/jobs/{response.json()['job_id']}", json={"job_stage": stage})

    response = client.get("/jobs/metrics")

    assert response.status_code == 200
    body = response.json()
    assert body["total_applications"] == 4
    assert body["awaiting_response"] == 1
    assert body["responded"] == 2
    assert body["stage_counts"] == {
        "Interested": 1,
        "Applied": 1,
        "Interview": 1,
        "Offer": 1,
        "Rejected": 0,
        "Archived": 0,
    }


def test_job_metrics_excludes_interested_and_archived_from_response_tracking():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    client.post("/jobs", json=create_job_payload("Interested Co"))
    archived_response = client.post("/jobs", json=create_job_payload("Archived Co"))
    client.patch(f"/jobs/{archived_response.json()['job_id']}", json={"job_stage": "Archived"})

    response = client.get("/jobs/metrics")

    assert response.status_code == 200
    body = response.json()
    assert body["total_applications"] == 2
    assert body["awaiting_response"] == 0
    assert body["responded"] == 0


def test_job_metrics_only_includes_owned_jobs():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    client.post("/jobs", json=create_job_payload("Owner Co"))

    set_authenticated_user(other_user_id)
    client.post("/jobs", json=create_job_payload("Other Co"))

    response = client.get("/jobs/metrics")

    assert response.status_code == 200
    assert response.json()["total_applications"] == 1


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


def test_job_activity_timeline_returns_key_events_for_owned_job():
    owner_id = str(uuid4())
    other_user_id = uuid4()
    set_authenticated_user(owner_id)
    create_response = client.post(
        "/jobs",
        json={**create_job_payload(), "job_stage": "Applied"},
    )
    assert create_response.status_code == 201
    job_id = create_response.json()["job_id"]

    now = datetime.now(UTC)
    stage_histories.append(
        JobStageHistory(
            job_id=job_id,
            from_stage="Interview",
            to_stage="Offer",
            changed_by=owner_id,
            changed_at=now + timedelta(days=12),
        )
    )
    followups.append(
        FollowUp(
            followup_id=uuid4(),
            job_id=job_id,
            user_id=owner_id,
            due_date=(now + timedelta(days=10)).date(),
            notes="Email recruiter",
            is_completed=False,
        )
    )
    interviews.append(
        Interview(
            interview_id=uuid4(),
            job_id=job_id,
            user_id=owner_id,
            scheduled_at_date=(now + timedelta(days=11)).date(),
            scheduled_at_time=now + timedelta(days=11),
            interview_notes="Technical round",
            round_type="Technical interview",
        )
    )
    followups.append(
        FollowUp(
            followup_id=uuid4(),
            job_id=job_id,
            user_id=other_user_id,
            due_date=(now + timedelta(days=13)).date(),
            notes="Other user's reminder",
            is_completed=False,
        )
    )

    response = client.get(f"/jobs/{job_id}/activity")

    assert response.status_code == 200
    body = response.json()
    event_types = [event["event_type"] for event in body]
    assert event_types == ["stage_change", "follow_up", "interview", "outcome"]
    assert [event["title"] for event in body] == [
        "Added to pipeline",
        "Follow-up",
        "Technical interview scheduled",
        "Offer received",
    ]
    assert body[1]["description"] == "Email recruiter (due)"
    assert body[2]["description"] == "Technical round"
    assert body[3]["can_delete"] is True


def test_job_activity_timeline_keeps_added_to_pipeline_when_stages_move_randomly():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    assert create_response.status_code == 201
    job_id = create_response.json()["job_id"]

    for stage in ["Applied", "Interview", "Offer", "Rejected", "Applied"]:
        response = client.patch(f"/jobs/{job_id}", json={"job_stage": stage})
        assert response.status_code == 200

    response = client.get(f"/jobs/{job_id}/activity")

    assert response.status_code == 200
    body = response.json()
    assert body[0]["title"] == "Added to pipeline"
    assert body[0]["event_type"] == "stage_change"
    assert body[0]["can_delete"] is False
    assert [event["description"] for event in body[1:]] == [
        "Interested to Applied",
        "Applied to Interview",
        "Interview to Offer",
        "Offer to Rejected",
        "Rejected to Applied",
    ]
    assert [event["can_delete"] for event in body[1:]] == [True, True, True, True, True]


def test_deleting_stage_history_keeps_added_to_pipeline_event():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    patch_response = client.patch(f"/jobs/{job_id}", json={"job_stage": "Applied"})
    assert patch_response.status_code == 200
    history_id = stage_histories[0].job_history_id

    delete_response = client.delete(f"/jobs/{job_id}/stage-history/{history_id}")
    activity_response = client.get(f"/jobs/{job_id}/activity")

    assert delete_response.status_code == 204
    assert activity_response.status_code == 200
    assert activity_response.json() == [
        {
            "event_id": f"job-created-{job_id}",
            "event_type": "stage_change",
            "title": "Added to pipeline",
            "description": "Software Engineer at Acme",
            "occurred_at": activity_response.json()[0]["occurred_at"],
            "can_delete": False,
        }
    ]


def test_job_activity_timeline_rejects_unowned_job():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    set_authenticated_user(other_user_id)
    response = client.get(f"/jobs/{job_id}/activity")

    assert response.status_code == 404


def test_delete_job_stage_history_removes_owned_history_entry():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    history_id = uuid4()
    stage_histories.append(
        JobStageHistory(
            job_history_id=history_id,
            job_id=job_id,
            from_stage="Applied",
            to_stage="Interview",
            changed_by=owner_id,
            changed_at=datetime(2026, 7, 4, tzinfo=UTC),
        )
    )

    response = client.delete(f"/jobs/{job_id}/stage-history/{history_id}")

    assert response.status_code == 204
    assert stage_histories == []


def test_delete_latest_stage_history_rolls_job_stage_back_before_next_transition():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    for stage in ["Applied", "Interview", "Offer", "Archived"]:
        response = client.patch(f"/jobs/{job_id}", json={"job_stage": stage})
        assert response.status_code == 200

    archived_history_id = stage_histories[-1].job_history_id
    delete_response = client.delete(f"/jobs/{job_id}/stage-history/{archived_history_id}")
    assert delete_response.status_code == 204
    assert jobs[0].job_stage == "Offer"

    rejected_response = client.patch(f"/jobs/{job_id}", json={"job_stage": "Rejected"})
    activity_response = client.get(f"/jobs/{job_id}/activity")

    assert rejected_response.status_code == 200
    assert rejected_response.json()["job_stage"] == "Rejected"
    assert stage_histories[-1].from_stage == "Offer"
    assert stage_histories[-1].to_stage == "Rejected"
    assert [event["description"] for event in activity_response.json()[1:]] == [
        "Interested to Applied",
        "Applied to Interview",
        "Interview to Offer",
        "Offer to Rejected",
    ]


def test_restoring_archived_job_preserves_interviews_and_followups():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    interview_response = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Technical",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
            "interview_notes": "Review system design.",
        },
    )
    assert interview_response.status_code == 201

    followups.append(
        FollowUp(
            followup_id=uuid4(),
            job_id=job_id,
            user_id=owner_id,
            due_date=date(2026, 7, 2),
            notes="Email recruiter",
            is_completed=False,
        )
    )

    archive_response = client.patch(f"/jobs/{job_id}", json={"job_stage": "Archived"})
    assert archive_response.status_code == 200
    assert archive_response.json()["job_stage"] == "Archived"

    archived_history_id = stage_histories[-1].job_history_id
    restore_response = client.delete(f"/jobs/{job_id}/stage-history/{archived_history_id}")
    assert restore_response.status_code == 204
    assert jobs[0].job_stage == "Interested"

    list_response = client.get(f"/jobs/{job_id}/interviews")
    assert [interview["round_type"] for interview in list_response.json()] == ["Technical"]
    assert [followup.job_id for followup in followups] == [job_id]


def test_delete_job_stage_history_rejects_unowned_job():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    history = JobStageHistory(
        job_history_id=uuid4(),
        job_id=job_id,
        from_stage="Applied",
        to_stage="Interview",
        changed_by=owner_id,
        changed_at=datetime(2026, 7, 4, tzinfo=UTC),
    )
    stage_histories.append(history)

    set_authenticated_user(other_user_id)
    response = client.delete(f"/jobs/{job_id}/stage-history/{history.job_history_id}")

    assert response.status_code == 404
    assert stage_histories == [history]


def test_create_and_list_job_interviews_for_owned_job():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    interview_response = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Technical",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
            "interview_notes": "Review system design.",
        },
    )
    list_response = client.get(f"/jobs/{job_id}/interviews")

    assert interview_response.status_code == 201
    body = interview_response.json()
    assert body["round_type"] == "Technical"
    assert body["scheduled_at_date"] == "2026-07-08"
    assert body["scheduled_at_time"] == "2026-07-08T15:30:00Z"
    assert body["interview_notes"] == "Review system design."
    assert body["job_id"] == job_id
    assert body["user_id"] == owner_id
    assert list_response.status_code == 200
    assert [interview["round_type"] for interview in list_response.json()] == ["Technical"]


def test_update_job_interview_only_updates_owned_interview():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    interview_response = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Phone screen",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
            "interview_notes": "Initial recruiter call.",
        },
    )
    interview_id = interview_response.json()["interview_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.patch(
        f"/jobs/{job_id}/interviews/{interview_id}",
        json={"round_type": "Unauthorized"},
    )

    set_authenticated_user(owner_id)
    update_response = client.patch(
        f"/jobs/{job_id}/interviews/{interview_id}",
        json={
            "round_type": "Final",
            "scheduled_at_date": "2026-07-10",
            "scheduled_at_time": "2026-07-10T18:00:00Z",
            "interview_notes": "Meet hiring manager.",
        },
    )

    assert denied_response.status_code == 404
    assert update_response.status_code == 200
    body = update_response.json()
    assert body["round_type"] == "Final"
    assert body["scheduled_at_date"] == "2026-07-10"
    assert body["scheduled_at_time"] == "2026-07-10T18:00:00Z"
    assert body["interview_notes"] == "Meet hiring manager."


def test_delete_job_interview_removes_owned_interview():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]
    interview_id = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Technical",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
        },
    ).json()["interview_id"]

    delete_response = client.delete(f"/jobs/{job_id}/interviews/{interview_id}")
    list_response = client.get(f"/jobs/{job_id}/interviews")

    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_delete_job_interview_rejects_non_owner():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]
    interview_id = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Phone screen",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
        },
    ).json()["interview_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.delete(f"/jobs/{job_id}/interviews/{interview_id}")

    set_authenticated_user(owner_id)
    still_exists = client.get(f"/jobs/{job_id}/interviews")

    assert denied_response.status_code == 404
    assert len(still_exists.json()) == 1


# ---------------------------------------------------------------------------
# S3-013: Interview preparation notes
# ---------------------------------------------------------------------------


def test_create_interview_with_prep_notes_persists_and_returns_prep_notes():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    response = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Technical",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
            "prep_notes": "Review system design patterns and practice LeetCode.",
        },
    )

    assert response.status_code == 201
    assert response.json()["prep_notes"] == "Review system design patterns and practice LeetCode."


def test_create_interview_without_prep_notes_defaults_to_null():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    response = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Phone screen",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
        },
    )

    assert response.status_code == 201
    assert response.json()["prep_notes"] is None


def test_update_interview_prep_notes_rejects_non_owner():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]
    interview_id = client.post(
        f"/jobs/{job_id}/interviews",
        json={
            "round_type": "Technical",
            "scheduled_at_date": "2026-07-08",
            "scheduled_at_time": "2026-07-08T15:30:00Z",
            "prep_notes": "Study graphs.",
        },
    ).json()["interview_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.patch(
        f"/jobs/{job_id}/interviews/{interview_id}",
        json={"prep_notes": "Unauthorized update."},
    )

    assert denied_response.status_code == 404
    assert interviews[0].prep_notes == "Study graphs."


def test_create_job_with_recruiter_notes():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {**create_job_payload(), "recruiter_notes": "Spoke with Jane from HR."}

    response = client.post("/jobs", json=payload)

    assert response.status_code == 201
    assert response.json()["recruiter_notes"] == "Spoke with Jane from HR."


def test_update_job_recruiter_notes():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    update_response = client.patch(
        f"/jobs/{job_id}",
        json={"recruiter_notes": "Follow up next Monday."},
    )

    assert update_response.status_code == 200
    assert update_response.json()["recruiter_notes"] == "Follow up next Monday."


def test_create_job_with_outcome_notes():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    payload = {**create_job_payload(), "outcome_notes": "Withdrew before final round."}

    response = client.post("/jobs", json=payload)

    assert response.status_code == 201
    assert response.json()["outcome_notes"] == "Withdrew before final round."


def test_update_job_outcome_notes_on_rejection():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    update_response = client.patch(
        f"/jobs/{job_id}",
        json={
            "job_stage": "Rejected",
            "outcome_notes": "Went with an internal candidate.",
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["job_stage"] == "Rejected"
    assert update_response.json()["outcome_notes"] == "Went with an internal candidate."


# ---------------------------------------------------------------------------
# S3-012: Company research notes
# ---------------------------------------------------------------------------


def test_create_job_with_company_research_notes_persists_and_returns_notes():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    notes = "Founded in 2020, 500 employees, strong RPG gamer culture."
    payload = {**create_job_payload(), "company_research_notes": notes}

    response = client.post("/jobs", json=payload)

    assert response.status_code == 201
    assert response.json()["company_research_notes"] == notes


def test_update_job_company_research_notes_via_patch():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    notes = (
        "Competes with Activision. Incredibly competitive culture, "
        "but they have slides on their website about work-life balance."
    )
    response = client.patch(
        f"/jobs/{job_id}",
        json={"company_research_notes": notes},
    )

    assert response.status_code == 200
    assert response.json()["company_research_notes"] == notes


def test_update_job_company_research_notes_rejects_non_owner():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    set_authenticated_user(other_user_id)
    response = client.patch(
        f"/jobs/{job_id}",
        json={"company_research_notes": "Unauthorized notes."},
    )

    assert response.status_code == 404


def test_create_and_list_job_followups_for_owned_job():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    followup_response = client.post(
        f"/jobs/{job_id}/followups",
        json={
            "due_date": "2026-07-08",
            "notes": "Email recruiter.",
            "is_completed": False,
        },
    )
    list_response = client.get(f"/jobs/{job_id}/followups")

    assert followup_response.status_code == 201
    body = followup_response.json()
    assert body["due_date"] == "2026-07-08"
    assert body["notes"] == "Email recruiter."
    assert body["is_completed"] is False
    assert body["job_id"] == job_id
    assert body["user_id"] == owner_id
    assert list_response.status_code == 200
    assert [followup["notes"] for followup in list_response.json()] == ["Email recruiter."]


def test_update_job_followup_only_updates_owned_followup():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    followup_response = client.post(
        f"/jobs/{job_id}/followups",
        json={
            "due_date": "2026-07-08",
            "notes": "Email recruiter.",
            "is_completed": False,
        },
    )
    followup_id = followup_response.json()["followup_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.patch(
        f"/jobs/{job_id}/followups/{followup_id}",
        json={"notes": "Unauthorized"},
    )

    set_authenticated_user(owner_id)
    update_response = client.patch(
        f"/jobs/{job_id}/followups/{followup_id}",
        json={
            "due_date": "2026-07-10",
            "notes": "Sent thank-you note.",
            "is_completed": True,
        },
    )

    assert denied_response.status_code == 404
    assert update_response.status_code == 200
    body = update_response.json()
    assert body["due_date"] == "2026-07-10"
    assert body["notes"] == "Sent thank-you note."
    assert body["is_completed"] is True


def test_delete_job_followup_only_deletes_owned_followup():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    followup_response = client.post(
        f"/jobs/{job_id}/followups",
        json={
            "due_date": "2026-07-08",
            "notes": "Email recruiter.",
            "is_completed": False,
        },
    )
    followup_id = followup_response.json()["followup_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.delete(f"/jobs/{job_id}/followups/{followup_id}")

    set_authenticated_user(owner_id)
    delete_response = client.delete(f"/jobs/{job_id}/followups/{followup_id}")
    list_response = client.get(f"/jobs/{job_id}/followups")

    assert denied_response.status_code == 404
    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_create_job_document_starts_at_version_one():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    response = client.post(
        f"/jobs/{job_id}/documents",
        json={
            "doc_type": "resume",
            "doc_title": "Resume - Software Engineer at Acme",
            "content": "## Resume\nTailored content.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["doc_type"] == "resume"
    assert body["doc_title"] == "Resume - Software Engineer at Acme"
    assert body["content"] == "## Resume\nTailored content."
    assert body["doc_version"] == 1
    assert body["status"] == "active"
    assert body["job_id"] == job_id
    assert body["user_id"] == user_id


def test_saving_same_doc_type_increments_version():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    first = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume v1", "content": "First draft."},
    )
    second = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume v2", "content": "Second draft."},
    )

    assert first.json()["doc_version"] == 1
    assert second.json()["doc_version"] == 2


def test_different_doc_types_version_independently():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]

    resume_response = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume", "content": "Resume draft."},
    )
    cover_letter_response = client.post(
        f"/jobs/{job_id}/documents",
        json={
            "doc_type": "cover_letter",
            "doc_title": "Cover Letter",
            "content": "Cover letter draft.",
        },
    )

    assert resume_response.json()["doc_version"] == 1
    assert cover_letter_response.json()["doc_version"] == 1


def test_list_job_documents_returns_only_that_jobs_documents():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    first_job = client.post("/jobs", json=create_job_payload("First Co")).json()["job_id"]
    second_job = client.post("/jobs", json=create_job_payload("Second Co")).json()["job_id"]

    client.post(
        f"/jobs/{first_job}/documents",
        json={"doc_type": "resume", "doc_title": "Resume for First Co", "content": "Draft."},
    )
    client.post(
        f"/jobs/{second_job}/documents",
        json={"doc_type": "resume", "doc_title": "Resume for Second Co", "content": "Draft."},
    )

    response = client.get(f"/jobs/{first_job}/documents")

    assert response.status_code == 200
    titles = [document["doc_title"] for document in response.json()]
    assert titles == ["Resume for First Co"]


def test_list_user_documents_returns_all_owned_resume_and_cover_letter_documents():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    first_job = client.post("/jobs", json=create_job_payload("First Co")).json()["job_id"]
    second_job = client.post("/jobs", json=create_job_payload("Second Co")).json()["job_id"]

    client.post(
        f"/jobs/{first_job}/documents",
        json={"doc_type": "resume", "doc_title": "Resume for First Co", "content": "Draft."},
    )
    client.post(
        f"/jobs/{second_job}/documents",
        json={
            "doc_type": "cover_letter",
            "doc_title": "Cover Letter for Second Co",
            "content": "Draft.",
        },
    )

    set_authenticated_user(other_user_id)
    other_job = client.post("/jobs", json=create_job_payload("Other Co")).json()["job_id"]
    client.post(
        f"/jobs/{other_job}/documents",
        json={"doc_type": "resume", "doc_title": "Other User Resume", "content": "Draft."},
    )

    set_authenticated_user(owner_id)
    response = client.get("/jobs/documents")

    assert response.status_code == 200
    titles = [document["doc_title"] for document in response.json()]
    assert titles == ["Cover Letter for Second Co", "Resume for First Co"]


def test_list_user_documents_filters_to_supported_business_types():
    user_id = str(uuid4())
    job_id = uuid4()
    set_authenticated_user(user_id)
    documents.extend(
        [
            Document(
                document_id=uuid4(),
                user_id=user_id,
                job_id=job_id,
                doc_type="resume",
                doc_title="Resume",
                content="Draft.",
                doc_version=1,
                status="active",
                tags=[],
                created_at=datetime(2026, 7, 1, tzinfo=UTC),
            ),
            Document(
                document_id=uuid4(),
                user_id=user_id,
                job_id=job_id,
                doc_type="portfolio",
                doc_title="Portfolio",
                content="Draft.",
                doc_version=1,
                status="active",
                tags=[],
                created_at=datetime(2026, 7, 2, tzinfo=UTC),
            ),
        ]
    )

    response = client.get("/jobs/documents")

    assert response.status_code == 200
    assert [document["doc_title"] for document in response.json()] == ["Resume"]


def test_archive_user_document_hides_it_without_changing_version_history():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    document_response = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume", "content": "Draft."},
    )
    document_id = document_response.json()["document_id"]

    archive_response = client.patch(f"/jobs/documents/{document_id}/archive")
    active_list_response = client.get("/jobs/documents")
    archived_list_response = client.get("/jobs/documents?include_archived=true")

    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"
    assert archive_response.json()["updated_at"] is not None
    assert archive_response.json()["doc_version"] == 1
    assert active_list_response.status_code == 200
    assert active_list_response.json() == []
    assert [document["document_id"] for document in archived_list_response.json()] == [document_id]
    assert len(documents) == 1


def test_restore_user_document_returns_it_to_active_library_without_changing_version():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    document_response = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "cover_letter", "doc_title": "Cover Letter", "content": "Draft."},
    )
    document_id = document_response.json()["document_id"]
    client.patch(f"/jobs/documents/{document_id}/archive")

    restore_response = client.patch(f"/jobs/documents/{document_id}/restore")
    active_list_response = client.get("/jobs/documents")

    assert restore_response.status_code == 200
    assert restore_response.json()["status"] == "active"
    assert restore_response.json()["updated_at"] is not None
    assert restore_response.json()["doc_version"] == 1
    assert [document["document_id"] for document in active_list_response.json()] == [document_id]
    assert len(documents) == 1


def test_archive_and_restore_user_document_reject_unowned_document():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    document_response = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume", "content": "Draft."},
    )
    document_id = document_response.json()["document_id"]

    set_authenticated_user(other_user_id)
    archive_response = client.patch(f"/jobs/documents/{document_id}/archive")
    restore_response = client.patch(f"/jobs/documents/{document_id}/restore")

    assert archive_response.status_code == 404
    assert restore_response.status_code == 404
    assert documents[0].status == "active"


def test_delete_job_document_archives_owned_document_without_hard_deleting():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    create_response = client.post("/jobs", json=create_job_payload())
    job_id = create_response.json()["job_id"]
    document_response = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume", "content": "Draft."},
    )
    document_id = document_response.json()["document_id"]

    set_authenticated_user(other_user_id)
    denied_response = client.delete(f"/jobs/{job_id}/documents/{document_id}")

    set_authenticated_user(owner_id)
    delete_response = client.delete(f"/jobs/{job_id}/documents/{document_id}")
    list_response = client.get(f"/jobs/{job_id}/documents")

    assert denied_response.status_code == 404
    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []
    assert len(documents) == 1
    assert documents[0].status == "archived"
    assert documents[0].doc_version == 1


# ---------------------------------------------------------------------------
# Document metadata: status, tags, updated_at (S3-002)
# ---------------------------------------------------------------------------


def seed_job_and_document(user_id: str, **document_overrides) -> tuple[str, dict]:
    """Create an owned job plus one document, returning (job_id, document_body)."""
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]
    payload = {"doc_type": "resume", "doc_title": "Resume", "content": "Draft."}
    payload.update(document_overrides)
    document = client.post(f"/jobs/{job_id}/documents", json=payload).json()
    return job_id, document


def test_create_job_document_defaults_to_active_status_and_no_tags():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    # Act
    _, document = seed_job_and_document(user_id)

    # Assert
    assert document["status"] == "active"
    assert document["tags"] == []


def test_create_job_document_persists_supplied_status_and_tags():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    supplied_tags = ["backend", "python"]

    # Act
    _, document = seed_job_and_document(user_id, status="draft", tags=supplied_tags)

    # Assert
    assert document["status"] == "draft"
    assert document["tags"] == supplied_tags


def test_create_job_document_leaves_updated_at_unset():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)

    # Act
    _, document = seed_job_and_document(user_id)

    # Assert
    assert document["updated_at"] is None


@pytest.mark.parametrize("invalid_status", ["deleted", "ACTIVE", "", "published"])
def test_create_job_document_rejects_unsupported_status(invalid_status: str):
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    # Act
    response = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume", "status": invalid_status},
    )

    # Assert
    assert response.status_code == 422


def test_update_job_document_updates_title_status_and_tags_together():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"doc_title": "Resume (final)", "status": "archived", "tags": ["senior", "remote"]},
    )

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["doc_title"] == "Resume (final)"
    assert body["status"] == "archived"
    assert body["tags"] == ["senior", "remote"]


def test_update_job_document_applies_partial_update_without_clearing_other_fields():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id, tags=["python"])

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"status": "draft"},
    )

    # Assert
    body = response.json()
    assert body["status"] == "draft"
    assert body["doc_title"] == "Resume"
    assert body["tags"] == ["python"]


def test_update_job_document_stamps_updated_at():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)
    assert document["updated_at"] is None

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"status": "archived"},
    )

    # Assert
    assert response.json()["updated_at"] is not None


def test_update_job_document_can_clear_tags_with_empty_list():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id, tags=["stale", "obsolete"])

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"tags": []},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["tags"] == []


def test_update_job_document_preserves_doc_version():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"doc_title": "Renamed", "status": "draft"},
    )

    # Assert
    assert response.json()["doc_version"] == document["doc_version"] == 1


def test_update_job_document_persists_change_for_subsequent_reads():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    # Act
    client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"status": "archived", "tags": ["filed"]},
    )
    listed = client.get(f"/jobs/{job_id}/documents").json()

    # Assert
    assert listed[0]["status"] == "archived"
    assert listed[0]["tags"] == ["filed"]


@pytest.mark.parametrize(
    "invalid_payload",
    [
        {"doc_title": ""},
        {"status": "deleted"},
        {"tags": "not-a-list"},
        {"tags": [1, 2]},
    ],
)
def test_update_job_document_rejects_invalid_payload(invalid_payload: dict):
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json=invalid_payload,
    )

    # Assert
    assert response.status_code == 422


def test_update_job_document_rejects_non_owner():
    # Arrange
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id, document = seed_job_and_document(owner_id)

    # Act
    set_authenticated_user(other_user_id)
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"status": "archived"},
    )

    # Assert
    assert response.status_code == 404


def test_update_job_document_returns_404_for_unknown_document():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, _ = seed_job_and_document(user_id)
    unknown_document_id = uuid4()

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{unknown_document_id}",
        json={"status": "archived"},
    )

    # Assert
    assert response.status_code == 404


def test_update_job_document_leaves_other_documents_untouched():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]
    resume = client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "resume", "doc_title": "Resume", "tags": ["keep"]},
    ).json()
    client.post(
        f"/jobs/{job_id}/documents",
        json={"doc_type": "cover_letter", "doc_title": "Cover Letter", "tags": ["keep"]},
    )

    # Act
    client.patch(
        f"/jobs/{job_id}/documents/{resume['document_id']}",
        json={"status": "archived", "tags": ["changed"]},
    )
    listed = client.get(f"/jobs/{job_id}/documents").json()

    # Assert
    cover_letter = next(doc for doc in listed if doc["doc_type"] == "cover_letter")
    assert cover_letter["status"] == "active"
    assert cover_letter["tags"] == ["keep"]


@pytest.mark.parametrize("null_field", ["status", "tags"])
def test_update_job_document_ignores_explicit_null_fields(null_field: str):
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    # Act
    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={null_field: None},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()[null_field] == document[null_field]


def test_update_job_document_explicit_null_doc_title_is_rejected():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    response = client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"doc_title": None},
    )

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Document version history (S3-003)
# ---------------------------------------------------------------------------


def test_list_document_versions_happy_path_returns_rows():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    response = client.get(f"/jobs/{job_id}/documents/{document['document_id']}/versions")

    assert response.status_code == 200
    versions = response.json()
    assert isinstance(versions, list)
    assert len(versions) >= 1
    assert "version_number" in versions[0]
    assert "document_id" in versions[0]
    assert "created_at" in versions[0]


def test_create_job_document_seeds_version_1():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    response = client.get(f"/jobs/{job_id}/documents/{document['document_id']}/versions")

    assert response.status_code == 200
    versions = response.json()
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1
    assert versions[0]["document_id"] == document["document_id"]


def test_patch_document_adds_version_with_incrementing_number():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id, document = seed_job_and_document(user_id)

    client.patch(
        f"/jobs/{job_id}/documents/{document['document_id']}",
        json={"doc_title": "Updated Title"},
    )

    response = client.get(f"/jobs/{job_id}/documents/{document['document_id']}/versions")

    assert response.status_code == 200
    versions = response.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1


def test_list_document_versions_returns_404_for_non_owner():
    owner_id = str(uuid4())
    set_authenticated_user(owner_id)
    job_id, document = seed_job_and_document(owner_id)

    other_user_id = str(uuid4())
    set_authenticated_user(other_user_id)

    response = client.get(f"/jobs/{job_id}/documents/{document['document_id']}/versions")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Stage transition integrity (S2-BR-008, S2-BR-009)
# ---------------------------------------------------------------------------


def test_stage_change_creates_history_record_with_from_and_to_stage():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    client.patch(f"/jobs/{job_id}", json={"job_stage": "Applied"})

    history = [h for h in stage_histories if str(h.job_id) == job_id]
    assert len(history) == 1
    assert history[0].from_stage == "Interested"
    assert history[0].to_stage == "Applied"


def test_stage_change_logs_changed_by_user_identity():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]

    client.patch(f"/jobs/{job_id}", json={"job_stage": "Applied"})

    history = [h for h in stage_histories if str(h.job_id) == job_id]
    assert len(history) == 1
    assert str(history[0].changed_by) == user_id


def test_stage_change_is_reflected_in_job_activity_timeline():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    job_id = client.post("/jobs", json=create_job_payload()).json()["job_id"]
    client.patch(f"/jobs/{job_id}", json={"job_stage": "Applied"})

    response = client.get(f"/jobs/{job_id}/activity")

    assert response.status_code == 200
    events = response.json()
    titles = [e["title"] for e in events]
    assert "Applied" in titles
