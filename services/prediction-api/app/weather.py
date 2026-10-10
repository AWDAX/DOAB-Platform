"""Open-Meteo clients for hourly precipitation and elevation.

Open-Meteo serves ERA5 reanalysis for historical hours and a numerical forecast for
recent and upcoming hours. Both are free and need no API key. Responses are cached on
disk so that a rebuild of the dataset is reproducible and does not re-hit the API.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path

import pandas as pd
import requests

from .config import (
    ARCHIVE_URL,
    ELEVATION_URL,
    FORECAST_URL,
    LOCAL_TIMEZONE,
    RAW_DIR,
    WEATHER_CELL_DEGREES,
)

log = logging.getLogger(__name__)
CACHE_DIR = RAW_DIR / "openmeteo"
TIMEOUT_S = 30
MAX_RETRIES = 6
REQUEST_PAUSE_S = 1.0  # polite pacing for the free tier
RATE_LIMIT_WAIT_S = 30  # wait after HTTP 429, multiplied by the attempt number
ELEVATION_BATCH = 100  # Open-Meteo accepts up to 100 coordinates per elevation request


def weather_cell(lat: float, lng: float) -> tuple[float, float]:
    """Snap a point to the weather grid cell used for its precipitation series."""
    step = WEATHER_CELL_DEGREES
    return round(round(lat / step) * step, 4), round(round(lng / step) * step, 4)


def _cache_path(kind: str, key: str) -> Path:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
    return CACHE_DIR / kind / f"{digest}.json"


def _get_json(url: str, params: dict) -> dict:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_PAUSE_S)
            response = requests.get(url, params=params, timeout=TIMEOUT_S)
            if response.status_code == 429:
                # Free-tier rate limit: wait long enough for the per-minute window to reset.
                last_error = requests.HTTPError("HTTP 429 (rate limited)", response=response)
                time.sleep(RATE_LIMIT_WAIT_S * (attempt + 1))
                continue
            if response.status_code >= 500:
                raise requests.HTTPError(f"HTTP {response.status_code}", response=response)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            time.sleep(2**attempt)
    raise RuntimeError(f"Open-Meteo request failed after {MAX_RETRIES} attempts: {last_error}")


def _hourly_precip(payload: dict) -> pd.Series:
    hourly = payload["hourly"]
    index = pd.to_datetime(hourly["time"])  # naive local times, because timezone=LOCAL_TIMEZONE
    values = pd.Series(hourly["precipitation"], index=index, dtype="float64")
    return values.sort_index()


def fetch_archive_precip(cell: tuple[float, float], start: str, end: str) -> pd.Series:
    """Hourly precipitation (mm) for one grid cell over a historical window."""
    key = f"archive|{cell[0]}|{cell[1]}|{start}|{end}"
    path = _cache_path("archive", key)
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
    else:
        params = {
            "latitude": cell[0],
            "longitude": cell[1],
            "start_date": start,
            "end_date": end,
            "hourly": "precipitation",
            "timezone": LOCAL_TIMEZONE,
        }
        payload = _get_json(ARCHIVE_URL, params)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload), encoding="utf-8")
    return _hourly_precip(payload)


def fetch_forecast_precip(cell: tuple[float, float], past_days: int = 3, forecast_days: int = 2) -> pd.Series:
    """Recent (past_days) and upcoming hourly precipitation for one grid cell.

    Not cached on disk: forecasts go stale. The API layer keeps a short in-memory cache.
    """
    params = {
        "latitude": cell[0],
        "longitude": cell[1],
        "hourly": "precipitation",
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": LOCAL_TIMEZONE,
    }
    return _hourly_precip(_get_json(FORECAST_URL, params))


def fetch_elevations(points: list[tuple[float, float]]) -> list[float]:
    """Elevation (m) for each point. Results are cached per coordinate on disk."""
    cache_file = CACHE_DIR / "elevation" / "cache.json"
    cache: dict[str, float] = {}
    if cache_file.exists():
        cache = json.loads(cache_file.read_text(encoding="utf-8"))

    missing = []
    for lat, lng in points:
        token = f"{lat:.5f},{lng:.5f}"
        if token not in cache and token not in missing:
            missing.append(token)

    for start in range(0, len(missing), ELEVATION_BATCH):
        batch = missing[start : start + ELEVATION_BATCH]
        lats = ",".join(token.split(",")[0] for token in batch)
        lngs = ",".join(token.split(",")[1] for token in batch)
        payload = _get_json(ELEVATION_URL, {"latitude": lats, "longitude": lngs})
        for token, elevation in zip(batch, payload["elevation"], strict=True):
            cache[token] = float(elevation)
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(cache), encoding="utf-8")

    return [cache[f"{lat:.5f},{lng:.5f}"] for lat, lng in points]
