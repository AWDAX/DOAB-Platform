import pandas as pd

from app.incidents import clean_incidents
from app.national_labels import _is_bihar_variable, _is_telangana_inventory


def _row(**overrides):
    base = {
        "latitude": "12.9716",
        "longitude": "77.5946",
        "created_at": "1/15/2020 10:30",
        "title": "Pothole",
        "description": "bad road",
        "sub_category_title": "Others",
    }
    base.update(overrides)
    return base


def test_quality_gates_drop_ambiguous_dates_and_keep_slash_water_rows():
    raw = pd.DataFrame(
        [
            _row(
                title="Waterlogging on road",
                description="knee deep water",
                sub_category_title="Flooding/Waterlogging Of Roads And Footpaths",
            ),
            _row(created_at="15-1-2020 10:30", title="dash date"),
            _row(latitude="10.0", longitude="77.0", title="outside"),
            _row(title="Pothole"),
            _row(title="Pothole"),
        ]
    )
    result = clean_incidents(raw)
    assert len(result.events) == 1
    assert len(result.controls_pool) == 1
    assert result.report["rows_dropped"]["ambiguous_day_month_order"] == 1
    assert result.report["rows_dropped"]["outside_pilot_bbox"] == 1
    assert result.report["rows_dropped"]["duplicate"] == 1


def test_national_exclusions():
    assert _is_bihar_variable("Bihar", "https://example/MASTER_VARIABLES.csv")
    assert not _is_bihar_variable("Karnataka", "https://example/MASTER_VARIABLES.csv")
    assert _is_telangana_inventory("Telangana", "https://data.telangana.gov.in/dataset/lakes-and-water-bodies", "", "")
    assert not _is_telangana_inventory("Telangana", "https://news.example/flood", "news", "flood")
