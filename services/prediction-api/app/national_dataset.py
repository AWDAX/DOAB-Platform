"""National flood events and gauge hydrological integration for India-wide training.

Ingests and validates:
1. INDOFLOODS Riverine & Gauge Telemetry (IIT Delhi): 4,548 gauge flood events with exact lat/lng across 21 Indian states.
2. CWC (Central Water Commission) Statewise Flood Atlas: Historical flood-affected & protected hectarage (1986-2022).
3. Curated Waterlogging Clean Dataset: Multi-state urban flood & riverine flood events.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .config import Z_PLUS_DATASET_DIR

log = logging.getLogger(__name__)

CWC_PATH = Z_PLUS_DATASET_DIR / "CWC_National_Flood_Atlas" / "cwc_statewise_flood_affected_areas_1986_2022.csv"
INDOFLOODS_EVENTS_PATH = Z_PLUS_DATASET_DIR / "INDOFLOODS" / "floodevents_indofloods.csv"
INDOFLOODS_META_PATH = Z_PLUS_DATASET_DIR / "INDOFLOODS" / "metadata_indofloods.csv"
CURATED_PATH = Z_PLUS_DATASET_DIR / "WaterLogging Dataset" / "Clean" / "curated_waterlogging_clean.csv"


@dataclass
class NationalFloodDataset:
    gauge_events: pd.DataFrame
    cwc_state_risk: dict[str, float]
    urban_hotspots: pd.DataFrame
    report: dict[str, Any]


def _extract_lat_lng(location_str: str) -> tuple[float | None, float | None]:
    if not isinstance(location_str, str):
        return None, None
    m = re.search(r"\[\s*([0-9]+\.?[0-9]*)\s*,\s*([0-9]+\.?[0-9]*)\s*\]", location_str)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            return None, None
    return None, None


def load_cwc_state_risks() -> dict[str, float]:
    """Return normalized state flood-proneness weights derived from CWC Satellite 1986-2022 Atlas."""
    if not CWC_PATH.is_file():
        log.warning("CWC Flood Atlas not found at %s", CWC_PATH)
        return {}
    df = pd.read_csv(CWC_PATH)
    # Extract total flood prone area in Mha
    weights = {}
    max_area = df["CWC_Total_Flood_Prone_Area_Mha"].max()
    for _, row in df.iterrows():
        state = str(row["State_or_UT"]).strip()
        area = float(row["CWC_Total_Flood_Prone_Area_Mha"])
        # Normalize between 0.05 and 1.0
        weights[state] = round(0.05 + 0.95 * (area / max_area), 4) if max_area > 0 else 0.5
    return weights


def load_indofloods_events() -> pd.DataFrame:
    """Load and merge INDOFLOODS gauge events with station latitude and longitude."""
    if not (INDOFLOODS_EVENTS_PATH.is_file() and INDOFLOODS_META_PATH.is_file()):
        log.warning("INDOFLOODS files missing in %s", Z_PLUS_DATASET_DIR)
        return pd.DataFrame()

    events = pd.read_csv(INDOFLOODS_EVENTS_PATH)
    meta = pd.read_csv(INDOFLOODS_META_PATH)

    events["GaugeID"] = events["EventID"].apply(lambda x: "-".join(str(x).split("-")[:3]))
    merged = events.merge(
        meta[["GaugeID", "Station", "Latitude", "Longitude", "River Name/ Tributory/ SubTributory", "State", "Warning Level", "Danger Level"]],
        on="GaugeID",
        how="inner",
    )
    merged = merged.rename(
        columns={
            "Latitude": "lat",
            "Longitude": "lng",
            "Start Date": "start_date",
            "End Date": "end_date",
            "Peak Flood Level (m)": "peak_level_m",
            "State": "state",
            "Station": "station_name",
        }
    )
    merged["event_time"] = pd.to_datetime(merged["start_date"], errors="coerce")
    merged = merged.dropna(subset=["lat", "lng", "event_time"])
    merged["label"] = 1
    merged["record_type"] = "gauge_flood_event"
    return merged


def load_curated_coordinate_events() -> pd.DataFrame:
    """Extract coordinate-bearing verified events from curated_waterlogging_clean.csv."""
    if not CURATED_PATH.is_file():
        return pd.DataFrame()
    df = pd.read_csv(CURATED_PATH)
    coords = df["Location"].apply(_extract_lat_lng)
    df["lat"] = coords.apply(lambda x: x[0])
    df["lng"] = coords.apply(lambda x: x[1])
    valid = df.dropna(subset=["lat", "lng"]).copy()
    valid["event_time"] = pd.to_datetime(valid["Incident_Date_Normalized"], errors="coerce")
    valid = valid.dropna(subset=["event_time"])
    valid["label"] = 1
    valid["record_type"] = "curated_clean_event"
    return valid


def build_national_flood_atlas() -> NationalFloodDataset:
    """Build unified national dataset integrating INDOFLOODS, CWC Flood Atlas, and Curated Events."""
    cwc_risks = load_cwc_state_risks()
    gauge_events = load_indofloods_events()
    curated_events = load_curated_coordinate_events()

    # Hotspot registry: Combine all verified coordinate events
    combined_lats = []
    combined_lngs = []
    combined_states = []

    if not gauge_events.empty:
        combined_lats.extend(gauge_events["lat"].tolist())
        combined_lngs.extend(gauge_events["lng"].tolist())
        combined_states.extend(gauge_events["state"].tolist())

    if not curated_events.empty:
        combined_lats.extend(curated_events["lat"].tolist())
        combined_lngs.extend(curated_events["lng"].tolist())
        combined_states.extend(curated_events["State"].tolist())

    hotspots = pd.DataFrame({
        "lat": combined_lats,
        "lng": combined_lngs,
        "state": combined_states,
    }).drop_duplicates(subset=["lat", "lng"]).reset_index(drop=True)

    report = {
        "cwc_states_profiled": len(cwc_risks),
        "total_gauge_flood_events": len(gauge_events),
        "unique_gauge_stations": int(gauge_events["station_name"].nunique()) if not gauge_events.empty else 0,
        "curated_coordinate_events": len(curated_events),
        "distinct_national_hotspots": len(hotspots),
        "states_covered": sorted(hotspots["state"].dropna().unique().tolist()) if not hotspots.empty else [],
    }

    return NationalFloodDataset(
        gauge_events=gauge_events,
        cwc_state_risk=cwc_risks,
        urban_hotspots=hotspots,
        report=report,
    )
