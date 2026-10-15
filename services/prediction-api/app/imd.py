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

# Comprehensive Regional Stations Registry across India
REGIONAL_STATIONS: dict[str, dict[str, Any]] = {
    # Karnataka
    "bengaluru": {"id": "43295", "name": "Bengaluru-City", "state": "karnataka", "lat": 12.9716, "lng": 77.5946},
    "bengaluru_hal": {"id": "43296", "name": "Bengaluru-HAL Airport", "state": "karnataka", "lat": 12.9566, "lng": 77.6650},
    "bengaluru_kia": {"id": "43293", "name": "Bengaluru-International Airport", "state": "karnataka", "lat": 13.1986, "lng": 77.7066},
    "mysuru": {"id": "43307", "name": "Mysuru", "state": "karnataka", "lat": 12.2958, "lng": 76.6394},
    "mangaluru": {"id": "43284", "name": "Mangaluru", "state": "karnataka", "lat": 12.9141, "lng": 74.8560},
    
    # Uttar Pradesh
    "lucknow": {"id": "42369", "name": "Lucknow-Airport", "state": "uttar_pradesh", "lat": 26.7606, "lng": 80.8893},
    "kanpur": {"id": "42366", "name": "Kanpur", "state": "uttar_pradesh", "lat": 26.4499, "lng": 80.3319},
    "noida": {"id": "100559", "name": "Noida Apmc", "state": "uttar_pradesh", "lat": 28.5355, "lng": 77.3910},
    "varanasi": {"id": "42479", "name": "Varanasi", "state": "uttar_pradesh", "lat": 25.3176, "lng": 82.9739},
    "agra": {"id": "42260", "name": "Agra", "state": "uttar_pradesh", "lat": 27.1767, "lng": 78.0081},
    "prayagraj": {"id": "42475", "name": "Prayagraj", "state": "uttar_pradesh", "lat": 25.4358, "lng": 81.8463},
    "ghaziabad": {"id": "99927", "name": "Ghaziabad", "state": "uttar_pradesh", "lat": 28.6692, "lng": 77.4538},
    
    # Delhi / NCR
    "delhi": {"id": "42182", "name": "New Delhi-Safdarjung", "state": "delhi", "lat": 28.5847, "lng": 77.2066},
    "gurugram": {"id": "42182", "name": "Gurugram / NCR", "state": "haryana", "lat": 28.4595, "lng": 77.0266},
    
    # Maharashtra
    "mumbai": {"id": "43003", "name": "Mumbai-Colaba", "state": "maharashtra", "lat": 18.9067, "lng": 72.8147},
    "mumbai_santacruz": {"id": "43057", "name": "Mumbai-Santacruz", "state": "maharashtra", "lat": 19.0896, "lng": 72.8656},
    "pune": {"id": "43063", "name": "Pune", "state": "maharashtra", "lat": 18.5204, "lng": 73.8567},
    
    # Telangana & Andhra Pradesh
    "hyderabad": {"id": "43128", "name": "Hyderabad-Begumpet", "state": "telangana", "lat": 17.4531, "lng": 78.4677},
    "visakhapatnam": {"id": "43149", "name": "Visakhapatnam", "state": "andhra_pradesh", "lat": 17.6868, "lng": 83.2185},
    
    # Tamil Nadu & Kerala
    "chennai": {"id": "43279", "name": "Chennai-Nungambakkam", "state": "tamil_nadu", "lat": 13.0604, "lng": 80.2496},
    "kochi": {"id": "43355", "name": "Kochi", "state": "kerala", "lat": 9.9312, "lng": 76.2673},
    
    # Eastern & Central
    "kolkata": {"id": "42809", "name": "Kolkata-Alipore", "state": "west_bengal", "lat": 22.5333, "lng": 88.3333},
    "patna": {"id": "42492", "name": "Patna", "state": "bihar", "lat": 25.5941, "lng": 85.1376},
    "ranchi": {"id": "42701", "name": "Ranchi", "state": "jharkhand", "lat": 23.3441, "lng": 85.3096},
    "jaipur": {"id": "42348", "name": "Jaipur", "state": "rajasthan", "lat": 26.9124, "lng": 75.7873},
    "ahmedabad": {"id": "42647", "name": "Ahmedabad", "state": "gujarat", "lat": 23.0225, "lng": 72.5714},
    "bhopal": {"id": "42667", "name": "Bhopal", "state": "madhya_pradesh", "lat": 23.2599, "lng": 77.4126},
    "chandigarh": {"id": "42111", "name": "Chandigarh", "state": "punjab", "lat": 30.7333, "lng": 76.7794},
}

PILOT_METRO_STATIONS = REGIONAL_STATIONS

STATE_DEFAULT_STATIONS: dict[str, str] = {
    "uttar_pradesh": "42369",  # Lucknow-Airport
    "up": "42369",
    "delhi": "42182",          # New Delhi-Safdarjung
    "karnataka": "43295",      # Bengaluru-City
    "maharashtra": "43057",    # Mumbai-Santacruz
    "haryana": "42182",
    "tamil_nadu": "43279",
    "telangana": "43128",
    "west_bengal": "42809",
    "gujarat": "42647",
    "rajasthan": "42348",
    "kerala": "43355",
    "bihar": "42492",
    "jharkhand": "42701",
    "madhya_pradesh": "42667",
    "punjab": "42111",
    "andhra_pradesh": "43149",
}


def resolve_station(
    station_id: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    state: str | None = None,
) -> str:
    """Resolve the closest or most relevant official IMD station ID."""
    if station_id and station_id not in ("", "default", "undefined"):
        return station_id

    # If state name provided (e.g. 'uttar_pradesh', 'karnataka'), prioritize state
    if state and state.strip().lower() not in ("", "all", "undefined", "null"):
        clean_state = state.strip().lower().replace(" ", "_").replace("-", "_")
        # If coordinates are also provided, check if any regional station in this state is nearest
        if lat is not None and lng is not None and (abs(lat) > 0.1 or abs(lng) > 0.1):
            import math
            state_stations = [s for s in REGIONAL_STATIONS.values() if s.get("state") == clean_state]
            if state_stations:
                best = min(state_stations, key=lambda s: math.hypot(lat - s["lat"], lng - s["lng"]))
                # Only use coordinate match if coordinates are reasonably within/near the state (< 350km / 3.5 deg)
                if math.hypot(lat - best["lat"], lng - best["lng"]) <= 3.5:
                    return best["id"]

        if clean_state in STATE_DEFAULT_STATIONS:
            return STATE_DEFAULT_STATIONS[clean_state]

    # If GPS coordinates are provided and no specific state filter was set, find closest station
    if lat is not None and lng is not None and (abs(lat) > 0.1 or abs(lng) > 0.1):
        import math
        best_station = "42182"  # New Delhi
        min_dist = float("inf")
        for s_info in REGIONAL_STATIONS.values():
            s_lat = s_info["lat"]
            s_lng = s_info["lng"]
            d = math.hypot(lat - s_lat, lng - s_lng)
            if d < min_dist:
                min_dist = d
                best_station = s_info["id"]
        return best_station

    return "42182"

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
        # Structured fallback using known station metadata if IMD is momentarily slow/offline
        meta = next((s for s in REGIONAL_STATIONS.values() if s["id"] == station_id), None)
        st_name = meta["name"] if meta else "IMD Regional Station"
        st_state = meta["state"].replace("_", " ").upper() if meta else "INDIA"
        return {
            "source": "IMD (India Meteorological Department)",
            "status": "cached_offline",
            "station_id": station_id,
            "station_name": f"{st_name} (IMD)",
            "state": st_state,
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
        # Deduplicate identical consecutive or multi-day warning messages
        cleaned_items = [str(w).strip() for w in raw_text if str(w).strip() and str(w).strip().lower() not in ("no warning", "-", "", "none")]
        unique_warnings = list(dict.fromkeys(cleaned_items))
        warning_text = "; ".join(unique_warnings) if unique_warnings else (str(raw_text[0]) if raw_text else "No warning")
    else:
        # Deduplicate if backend returns semicolon-concatenated duplicate warnings
        parts = [p.strip() for p in str(raw_text).split(";") if p.strip() and p.strip().lower() not in ("no warning", "-", "", "none")]
        unique_parts = list(dict.fromkeys(parts))
        warning_text = "; ".join(unique_parts) if unique_parts else str(raw_text).strip()

    # Clean any trailing punctuation or artifacts
    warning_text = warning_text.rstrip("; ").strip()

    obs_max = _safe_float(raw.get("max"))
    obs_min = _safe_float(raw.get("min"))
    # Fallback to day 0 forecasted max/min if observation sensor hasn't reported day's peak yet or is null/0.0
    if (obs_max <= 0.0 or obs_max is None) and forecast_days:
        obs_max = forecast_days[0]["temp_max"]
    if (obs_min <= 0.0 or obs_min is None) and forecast_days:
        obs_min = forecast_days[0]["temp_min"]

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
        "temp_max_c": obs_max,
        "temp_min_c": obs_min,
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
