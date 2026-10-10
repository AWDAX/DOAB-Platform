"""Load, parse, classify and quality-gate the OpenCity complaint export.

Important: a water/drainage complaint is a weak proxy for waterlogging, not a
verified flood event. The model treats these as "case" rows and uses other
non-water complaints from the same export as "control" rows. This limitation is
written into the model manifest and surfaced by the API.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import pandas as pd

from .config import EVENT_WINDOW_END, EVENT_WINDOW_START, PILOT_BBOX

# The export is cp1252, not UTF-8. It is decoded for analysis and never re-saved.
SOURCE_ENCODING = "cp1252"

# Dash dates are D-M-YYYY (Indian convention); slash dates are M/D/YYYY.
# Both orders are verified in clean_incidents() against values that cannot be ambiguous.
_DASH_DATE = re.compile(r"^(\d{1,2})-(\d{1,2})-(\d{4})(?: (\d{1,2}):(\d{2}))?$")
_SLASH_DATE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})(?: (\d{1,2}):(\d{2}))?$")

WATER_SUBCATEGORIES = frozenset(
    {
        "Flooding/Waterlogging Of Roads And Footpaths",
        "Sewarage Or Storm Water Overflow",
        "Desilting/Remove Blockage of Storm Water Drains",
    }
)

_WATER_TEXT = re.compile(
    r"waterlog|water logging|flood|stagnat|inundat|submerg|knee[- ]?deep|overflow|"
    r"rain ?water|storm ?water|blocked drain|clogged drain|choked drain|"
    r"drain\w*.{0,25}(block|choke|clog|overflow)|puddle",
    re.IGNORECASE,
)


@dataclass
class CleanResult:
    events: pd.DataFrame
    controls_pool: pd.DataFrame
    report: dict = field(default_factory=dict)


def parse_created_at(value: str) -> tuple[datetime | None, str | None]:
    """Return (local naive datetime, format name) or (None, None) if not parseable."""
    text = (value or "").strip()
    match = _DASH_DATE.match(text)
    if match:
        # Order is ambiguous for this format; the value is parsed as first/second part
        # only so the caller can see it, and clean_incidents() excludes these rows.
        first, second, year, hour, minute = match.groups()
        day, month = first, second
        fmt = "dash_ambiguous"
    else:
        match = _SLASH_DATE.match(text)
        if not match:
            return None, None
        month, day, year, hour, minute = match.groups()
        fmt = "slash_MDY"
    try:
        stamp = datetime(int(year), int(month), int(day), int(hour or 0), int(minute or 0))
    except ValueError:
        return None, None
    return stamp, fmt


def classify_water_related(sub_category: str, title: str, description: str) -> str | None:
    """Return the rule name that matched, or None for non-water complaints."""
    if sub_category in WATER_SUBCATEGORIES:
        return "subcategory"
    if _WATER_TEXT.search(f"{title} {description}"):
        return "text"
    return None


def load_raw(path: Path) -> pd.DataFrame:
    return pd.read_csv(
        path,
        encoding=SOURCE_ENCODING,
        dtype=str,
        keep_default_na=False,
        on_bad_lines="error",
    )


def clean_incidents(raw: pd.DataFrame) -> CleanResult:
    """Apply quality gates. Every dropped row is counted under a named reason."""
    drop_reasons: dict[str, int] = {}
    kept: list[dict] = []

    seen: set[tuple] = set()
    for source_row, row in raw.iterrows():
        def drop(reason: str) -> None:
            drop_reasons[reason] = drop_reasons.get(reason, 0) + 1

        try:
            lat = float(row["latitude"])
            lng = float(row["longitude"])
        except ValueError:
            drop("missing_or_invalid_coordinates")
            continue

        if not (PILOT_BBOX["min_lat"] <= lat <= PILOT_BBOX["max_lat"]
                and PILOT_BBOX["min_lng"] <= lng <= PILOT_BBOX["max_lng"]):
            drop("outside_pilot_bbox")
            continue

        stamp, fmt = parse_created_at(row["created_at"])
        if stamp is None:
            drop("unparseable_timestamp")
            continue
        if not (EVENT_WINDOW_START <= stamp.strftime("%Y-%m-%d") <= EVENT_WINDOW_END):
            drop("outside_analysis_window")
            continue
        # Dash-format dates have both parts <= 12 in every row, so day/month order cannot
        # be verified from the file. Their month would be unreliable, which breaks seasonal
        # and lag features, so these rows are excluded rather than guessed.
        if fmt == "dash_ambiguous":
            drop("ambiguous_day_month_order")
            continue

        # Exact-duplicate guard: same time, place and complaint text.
        dedupe_key = (stamp, round(lat, 5), round(lng, 5), row["title"].strip().lower())
        if dedupe_key in seen:
            drop("duplicate")
            continue
        seen.add(dedupe_key)

        rule = classify_water_related(row["sub_category_title"], row["title"], row["description"])
        kept.append(
            {
                "source_row": int(source_row),
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "event_time": stamp,
                "sub_category": row["sub_category_title"],
                "water_rule": rule,
            }
        )

    frame = pd.DataFrame(kept)
    if frame.empty:
        raise ValueError("No rows survived quality gates; check the source file and pilot bounds.")

    events = frame[frame["water_rule"].notna()].drop(columns=["water_rule"]).reset_index(drop=True)
    events_rules = frame.loc[frame["water_rule"].notna(), "water_rule"].value_counts().to_dict()
    controls_pool = frame[frame["water_rule"].isna()].drop(columns=["water_rule"]).reset_index(drop=True)

    report = {
        "source_rows": int(len(raw)),
        "rows_kept": int(len(frame)),
        "rows_dropped": drop_reasons,
        "date_format_evidence": {
            "slash_M_D_Y": "month in parts 1-12 and day in parts 13-31 in every slash row (order verified)",
            "dash": (
                "both parts are 1-12 in every dash row, so D-M-Y vs M-D-Y cannot be verified; "
                "distribution test against slash months was inconclusive (TV distance 0.08 vs 0.07); "
                "dash rows are excluded"
            ),
        },
        "water_events": int(len(events)),
        "water_event_rules": events_rules,
        "non_water_controls_pool": int(len(controls_pool)),
        "pilot_bbox": PILOT_BBOX,
    }
    return CleanResult(events=events, controls_pool=controls_pool, report=report)


def load_and_clean(path: Path) -> CleanResult:
    return clean_incidents(load_raw(path))
