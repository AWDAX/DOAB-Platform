"""Local demo of the estimate API. No network and no emergency calls."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    client = TestClient(app)
    health = client.get("/health")
    print("health", health.status_code, health.json())
    forecast = client.get(
        "/forecast",
        params={"min_lat": 28.4, "max_lat": 28.8, "min_lng": 77.0, "max_lng": 77.4},
    )
    body = forecast.json()
    print("delhi_box", body.get("data_quality"), body.get("reason"), "cells", len(body.get("cells", [])))
    routes = client.post(
        "/routes",
        json={"origin_lat": 12.97, "origin_lng": 77.59, "destination_lat": 12.93, "destination_lng": 77.62},
    )
    route = routes.json()["routes"][0]
    print("route_scored", routes.json()["scored"], "url_starts", route["maps_url"][:48])
    print("done. Delhi is outside the labelled box, so it must not receive an invented probability.")


if __name__ == "__main__":
    main()
