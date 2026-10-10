"""Route links and, when a server-side key is configured, scored alternatives.

Without GOOGLE_ROUTES_API_KEY the service returns one Google Maps directions URL
and marks it unscored. It does not invent a risk number for that link.
"""

from __future__ import annotations

import logging

import httpx

from .config import GOOGLE_ROUTES_URL, get_settings
from .predict import score_points

log = logging.getLogger(__name__)
MAX_WAYPOINTS = 3
MAX_SAMPLES = 24


def maps_directions_url(
    origin: tuple[float, float],
    destination: tuple[float, float],
    waypoints: list[tuple[float, float]] | None = None,
) -> str:
    start = f"{origin[0]},{origin[1]}"
    end = f"{destination[0]},{destination[1]}"
    url = (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={start}&destination={end}&travelmode=driving"
    )
    if waypoints:
        joined = "|".join(f"{lat},{lng}" for lat, lng in waypoints[:MAX_WAYPOINTS])
        url += f"&waypoints={joined}"
    return url


def decode_polyline(encoded: str) -> list[tuple[float, float]]:
    """Google encoded polyline to (lat, lng) pairs."""
    points: list[tuple[float, float]] = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)
    while index < length:
        for target in ("lat", "lng"):
            shift = 0
            result = 0
            while True:
                if index >= length:
                    return points
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            delta = ~(result >> 1) if result & 1 else result >> 1
            if target == "lat":
                lat += delta
            else:
                lng += delta
        points.append((lat / 1e5, lng / 1e5))
    return points


def _sample(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if len(points) <= MAX_SAMPLES:
        return points
    step = max(1, len(points) // MAX_SAMPLES)
    return points[::step][:MAX_SAMPLES]


def _mean_risk(points: list[tuple[float, float]]) -> tuple[float | None, str]:
    if not points:
        return None, "insufficient_data"
    scored = score_points(_sample(points))
    values = [cell["probability"] for cell in scored if cell.get("probability") is not None]
    if not values:
        return None, "insufficient_data"
    return round(sum(values) / len(values), 4), "ok"


def _google_alternatives(origin: tuple[float, float], destination: tuple[float, float], api_key: str) -> list[dict]:
    body = {
        "origin": {"location": {"latLng": {"latitude": origin[0], "longitude": origin[1]}}},
        "destination": {"location": {"latLng": {"latitude": destination[0], "longitude": destination[1]}}},
        "travelMode": "DRIVE",
        "computeAlternativeRoutes": True,
        "polylineQuality": "OVERVIEW",
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description",
    }
    response = httpx.post(GOOGLE_ROUTES_URL, json=body, headers=headers, timeout=20.0)
    response.raise_for_status()
    routes = []
    for route in response.json().get("routes", []):
        encoded = (route.get("polyline") or {}).get("encodedPolyline") or ""
        points = decode_polyline(encoded)
        risk, quality = _mean_risk(points)
        duration = route.get("duration") or "0s"
        seconds = int(str(duration).rstrip("s") or 0)
        routes.append(
            {
                "summary": route.get("description") or "Driving alternative",
                "distance_meters": route.get("distanceMeters"),
                "duration_seconds": seconds,
                "mean_risk": risk,
                "data_quality": quality,
                "scored": quality == "ok",
                "maps_url": maps_directions_url(origin, destination),
            }
        )
    routes.sort(key=lambda item: (item["mean_risk"] is None, item["mean_risk"] or 1, item["duration_seconds"]))
    return routes


def recommend_routes(origin: tuple[float, float], destination: tuple[float, float]) -> dict:
    url = maps_directions_url(origin, destination)
    key = get_settings().google_routes_api_key
    if not key:
        return {
            "scored": False,
            "label": "unscored",
            "reason": "GOOGLE_ROUTES_API_KEY is not set, so alternatives were not requested or ranked.",
            "routes": [
                {
                    "summary": "Direct driving link",
                    "distance_meters": None,
                    "duration_seconds": None,
                    "mean_risk": None,
                    "data_quality": "insufficient_data",
                    "scored": False,
                    "maps_url": url,
                    "rank": "unscored",
                }
            ],
        }
    try:
        routes = _google_alternatives(origin, destination, key)
    except httpx.HTTPError as exc:
        log.warning("Google Routes request failed: %s", exc)
        return {
            "scored": False,
            "label": "unscored",
            "reason": "The route provider did not respond. The link below is an unscored directions URL.",
            "routes": [
                {
                    "summary": "Direct driving link",
                    "distance_meters": None,
                    "duration_seconds": None,
                    "mean_risk": None,
                    "data_quality": "insufficient_data",
                    "scored": False,
                    "maps_url": url,
                    "rank": "unscored",
                }
            ],
        }
    for index, route in enumerate(routes):
        route["rank"] = "safest" if index == 0 and route["scored"] else "alternative"
    return {"scored": any(route["scored"] for route in routes), "label": "safety_then_time", "reason": None, "routes": routes}
