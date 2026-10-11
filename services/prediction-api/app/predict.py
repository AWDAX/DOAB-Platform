"""Score points and a bounded grid for the next hour.

A point outside the labelled Bengaluru box, or a point missing weather or
elevation, is returned as insufficient_data. No risk number is invented there.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd

from .boundaries import locate
from .config import DEFAULT_MODEL_PATH, LOCAL_TIMEZONE, PILOT_BBOX, NATIONAL_CORRIDORS, get_settings
from .features import (
    FEATURE_COLUMNS,
    HOTSPOT_FEATURE,
    HotspotIndex,
    neighbor_points,
    terrain_features,
    time_features,
    weather_feature_table,
)
from .model import HOTSPOT_SCALE, _blend
from .weather import fetch_elevations, fetch_forecast_precip, weather_cell

KOLKATA = ZoneInfo(LOCAL_TIMEZONE)
_BUNDLE: dict | None = None
_LOAD_ERROR: str | None = None


def in_pilot(lat: float, lng: float) -> bool:
    """Check if point falls within any designated prediction corridor."""
    for box in NATIONAL_CORRIDORS.values():
        if box["min_lat"] <= lat <= box["max_lat"] and box["min_lng"] <= lng <= box["max_lng"]:
            return True
    return False


def load_bundle(force: bool = False) -> dict | None:
    global _BUNDLE, _LOAD_ERROR
    if _BUNDLE is not None and not force:
        return _BUNDLE
    path = get_settings().model_path
    if not path.is_file():
        path = DEFAULT_MODEL_PATH
    if not path.is_file():
        _BUNDLE = None
        _LOAD_ERROR = "model_not_ready"
        return None
    _BUNDLE = joblib.load(path)
    _BUNDLE["hotspot_index"] = HotspotIndex(_BUNDLE["case_lats"], _BUNDLE["case_lngs"])
    _LOAD_ERROR = None
    return _BUNDLE


def model_status() -> dict:
    bundle = load_bundle()
    if bundle is None:
        return {"ready": False, "reason": _LOAD_ERROR or "model_not_ready"}
    manifest = bundle["manifest"]
    return {"ready": True, "manifest": manifest}


def _now_local(now: datetime | None = None) -> datetime:
    if now is None:
        return datetime.now(KOLKATA).replace(minute=0, second=0, microsecond=0, tzinfo=None)
    if now.tzinfo is None:
        return now.replace(minute=0, second=0, microsecond=0)
    return now.astimezone(KOLKATA).replace(minute=0, second=0, microsecond=0, tzinfo=None)


def _confidence(lat: float, lng: float, bundle: dict) -> str:
    metres = bundle["hotspot_index"].nearest_metres(lat, lng)
    if metres <= 2_000:
        return "high"
    if metres <= 8_000:
        return "moderate"
    return "low"


def _factors(features: dict, medians: dict) -> list[dict]:
    picked = []
    for name in ("precip_1h", "precip_3h", "precip_24h", "precip_7d", "relief_index", HOTSPOT_FEATURE):
        value = float(features[name])
        median = float(medians.get(name, 0.0))
        if name == "relief_index":
            if value <= median:
                continue
            relation = "lower_than_surroundings"
        elif value < median:
            continue
        else:
            relation = "above_training_median"
        picked.append({"name": name, "value": round(value, 3), "relation": relation})
    return picked[:4]


def _insufficient(lat: float, lng: float, reason: str, target: datetime) -> dict:
    return {
        "lat": lat,
        "lng": lng,
        "probability": None,
        "confidence": None,
        "horizon_hours": 1,
        "target_time": target.isoformat(),
        "data_quality": "insufficient_data",
        "reason": reason,
        "factors": [],
        "admin": locate(lat, lng),
    }


def score_points(
    points: list[tuple[float, float]],
    now: datetime | None = None,
    precip_by_cell: dict | None = None,
    elevations: dict | None = None,
) -> list[dict]:
    """Score each (lat, lng) for the hour after `now` (default: current local hour)."""
    bundle = load_bundle()
    issue = _now_local(now)
    target = issue + timedelta(hours=1)
    results: list[dict] = []
    if bundle is None:
        return [_insufficient(lat, lng, "model_not_ready", target) for lat, lng in points]

    pending: list[tuple[int, float, float]] = []
    for index, (lat, lng) in enumerate(points):
        if not in_pilot(lat, lng):
            results.append(_insufficient(lat, lng, "outside_labelled_area", target))
        else:
            results.append({})
            pending.append((index, lat, lng))

    if not pending:
        return results

    cells = {weather_cell(lat, lng) for _, lat, lng in pending}
    series_by_cell = dict(precip_by_cell or {})
    for cell in cells:
        if cell not in series_by_cell:
            try:
                series_by_cell[cell] = fetch_forecast_precip(cell, past_days=7, forecast_days=2)
            except RuntimeError:
                series_by_cell[cell] = None

    elev_points: list[tuple[float, float]] = []
    for _, lat, lng in pending:
        elev_points.append((round(lat, 5), round(lng, 5)))
        elev_points.extend((round(a, 5), round(b, 5)) for a, b in neighbor_points(lat, lng))
    unique_elev = list(dict.fromkeys(elev_points))
    if elevations is None:
        try:
            elevations = dict(zip(unique_elev, fetch_elevations([(a, b) for a, b in unique_elev]), strict=True))
        except RuntimeError:
            elevations = {}

    index: HotspotIndex = bundle["hotspot_index"]
    medians = bundle["feature_medians"]
    model = bundle["model"]
    weight = float(bundle["smooth_weight"])

    feature_rows = []
    feature_slots: list[int] = []
    for slot, lat, lng in pending:
        cell = weather_cell(lat, lng)
        series = series_by_cell.get(cell)
        center_key = (round(lat, 5), round(lng, 5))
        neighbor_keys = [(round(a, 5), round(b, 5)) for a, b in neighbor_points(lat, lng)]
        if series is None or center_key not in elevations or any(key not in elevations for key in neighbor_keys):
            reason = "missing_weather" if series is None else "missing_elevation"
            results[slot] = _insufficient(lat, lng, reason, target)
            continue
        table = weather_feature_table(series)
        looked = table.reindex([pd.Timestamp(issue)])
        if looked.isna().any(axis=None):
            results[slot] = _insufficient(lat, lng, "missing_weather", target)
            continue
        features = {column: float(looked.iloc[0][column]) for column in table.columns}
        features.update(terrain_features(elevations[center_key], [elevations[key] for key in neighbor_keys]))
        features.update(time_features(pd.Timestamp(target)))
        features[HOTSPOT_FEATURE] = float(index.counts(np.array([lat]), np.array([lng]))[0])
        feature_rows.append([features[column] for column in FEATURE_COLUMNS])
        feature_slots.append(slot)
        results[slot] = {"_features": features, "_lat": lat, "_lng": lng}

    if feature_rows:
        matrix = np.asarray(feature_rows, dtype="float64")
        raw = model.predict_proba(pd.DataFrame(matrix, columns=FEATURE_COLUMNS))[:, 1]
        hotspots = matrix[:, FEATURE_COLUMNS.index(HOTSPOT_FEATURE)]
        blended = _blend(raw, hotspots, weight)
        for slot, probability, features in zip(feature_slots, blended, (results[s]["_features"] for s in feature_slots), strict=True):
            lat = results[slot]["_lat"]
            lng = results[slot]["_lng"]
            results[slot] = {
                "lat": lat,
                "lng": lng,
                "probability": round(float(probability), 4),
                "confidence": _confidence(lat, lng, bundle),
                "horizon_hours": 1,
                "target_time": target.isoformat(),
                "data_quality": "ok",
                "reason": None,
                "factors": _factors(features, medians),
                "admin": locate(lat, lng),
                "estimate_label": "model_estimate",
            }
    return results


def pilot_grid(step: float = 0.1, box: dict[str, float] | None = None) -> list[tuple[float, float]]:
    b = box or PILOT_BBOX
    lats = np.round(np.arange(b["min_lat"] + step / 2, b["max_lat"], step), 4)
    lngs = np.round(np.arange(b["min_lng"] + step / 2, b["max_lng"], step), 4)
    return [(float(lat), float(lng)) for lat in lats for lng in lngs]


def forecast_area(min_lat: float, max_lat: float, min_lng: float, max_lng: float, now: datetime | None = None) -> dict:
    """Score the overlap of the request box and designated corridors. Elsewhere: insufficient_data."""
    if min_lat > max_lat or min_lng > max_lng:
        raise ValueError("Bounding box is inverted.")
    span = (max_lat - min_lat) * (max_lng - min_lng)
    if span > 25:
        raise ValueError("Bounding box is too large. Request at most 5 by 5 degrees.")
    
    # Check overlap across all registered national corridors
    grid = []
    matched_corridors = []
    for c_name, box in NATIONAL_CORRIDORS.items():
        overlap_min_lat = max(min_lat, box["min_lat"])
        overlap_max_lat = min(max_lat, box["max_lat"])
        overlap_min_lng = max(min_lng, box["min_lng"])
        overlap_max_lng = min(max_lng, box["max_lng"])
        if overlap_min_lat < overlap_max_lat and overlap_min_lng < overlap_max_lng:
            matched_corridors.append(c_name)
            grid.extend(pilot_grid(box=box))
            
    # Deduplicate grid points and filter to requested window
    grid = [
        pt for pt in dict.fromkeys(grid)
        if min_lat <= pt[0] <= max_lat and min_lng <= pt[1] <= max_lng
    ]
    outside = not grid
    cells = score_points(grid, now=now) if grid else []
    generated = datetime.now(timezone.utc)
    coverage_desc = ", ".join(matched_corridors) if matched_corridors else "national_coverage"
    return {
        "generated_at": generated.isoformat(),
        "stale_after_seconds": get_settings().forecast_cache_ttl_s,
        "horizon_hours": 1,
        "coverage": coverage_desc,
        "data_quality": "insufficient_data" if outside else "ok",
        "reason": "outside_labelled_area" if outside else None,
        "cells": cells,
        "limitation": (
            "Each probability is a model estimate from rainfall, elevation and past complaint locations. "
            "It is not a municipal sensor reading and is not an official warning."
        ),
    }
