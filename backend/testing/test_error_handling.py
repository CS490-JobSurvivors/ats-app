import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.services.error_handling import configure_logging, unhandled_exception_handler

app = FastAPI()
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/explode")
def explode():
    raise RuntimeError("Something went wrong internally")


@app.get("/ok")
def ok():
    return {"status": "ok"}


client = TestClient(app, raise_server_exceptions=False)


def test_unhandled_exception_returns_500():
    response = client.get("/explode")
    assert response.status_code == 500


def test_unhandled_exception_returns_structured_json():
    response = client.get("/explode")
    body = response.json()
    assert "error" in body
    assert "detail" in body


def test_unhandled_exception_does_not_leak_stack_trace():
    response = client.get("/explode")
    body = response.json()
    assert "Traceback" not in body.get("detail", "")
    assert "RuntimeError" not in body.get("detail", "")


def test_normal_route_is_unaffected():
    response = client.get("/ok")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unhandled_exception_is_logged(caplog):
    with caplog.at_level(logging.ERROR, logger="ats"):
        client.get("/explode")
    assert any("Unhandled exception" in record.message for record in caplog.records)


def test_configure_logging_sets_up_root_logger():
    configure_logging()
    root_logger = logging.getLogger("ats")
    assert root_logger is not None


def test_error_response_error_field_is_human_readable():
    response = client.get("/explode")
    assert response.json()["error"] == "Internal server error"
