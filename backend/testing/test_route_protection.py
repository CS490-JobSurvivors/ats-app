from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_protected_route_rejects_missing_token():
    response = client.get("/protected/test")
    assert response.status_code == 401

    assert response.json() == {"detail": "Missing authorization token"}


def test_protected_route_rejects_invalid_token():
    response = client.get("/protected/test", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401

    assert response.json() == {"detail": "Invalid token"}


def test_protected_route_accepts_valid_token(monkeypatch):
    monkeypatch.setattr(
        "app.services.auth.dependencies.verify_supabase_jwt",
        lambda token: {"sub": "test-user-id", "email": "test@example.com"},
    )

    response = client.get("/protected/test", headers={"Authorization": "Bearer valid_token"})
    assert response.status_code == 200

    assert response.json()["message"] == "Protected route accessed"
    assert response.json()["user"]["sub"] == "test-user-id"
