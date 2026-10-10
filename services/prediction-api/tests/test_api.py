from fastapi.testclient import TestClient

from app.main import app


def test_health_and_contract(monkeypatch):
    monkeypatch.delenv("GOOGLE_ROUTES_API_KEY", raising=False)
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    forecast = client.get("/forecast", params={"min_lat": 28, "max_lat": 29, "min_lng": 77, "max_lng": 78})
    assert forecast.status_code == 200
    body = forecast.json()
    assert body["data_quality"] == "insufficient_data"
    assert body["horizon_hours"] == 1
    assert body["cells"] == []

    oversized = client.get("/forecast", params={"min_lat": 0, "max_lat": 20, "min_lng": 70, "max_lng": 90})
    assert oversized.status_code == 422

    routes = client.post(
        "/routes",
        json={"origin_lat": 12.97, "origin_lng": 77.59, "destination_lat": 13.0, "destination_lng": 77.6},
    )
    assert routes.status_code == 200
    payload = routes.json()
    assert payload["routes"][0]["maps_url"].startswith("https://")
    assert "googleapis" not in payload["routes"][0]["maps_url"]
