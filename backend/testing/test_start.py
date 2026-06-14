from fastapi.testclient import TestClient
from app.main import app

client = TestClient()

def someTestFunction(value):
    return f"This Response{value}"


def test_sampleTestOne():
    assert 1 == 1


def test_sampleTestTwo():
    parameter = "Mock Value"
    assert someTestFunction(parameter) == "This ResponseMock Value"


def test_sampleTestThree():
    parameter = ""
    assert someTestFunction(parameter) == "This Response"

# Test authentication endpoints
def test_auth_me_requires_token():
    # Send a request to the /auth/me endpoint without a token
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_auth_me_with_invalid_token():
    # Send a request to the /auth/me endpoint with an invalid token
    response = client.get("/auth/me", headers={"Authorization": "Bearer fake.token"})
    assert response.status_code == 401

