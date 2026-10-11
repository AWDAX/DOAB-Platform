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
from .incidents import load_and_clean
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
    return _incident_cache


@app.get("/incidents")
def incidents(limit: int = 50) -> dict:
    limit = min(max(limit, 1), 200)
    rows = _historical_incidents()[:limit]
    return {
        "kind": "historical_complaint",
        "label": "Historical civic complaints. Not a live sensor feed.",
        "pilot_bbox": PILOT_BBOX,
        "incidents": rows,
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
    return {"pilot_bbox": PILOT_BBOX, "predictions": "labelled_box_only"}
