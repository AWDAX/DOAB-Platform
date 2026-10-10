"""Administrative boundaries.

GAUL 2024 is the preferred source. Set GAUL_GEOJSON to a GeoJSON file of
GAUL level 1 or 2 (properties should include a state and, when present, a
district name). When that file is absent the service exposes only the labelled
pilot box and does not pretend the box is a GAUL polygon.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from .config import PILOT_BBOX, RAW_DIR

GAUL_ENV = "GAUL_GEOJSON"


def pilot_polygon() -> dict:
    box = PILOT_BBOX
    ring = [
        [box["min_lng"], box["min_lat"]],
        [box["max_lng"], box["min_lat"]],
        [box["max_lng"], box["max_lat"]],
        [box["min_lng"], box["max_lat"]],
        [box["min_lng"], box["min_lat"]],
    ]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "Bengaluru labelled pilot",
                    "level": "pilot",
                    "source": "labelled_complaint_bbox",
                    "note": "Not a GAUL boundary. Predictions outside this box are insufficient_data.",
                },
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }
        ],
    }


def gaul_path() -> Path | None:
    configured = os.getenv(GAUL_ENV)
    if configured:
        path = Path(configured)
        return path if path.is_file() else None
    default = RAW_DIR / "boundaries" / "gaul2024_india.geojson"
    return default if default.is_file() else None


def _ring_contains(ring: list, lng: float, lat: float) -> bool:
    """Ray cast. ring is a list of [lng, lat] positions, closed or open."""
    inside = False
    count = len(ring)
    if count < 3:
        return False
    j = count - 1
    for i in range(count):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        intersects = ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def _geometry_contains(geometry: dict, lng: float, lat: float) -> bool:
    kind = geometry.get("type")
    coords = geometry.get("coordinates") or []
    if kind == "Polygon":
        if not coords or not _ring_contains(coords[0], lng, lat):
            return False
        return not any(_ring_contains(hole, lng, lat) for hole in coords[1:])
    if kind == "MultiPolygon":
        return any(_geometry_contains({"type": "Polygon", "coordinates": poly}, lng, lat) for poly in coords)
    return False


def load_boundaries() -> dict:
    path = gaul_path()
    if path is None:
        payload = pilot_polygon()
        payload["source"] = "pilot_bbox"
        payload["gaul_loaded"] = False
        return payload
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["source"] = "gaul2024"
    payload["gaul_loaded"] = True
    payload["path"] = str(path)
    return payload


def locate(lat: float, lng: float, collection: dict | None = None) -> dict:
    """Return the containing feature's name fields, or an empty match."""
    collection = collection if collection is not None else load_boundaries()
    for feature in collection.get("features", []):
        geometry = feature.get("geometry") or {}
        if _geometry_contains(geometry, lng, lat):
            props = feature.get("properties") or {}
            return {
                "matched": True,
                "name": props.get("name") or props.get("ADM1_NAME") or props.get("ADM0_NAME"),
                "district": props.get("district") or props.get("ADM2_NAME"),
                "source": collection.get("source", "unknown"),
            }
    return {"matched": False, "name": None, "district": None, "source": collection.get("source", "unknown")}
