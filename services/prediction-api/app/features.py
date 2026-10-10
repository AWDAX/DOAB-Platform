"""Feature engineering for the one-hour-ahead waterlogging model.

Causality rule: a row with issue_time T may only use rainfall observed at or before T.
The model predicts the target hour T + 1h, so the event hour itself is never used as input.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

WET_THRESHOLD_MM = 0.2
DRY_CAP_HOURS = 336.0  # two weeks; longer dry spells are treated as "no recent rain"
EARTH_RADIUS_M = 6_371_000.0
HOTSPOT_RADIUS_M = 1000.0
RELIEF_OFFSET_DEG = 0.0045  # about 500 m north/south/east/west for the relief index

WEATHER_FEATURES = [
    "precip_1h",
    "precip_3h",
    "precip_6h",
    "precip_12h",
    "precip_24h",
    "precip_72h",
    "precip_7d",
    "precip_max_1h_6h",
    "rain_trend_1h_vs_3h",
    "hours_since_rain",
]
TERRAIN_FEATURES = ["elevation_m", "relief_index"]
TIME_FEATURES = ["hour_of_day", "month", "is_monsoon"]
HOTSPOT_FEATURE = "hotspot_density_1km"

FEATURE_COLUMNS = WEATHER_FEATURES + TERRAIN_FEATURES + TIME_FEATURES + [HOTSPOT_FEATURE]


def weather_feature_table(precip: pd.Series) -> pd.DataFrame:
    """Causal rolling features indexed by hour. Row t uses precipitation at or before t only."""
    series = precip.sort_index().astype("float64")
    hourly_index = pd.date_range(series.index.min(), series.index.max(), freq="h")
    series = series.reindex(hourly_index).fillna(0.0)

    table = pd.DataFrame(index=hourly_index)
    table["precip_1h"] = series
    table["precip_3h"] = series.rolling(3, min_periods=1).sum()
    table["precip_6h"] = series.rolling(6, min_periods=1).sum()
    table["precip_12h"] = series.rolling(12, min_periods=1).sum()
    table["precip_24h"] = series.rolling(24, min_periods=1).sum()
    table["precip_72h"] = series.rolling(72, min_periods=1).sum()
    table["precip_7d"] = series.rolling(168, min_periods=1).sum()
    table["precip_max_1h_6h"] = series.rolling(6, min_periods=1).max()
    table["rain_trend_1h_vs_3h"] = series - table["precip_3h"] / 3.0

    wet_times = pd.Series(hourly_index, index=hourly_index).where(series >= WET_THRESHOLD_MM)
    last_wet = wet_times.ffill()
    hours_since = (pd.Series(hourly_index, index=hourly_index) - last_wet).dt.total_seconds() / 3600.0
    table["hours_since_rain"] = hours_since.fillna(DRY_CAP_HOURS).clip(upper=DRY_CAP_HOURS)
    return table


def terrain_features(center_m: float, neighbors_m: list[float]) -> dict[str, float]:
    """neighbors_m: elevations at N, S, E, W offsets of RELIEF_OFFSET_DEG (in that order)."""
    return {
        "elevation_m": float(center_m),
        # Positive = point is lower than its surroundings (a basin-like low spot).
        "relief_index": float(np.mean(neighbors_m) - center_m),
    }


def neighbor_points(lat: float, lng: float) -> list[tuple[float, float]]:
    d = RELIEF_OFFSET_DEG
    return [(lat + d, lng), (lat - d, lng), (lat, lng + d), (lat, lng - d)]


def time_features(target_time: pd.Timestamp) -> dict[str, float]:
    return {
        "hour_of_day": float(target_time.hour),
        "month": float(target_time.month),
        "is_monsoon": float(target_time.month in (6, 7, 8, 9)),
    }


class HotspotIndex:
    """Count of historical water-complaint locations within HOTSPOT_RADIUS_M.

    Built only from the training fold. Training rows that are themselves indexed events
    are corrected by counts_for_training() so a row never counts itself.
    """

    def __init__(self, lats: np.ndarray, lngs: np.ndarray):
        self._n = len(lats)
        self._tree = BallTree(np.radians(np.column_stack([lats, lngs])), metric="haversine")

    @property
    def size(self) -> int:
        return self._n

    def nearest_metres(self, lat: float, lng: float) -> float:
        query = np.radians([[lat, lng]])
        dist, _ = self._tree.query(query, k=1)
        return float(dist[0][0]) * EARTH_RADIUS_M

    def counts(self, lats: np.ndarray, lngs: np.ndarray) -> np.ndarray:
        query = np.radians(np.column_stack([lats, lngs]))
        radius = HOTSPOT_RADIUS_M / EARTH_RADIUS_M
        return self._tree.query_radius(query, r=radius, count_only=True).astype("float64")

    def counts_for_training(self, lats: np.ndarray, lngs: np.ndarray, is_indexed_event: np.ndarray) -> np.ndarray:
        """Leave-one-out counts for rows that are themselves in the index."""
        counts = self.counts(lats, lngs)
        counts[is_indexed_event] -= 1.0
        return counts
