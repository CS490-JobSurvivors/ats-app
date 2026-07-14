import os

import pytest
import requests

if not os.environ.get("SMOKE_TEST_ENABLED"):
    pytest.skip("set SMOKE_TEST_ENABLED=1 to run smoke tests", allow_module_level=True)

BASE_URL = os.environ.get("SMOKE_TEST_URL", "https://api.jobsurvivors.tech")


def test_health_endpoint_returns_200():
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    assert r.status_code == 200


def test_health_endpoint_returns_json():
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    assert r.headers.get("content-type", "").startswith("application/json")


def test_protected_routes_reject_unauthenticated():
    for path in ["/auth/me", "/jobs", "/jobs/metrics", "/jobs/analytics", "/jobs/documents"]:
        r = requests.get(f"{BASE_URL}{path}", timeout=10)
        assert r.status_code in (401, 403), (
            f"{path} should require auth but returned {r.status_code}"
        )


def test_cors_allows_production_frontend():
    r = requests.options(
        f"{BASE_URL}/health",
        headers={
            "Origin": "https://jobsurvivors.tech",
            "Access-Control-Request-Method": "GET",
        },
        timeout=10,
    )
    assert "access-control-allow-origin" in r.headers


def test_unsupported_route_returns_404():
    r = requests.get(f"{BASE_URL}/nonexistent-route", timeout=10)
    assert r.status_code == 404
