"""Runtime configuration.

Secrets are read from environment variables only. Nothing secret lives in the repo.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = SERVICE_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = SERVICE_ROOT / "models"
DEFAULT_MODEL_PATH = MODEL_DIR / "waterlogging_1h.joblib"

def _find_incident_csv() -> Path:
    candidates = [
        SERVICE_ROOT.parents[1] / "Muncipal corp Dataset" / "WaterLogging Dataset" / "Z+" / "Dataset [Old Dataset 2].csv",
        SERVICE_ROOT.parent / "Muncipal corp Dataset" / "WaterLogging Dataset" / "Z+" / "Dataset [Old Dataset 2].csv",
        SERVICE_ROOT / "data" / "raw" / "Dataset [Old Dataset 2].csv",
        SERVICE_ROOT / "data" / "raw" / "incidents.csv",
        Path.cwd() / "Muncipal corp Dataset" / "WaterLogging Dataset" / "Z+" / "Dataset [Old Dataset 2].csv",
    ]
    for c in candidates:
        if c.is_file():
            return c
    return candidates[0]

DEFAULT_INCIDENT_CSV = _find_incident_csv()

# High-resolution ML corridor (Bengaluru pilot with geolocated micro-labels)
PILOT_BBOX = {"min_lat": 12.60, "max_lat": 13.30, "min_lng": 77.30, "max_lng": 77.90}

# National corridor registry for key pilot urban clusters across India
NATIONAL_CORRIDORS: dict[str, dict[str, float]] = {
    "bengaluru": PILOT_BBOX,
    "mumbai_mmr": {"min_lat": 18.85, "max_lat": 19.35, "min_lng": 72.75, "max_lng": 73.15},
    "delhi_ncr": {"min_lat": 28.35, "max_lat": 28.85, "min_lng": 76.90, "max_lng": 77.45},
    "patna_bihar": {"min_lat": 25.50, "max_lat": 25.75, "min_lng": 85.00, "max_lng": 85.35},
    "hyderabad_telangana": {"min_lat": 17.25, "max_lat": 17.55, "min_lng": 78.30, "max_lng": 78.65},
    "kolkata_wb": {"min_lat": 22.40, "max_lat": 22.75, "min_lng": 88.25, "max_lng": 88.50},
    "chennai_tn": {"min_lat": 12.90, "max_lat": 13.25, "min_lng": 80.10, "max_lng": 80.35},
    "bhubaneswar_odisha": {"min_lat": 20.15, "max_lat": 20.40, "min_lng": 85.70, "max_lng": 85.95},
}

# Analysis window for training. Weather lookback starts before the first event
# so that 7-day rolling features are complete for early-2019 events.
EVENT_WINDOW_START = "2019-01-01"
EVENT_WINDOW_END = "2021-12-31"
WEATHER_FETCH_START = "2018-12-01"
WEATHER_FETCH_END = "2021-12-31"

LOCAL_TIMEZONE = "Asia/Kolkata"
WEATHER_CELL_DEGREES = 0.1  # ~11 km; Open-Meteo returns the nearest reanalysis grid value

ARCHIVE_URL = os.getenv("OPEN_METEO_ARCHIVE_URL", "https://archive-api.open-meteo.com/v1/archive")
FORECAST_URL = os.getenv("OPEN_METEO_FORECAST_URL", "https://api.open-meteo.com/v1/forecast")
ELEVATION_URL = os.getenv("OPEN_METEO_ELEVATION_URL", "https://api.open-meteo.com/v1/elevation")
GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    model_path: Path = field(default_factory=lambda: Path(os.getenv("PREDICTION_MODEL_PATH", DEFAULT_MODEL_PATH)))
    incident_csv: Path = field(default_factory=lambda: Path(os.getenv("INCIDENT_CSV_PATH", DEFAULT_INCIDENT_CSV)))
    cors_origins: list[str] = field(default_factory=lambda: _csv_env(
        "PREDICTION_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:4173,http://localhost:3000,https://doab.sahnirmaan.live,https://api-doab.sahnirmaan.live,https://doab.pages.dev,*"
    ))
    rate_limit_per_minute: int = int(os.getenv("PREDICTION_RATE_LIMIT_PER_MINUTE", "60"))
    # Server-side only. Never shipped to the browser. Optional: without it, routes are returned unscored.
    google_routes_api_key: str | None = os.getenv("GOOGLE_ROUTES_API_KEY") or None
    forecast_cache_ttl_s: int = int(os.getenv("PREDICTION_FORECAST_CACHE_TTL_S", "900"))


def get_settings() -> Settings:
    return Settings()
