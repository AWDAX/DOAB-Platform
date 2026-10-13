"""India Meteorological Department (IMD) Live Weather Integration.

Queries official IMD City Weather services (https://city.imd.gov.in/citywx/responsive/)
for real-time station telemetry, rainfall observations, and official meteorological warnings.
"""

from __future__ import annotations

import logging
import time
from typing import Any
import requests

log = logging.getLogger(__name__)

IMD_SEARCH_URL = "https://city.imd.gov.in/citywx/responsive/api/search.php"
IMD_STATION_URL = "https://city.imd.gov.in/citywx/responsive/api/fetchCity_static.php"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://city.imd.gov.in/citywx/responsive/",
}

# Major pilot metro stations registry (station_id, name, lat, lon)
PILOT_METRO_STATIONS: dict[str, dict[str, Any]] = {
    "bengaluru": {"id": "43295", "name": "Bengaluru-City", "lat": 12.9716, "lng": 77.5946},
    "bengaluru_hal": {"id": "43296", "name": "Bengaluru-HAL Airport", "lat": 12.9566, "lng": 77.6650},
    "bengaluru_kia": {"id": "43293", "name": "Bengaluru-International Airport", "lat": 13.1986, "lng": 77.7066},
    "mumbai": {"id": "43003", "name": "Mumbai-Colaba", "lat": 18.9067, "lng": 72.8147},
    "mumbai_santacruz": {"id": "43057", "name": "Mumbai-Santacruz", "lat": 19.0896, "lng": 72.8656},
    "delhi": {"id": "42182", "name": "New Delhi-Safdarjung", "lat": 28.5847, "lng": 77.2066},
    "hyderabad": {"id": "43128", "name": "Hyderabad-Begumpet", "lat": 17.4531, "lng": 78.4677},
    "chennai": {"id": "43279", "name": "Chennai-Nungambakkam", "lat": 13.0604, "lng": 80.2496},
    "kolkata": {"id": "42809", "name": "Kolkata-Alipore", "lat": 22.5333, "lng": 88.3333},
}

_station_cache: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes cache for IMD telemetry


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        cleaned = str(val).strip().replace("mm", "").replace("°C", "")
        if cleaned in ("", "NA", "N/A", "-", "--"):
            return default
        return float(cleaned)
    except (ValueError, TypeError):
        return default


def fetch_imd_station_raw(station_id: str) -> dict[str, Any] | None:
    """Fetch raw station payload from IMD API with in-memory caching."""
    now = time.time()
    cached = _station_cache.get(station_id)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    try:
        resp = requests.post(
            IMD_STATION_URL,
            data={"ID": station_id},
            headers=HEADERS,
            timeout=10,
        )
        if resp.status_code != 200:
            log.warning("IMD request returned HTTP %d for station %s", resp.status_code, station_id)
            return None
        data = resp.json()
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        station_data = data[0]
        _station_cache[station_id] = (now, station_data)
        return station_data
    except Exception as exc:
        log.warning("Failed to fetch IMD station %s: %s", station_id, exc)
        return None


def get_imd_telemetry(station_id: str = "43295") -> dict[str, Any]:
    """Return normalized, typed telemetry dictionary for UI and risk engine."""
    raw = fetch_imd_station_raw(station_id)
    if not raw:
        # Fallback structured placeholder if IMD is momentarily slow/offline
        return {
            "source": "IMD (India Meteorological Department)",
            "status": "cached_offline",
            "station_id": station_id,
            "station_name": "Bengaluru-City (IMD)",
            "state": "KARNATAKA",
            "observed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "rainfall_24h_mm": 0.0,
            "temp_max_c": 30.0,
            "temp_min_c": 21.0,
            "relative_humidity_morning": 75.0,
            "relative_humidity_evening": 45.0,
            "warning": {
                "color": "Green",
                "text": "No adverse weather warning. Normal monsoon flow.",
            },
            "forecast_summary": "Partly cloudy sky with possibility of development of thunder lightning.",
            "is_live": False,
        }

    # Extract 7-day forecast items
    forecast_days = []
    for day_idx in range(7):
        f_text = raw.get(f"forecast{day_idx}")
        max_t = raw.get(f"max{day_idx}")
        min_t = raw.get(f"min{day_idx}")
        warn = raw.get(f"warning{day_idx}")
        col = raw.get(f"color{day_idx}")
        if f_text:
            forecast_days.append({
                "day_offset": day_idx,
                "forecast": f_text,
                "temp_max": _safe_float(max_t),
                "temp_min": _safe_float(min_t),
                "warning": warn or "No warning",
                "color": col or "Green",
            })

    raw_color = raw.get("wColor") or raw.get("color0") or "Green"
    raw_text = raw.get("wText") or raw.get("warning0") or "No severe weather warning."

    if isinstance(raw_color, list):
        # Pick the most severe color across the upcoming window (red > orange > yellow > green)
        color_order = {"red": 4, "orange": 3, "yellow": 2, "green": 1}
        sorted_colors = sorted(raw_color, key=lambda c: color_order.get(str(c).lower(), 0), reverse=True)
        warning_color = str(sorted_colors[0]).capitalize() if sorted_colors else "Green"
    else:
        warning_color = str(raw_color).capitalize()

    if isinstance(raw_text, list):
        active_warnings = [str(w) for w in raw_text if str(w).lower() not in ("no warning", "-", "", "none")]
        warning_text = "; ".join(active_warnings) if active_warnings else (str(raw_text[0]) if raw_text else "No warning")
    else:
        warning_text = str(raw_text)

    return {
        "source": "IMD (India Meteorological Department)",
        "status": "live",
        "station_id": str(raw.get("station_id") or station_id),
        "station_name": str(raw.get("station") or "Bengaluru-City"),
        "state": str(raw.get("state") or "KARNATAKA"),
        "lat": _safe_float(raw.get("lat"), 12.9716),
        "lng": _safe_float(raw.get("lon"), 77.5946),
        "observed_at": str(raw.get("updat") or raw.get("dat") or ""),
        "rainfall_24h_mm": _safe_float(raw.get("rainfall")),
        "temp_max_c": _safe_float(raw.get("max")),
        "temp_min_c": _safe_float(raw.get("min")),
        "relative_humidity_morning": _safe_float(raw.get("rh0830")),
        "relative_humidity_evening": _safe_float(raw.get("rh1730")),
        "warning": {
            "color": warning_color,
            "text": warning_text,
        },
        "forecast_summary": str(raw.get("forecast0") or "Partly cloudy"),
        "forecast_7day": forecast_days,
        "is_live": True,
    }


def search_imd_stations(query: str = "") -> list[dict[str, Any]]:
    """Search IMD station catalog by city or state query."""
    try:
        resp = requests.get(
            f"{IMD_SEARCH_URL}?query={query.strip()}",
            headers=HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            if isinstance(data, list):
                return data
    except Exception as exc:
        log.warning("IMD station search failed: %s", exc)
    
    # Fallback to local pilot registry
    return [
        {"station_id": meta["id"], "station": meta["name"]}
        for meta in PILOT_METRO_STATIONS.values()
    ]
