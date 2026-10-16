"""Weak national labels from the curated waterlogging table.

These rows have no coordinates, so they are never used as training cases.
Bihar variable-table rows and Telangana inventory rows are excluded from the
label set entirely, as required by the data contract.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import REPO_ROOT, SERVICE_ROOT

def _find_curated_csv() -> Path:
    candidates = [
        REPO_ROOT / "Muncipal corp Dataset" / "WaterLogging Dataset" / "Clean" / "curated_waterlogging_clean.csv",
        Path("/home/ubuntu/Muncipal corp Dataset/WaterLogging Dataset/Clean/curated_waterlogging_clean.csv"),
        SERVICE_ROOT / "data" / "raw" / "curated_waterlogging_clean.csv",
        Path.cwd() / "Muncipal corp Dataset" / "WaterLogging Dataset" / "Clean" / "curated_waterlogging_clean.csv",
    ]
    for c in candidates:
        if c.is_file():
            return c
    return candidates[0]

DEFAULT_CURATED = _find_curated_csv()

BIHAR_VARIABLE_MARKERS = ("MASTER_VARIABLES.csv", "flood-data-ecosystem-Bihar")
TELANGANA_INVENTORY_MARKERS = (
    "inventory",
    "asset_inventory",
    "tanker_inventory",
    "dataset/lakes-and-water-bodies",
)


def _is_bihar_variable(state: str, source_url: str) -> bool:
    if state.strip().lower() != "bihar":
        return False
    url = source_url.lower()
    return any(marker.lower() in url for marker in BIHAR_VARIABLE_MARKERS)


def _is_telangana_inventory(state: str, source_url: str, source_type: str, category: str) -> bool:
    if state.strip().lower() != "telangana":
        return False
    blob = f"{source_url} {source_type} {category}".lower()
    return any(marker in blob for marker in TELANGANA_INVENTORY_MARKERS)


def clean_national_labels(path: Path = DEFAULT_CURATED) -> tuple[pd.DataFrame, dict]:
    """Return weak label rows and a drop report. Coordinates are not invented."""
    raw = pd.read_csv(path, dtype=str, keep_default_na=False)
    drop_reasons = {"bihar_variable_rows": 0, "telangana_inventory_rows": 0, "missing_state_or_date": 0}
    kept: list[dict] = []
    for _, row in raw.iterrows():
        state = row.get("State", "")
        url = row.get("Source_URL", "")
        source_type = row.get("Source_Type", "")
        category = row.get("Category_Standardized", "")
        when = row.get("Incident_Date_Normalized", "")
        location = row.get("Location", "")
        if not state or not when:
            drop_reasons["missing_state_or_date"] += 1
            continue
        if _is_bihar_variable(state, url):
            drop_reasons["bihar_variable_rows"] += 1
            continue
        if _is_telangana_inventory(state, url, source_type, category):
            drop_reasons["telangana_inventory_rows"] += 1
            continue
        kept.append(
            {
                "state": state,
                "location_text": location,
                "date": when,
                "category": category,
                "source_url": url,
                "label_strength": "weak_no_coordinates",
            }
        )
    frame = pd.DataFrame(kept)
    report = {
        "source_rows": int(len(raw)),
        "weak_labels_kept": int(len(frame)),
        "rows_dropped": drop_reasons,
        "states": sorted(frame["state"].unique().tolist()) if not frame.empty else [],
        "used_for_training": False,
        "reason": "Rows have place names but no verified coordinates, so they cannot support a spatial model.",
    }
    return frame, report
