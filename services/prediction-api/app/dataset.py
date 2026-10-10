"""Build the training table: case rows (water complaints) and matched control rows.

Design (case-control):
- Case: a water/drainage complaint (see incidents.py for the rule).
- Control: a non-water complaint from the same export. Controls share the same
  spatial distribution of complaint filers, which removes most of the "where people
  complain" density bias. They still share the same time period, so rainfall
  differences are the main signal the model can learn.
- Each case's target hour is its complaint hour (floored). Features use rainfall up to
  one hour before that hour.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from .config import (
    EVENT_WINDOW_END,
    EVENT_WINDOW_START,
    PROCESSED_DIR,
    WEATHER_FETCH_END,
    WEATHER_FETCH_START,
)
from .features import (
    TERRAIN_FEATURES,
    TIME_FEATURES,
    WEATHER_FEATURES,
    neighbor_points,
    terrain_features,
    time_features,
    weather_feature_table,
)
from .incidents import CleanResult, load_and_clean
from .weather import fetch_archive_precip, fetch_elevations, weather_cell

log = logging.getLogger(__name__)
SEED = 42
CONTROLS_PER_CASE = 2
TRAINING_TABLE_PATH = PROCESSED_DIR / "training_table.csv"


def sample_controls(controls_pool: pd.DataFrame, cases: pd.DataFrame, per_case: int) -> pd.DataFrame:
    wanted = len(cases) * per_case
    replace = wanted > len(controls_pool)
    sampled = controls_pool.sample(n=wanted, replace=replace, random_state=SEED).reset_index(drop=True)
    return sampled


def build_case_control_frame(clean: CleanResult) -> pd.DataFrame:
    cases = clean.events.copy()
    cases["record_type"] = "case"
    cases["label"] = 1

    controls = sample_controls(clean.controls_pool, cases, CONTROLS_PER_CASE).copy()
    controls["record_type"] = "control"
    controls["label"] = 0

    frame = pd.concat([cases, controls], ignore_index=True)
    frame["target_time"] = frame["event_time"].dt.floor("h")
    frame["issue_time"] = frame["target_time"] - pd.Timedelta(hours=1)
    frame["cell"] = [weather_cell(la, ln) for la, ln in zip(frame["lat"], frame["lng"], strict=True)]
    return frame


def attach_weather(frame: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    frame = frame.copy()
    for column in WEATHER_FEATURES:
        frame[column] = np.nan

    missing_cells = []
    cells = list(frame.groupby("cell"))
    for index, (cell, group) in enumerate(cells, start=1):
        log.info("weather cell %s/%s %s", index, len(cells), cell)
        try:
            precip = fetch_archive_precip(cell, WEATHER_FETCH_START, WEATHER_FETCH_END)
        except RuntimeError as exc:
            log.error("weather fetch failed for cell %s: %s", cell, exc)
            missing_cells.append(cell)
            continue
        table = weather_feature_table(precip)
        looked_up = table.reindex(group["issue_time"].values)
        looked_up.index = group.index
        frame.loc[group.index, WEATHER_FEATURES] = looked_up[WEATHER_FEATURES].values

    report = {"weather_cells": int(frame["cell"].nunique()), "weather_cells_failed": missing_cells}
    return frame, report


def attach_terrain(frame: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    frame = frame.copy()
    points = []
    for lat, lng in zip(frame["lat"], frame["lng"], strict=True):
        points.append((lat, lng))
        points.extend(neighbor_points(lat, lng))
    unique_points = list(dict.fromkeys(points))
    elevations = dict(zip(unique_points, fetch_elevations(unique_points), strict=True))

    rows = []
    for lat, lng in zip(frame["lat"], frame["lng"], strict=True):
        center = elevations[(lat, lng)]
        neighbors = [elevations[p] for p in neighbor_points(lat, lng)]
        rows.append(terrain_features(center, neighbors))
    terrain = pd.DataFrame(rows, index=frame.index)
    for column in TERRAIN_FEATURES:
        frame[column] = terrain[column]
    return frame, {"unique_elevation_points": len(unique_points)}


def attach_time(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    rows = [time_features(t) for t in frame["target_time"]]
    times = pd.DataFrame(rows, index=frame.index)
    for column in TIME_FEATURES:
        frame[column] = times[column]
    return frame


def build_training_table(incident_csv: Path, output_path: Path = TRAINING_TABLE_PATH) -> tuple[pd.DataFrame, dict]:
    clean = load_and_clean(incident_csv)
    frame = build_case_control_frame(clean)
    frame, weather_report = attach_weather(frame)
    frame, terrain_report = attach_terrain(frame)
    frame = attach_time(frame)

    feature_cols = WEATHER_FEATURES + TERRAIN_FEATURES + TIME_FEATURES
    complete = frame.dropna(subset=feature_cols)
    report = {
        "cleaning": clean.report,
        "window": {"start": EVENT_WINDOW_START, "end": EVENT_WINDOW_END},
        "rows_before_feature_join": int(len(frame)),
        "rows_without_complete_features": int(len(frame) - len(complete)),
        "rows_in_training_table": int(len(complete)),
        "cases": int((complete["label"] == 1).sum()),
        "controls": int((complete["label"] == 0).sum()),
        "weather": weather_report,
        "terrain": terrain_report,
        "controls_per_case": CONTROLS_PER_CASE,
        "seed": SEED,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    keep = [
        "record_type", "label", "source_row", "lat", "lng", "target_time", "issue_time",
        *feature_cols,
    ]
    complete[keep].to_csv(output_path, index=False)
    return complete.reset_index(drop=True), report
