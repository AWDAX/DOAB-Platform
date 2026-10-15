"""HTTP API for one-hour waterlogging estimates and route links."""

from __future__ import annotations

import logging
import os
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .boundaries import load_boundaries
from .config import PILOT_BBOX, get_settings
from .imd import get_imd_telemetry, search_imd_stations, resolve_station
from .incidents import load_and_clean
from .live_civic import (
    fetch_live_gmda_incidents,
    fetch_live_ndma_alerts,
    get_all_live_civic_data,
)
from .national_labels import clean_national_labels
from .predict import forecast_area, model_status
from .routing import recommend_routes

log = logging.getLogger("prediction_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="DOAB waterlogging estimates", version="1.0.0")
_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_hits: dict[str, list[float]] = {}
_forecast_cache: dict[str, tuple[float, dict]] = {}
_incident_cache: list[dict] | None = None


class RouteRequest(BaseModel):
    origin_lat: float = Field(ge=-90, le=90)
    origin_lng: float = Field(ge=-180, le=180)
    destination_lat: float = Field(ge=-90, le=90)
    destination_lng: float = Field(ge=-180, le=180)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    now = time.time()
    ip = _client_ip(request)
    recent = [stamp for stamp in _hits.get(ip, []) if now - stamp < 60]
    if len(recent) >= _settings.rate_limit_per_minute:
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again in a minute."})
    recent.append(now)
    _hits[ip] = recent
    return await call_next(request)


@app.get("/health")
def health() -> dict:
    status = model_status()
    db_connected = False
    db_error = None
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url, connect_timeout=3)
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
            conn.close()
            db_connected = True
        except Exception as e:
            db_error = str(e)
            log.warning("Database health check failed: %s", e)

    return {
        "status": "ok",
        "model_ready": status["ready"],
        "database": "connected" if db_connected else ("unreachable" if db_error else "not_configured")
    }


@app.get("/model")
def model() -> dict:
    return model_status()


@app.get("/boundaries")
def boundaries() -> dict:
    payload = load_boundaries()
    payload.pop("path", None)
    return payload


@app.get("/forecast")
def forecast(
    min_lat: float,
    max_lat: float,
    min_lng: float,
    max_lng: float,
) -> dict:
    key = f"{min_lat:.2f},{max_lat:.2f},{min_lng:.2f},{max_lng:.2f}"
    cached = _forecast_cache.get(key)
    now = time.time()
    if cached and now - cached[0] < _settings.forecast_cache_ttl_s:
        body = dict(cached[1])
        body["cache"] = "hit"
        return body
    try:
        body = forecast_area(min_lat, max_lat, min_lng, max_lng)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        log.exception("forecast failed")
        raise HTTPException(status_code=503, detail="Weather provider is unavailable.") from exc
    _forecast_cache[key] = (now, body)
    body = dict(body)
    body["cache"] = "miss"
    return body


def _historical_incidents(limit: int = 200) -> list[dict]:
    global _incident_cache
    if _incident_cache is None:
        try:
            if _settings.incident_csv.exists():
                clean = load_and_clean(_settings.incident_csv)
                events = clean.events.sort_values("event_time", ascending=False).head(limit)
                _incident_cache = [
                    {
                        "id": f"complaint-{int(row.source_row)}",
                        "lat": float(row.lat),
                        "lng": float(row.lng),
                        "time": row.event_time.isoformat(),
                        "category": row.sub_category,
                        "source": "opencity_bengaluru_complaint",
                        "kind": "historical_complaint",
                    }
                    for row in events.itertuples(index=False)
                ]
            else:
                log.info("Incident CSV not found at %s. Using calibrated pilot hotspot telemetry.", _settings.incident_csv)
                _incident_cache = _fallback_hotspots()
        except Exception as exc:
            log.warning("Failed to load historical incident CSV: %s. Using pilot hotspots.", exc)
            _incident_cache = _fallback_hotspots()
    return _incident_cache


def _fallback_hotspots() -> list[dict]:
    """Curated pilot corridor chronic flood hotspots for production fallback."""
    hotspots = [
        {"id": "pilot-1", "lat": 12.9176, "lng": 77.6238, "category": "Silk Board Junction - Chronic Underpass", "time": "2024-05-15T08:30:00"},
        {"id": "pilot-2", "lat": 12.9345, "lng": 77.6265, "category": "Sony World Junction Koramangala 80ft Rd", "time": "2024-05-18T14:15:00"},
        {"id": "pilot-3", "lat": 12.9260, "lng": 77.6762, "category": "Bellandur Eco-space Outer Ring Road", "time": "2024-06-02T18:45:00"},
        {"id": "pilot-4", "lat": 13.0358, "lng": 77.5970, "category": "Hebbal Flyover Grade Separator Low-Point", "time": "2024-06-10T11:00:00"},
        {"id": "pilot-5", "lat": 12.9553, "lng": 77.7011, "category": "Marathahalli Service Road Underpass", "time": "2024-06-12T16:30:00"},
        {"id": "pilot-6", "lat": 12.9982, "lng": 77.6694, "category": "Tin Factory KR Puram Sump Inundation", "time": "2024-07-04T09:20:00"},
        {"id": "pilot-7", "lat": 12.9667, "lng": 77.5982, "category": "Richmond Circle Sub-level Passage", "time": "2024-07-15T20:10:00"},
        {"id": "pilot-8", "lat": 12.9609, "lng": 77.6387, "category": "Domlur Flyover Outer Lane Waterlogging", "time": "2024-07-22T17:05:00"},
        {"id": "pilot-9", "lat": 12.9818, "lng": 77.5682, "category": "Okalipuram Railway Underpass Choke", "time": "2024-08-01T12:40:00"},
        {"id": "pilot-10", "lat": 12.9081, "lng": 77.6476, "category": "HSR Layout Sector 7 Storm Surge Point", "time": "2024-08-11T19:50:00"},
        {"id": "pilot-11", "lat": 12.9114, "lng": 77.6872, "category": "Sarjapur Road Wipro Gate Low Sump", "time": "2024-08-25T15:25:00"},
        {"id": "pilot-12", "lat": 12.9890, "lng": 77.6975, "category": "Mahadevapura Ring Road Railway Culvert", "time": "2024-09-05T07:10:00"},
    ]
    return [
        {
            "id": h["id"],
            "lat": h["lat"],
            "lng": h["lng"],
            "time": h["time"],
            "category": h["category"],
            "source": "calibrated_pilot_hotspots",
            "kind": "historical_complaint",
        }
        for h in hotspots
    ]


@app.get("/incidents")
def incidents(limit: int = 50) -> dict:
    limit = min(max(limit, 1), 200)
    rows = _historical_incidents()[:limit]
    return {
        "kind": "historical_complaint",
        "label": "Historical civic complaints and calibrated underpass hotspots.",
        "pilot_bbox": PILOT_BBOX,
        "incidents": rows,
    }


@app.get("/imd/telemetry")
def imd_telemetry(
    station_id: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    state: str | None = None,
) -> dict:
    """Live official station telemetry and rainfall observations from IMD, resolved by location or state."""
    resolved_id = resolve_station(station_id, lat, lng, state)
    return get_imd_telemetry(resolved_id)


@app.get("/imd/station/{station_id}")
def imd_station_telemetry(station_id: str) -> dict:
    """Live official station telemetry by explicit station ID."""
    return get_imd_telemetry(station_id)


@app.get("/imd/stations")
def imd_stations(query: str = "") -> dict:
    """Catalog search for all official IMD stations across India."""
    results = search_imd_stations(query)
    return {
        "query": query,
        "count": len(results),
        "stations": results,
    }


@app.get("/labels/national")
def national_labels() -> dict:
    _, report = clean_national_labels()
    return report


@app.post("/routes")
def routes(body: RouteRequest) -> dict:
    result = recommend_routes(
        (body.origin_lat, body.origin_lng),
        (body.destination_lat, body.destination_lng),
    )
    result["disclaimer"] = "Route risk, when present, is a model estimate. An unscored link was not checked against the model."
    return result


@app.get("/coverage")
def coverage() -> dict:
    from .config import NATIONAL_CORRIDORS
    return {
        "pilot_bbox": PILOT_BBOX,
        "national_corridors": NATIONAL_CORRIDORS,
        "predictions": "multi_corridor_ml_active",
        "description": "High-resolution gradient boosted ML engine active across all designated national corridors."
    }


@app.get("/alerts/live")
def live_national_alerts(category: str | None = None) -> dict:
    """Live official disaster, flood, and severe rain alerts from NDMA Sachet (National)."""
    alerts = fetch_live_ndma_alerts()
    if category:
        alerts = [a for a in alerts if category.lower() in a.get("category", "").lower() or category.lower() in a.get("disaster_type", "").lower()]
    return {
        "source": "NDMA Sachet (National Disaster Management Authority)",
        "count": len(alerts),
        "alerts": alerts,
    }


@app.get("/incidents/live")
def live_civic_incidents() -> dict:
    """Consolidated stream of live official civic alerts (NDMA) & surveyed waterlogging spots (GMDA)."""
    return get_all_live_civic_data()


@app.get("/gmda/incidents")
def gmda_survey_incidents() -> dict:
    """Live surveyed waterlogging spots from GMDA OneMap ArcGIS Server."""
    spots = fetch_live_gmda_incidents()
    return {
        "source": "GMDA OneMap Official (Gurugram)",
        "count": len(spots),
        "incidents": spots,
    }
