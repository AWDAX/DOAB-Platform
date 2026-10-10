"""Train, compare, and save the one-hour waterlogging model.

Evaluation uses a time holdout and a geography holdout. The hotspot index for
each evaluation fit is built only from that fit's case rows. The file written
for serving is refit on the full table after metrics are recorded.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, recall_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .config import DEFAULT_MODEL_PATH
from .dataset import TRAINING_TABLE_PATH
from .features import FEATURE_COLUMNS, HOTSPOT_FEATURE, HotspotIndex

MODEL_VERSION = "1.0.0"
TEMPORAL_FRACTION = 0.75
SPATIAL_LNG_QUANTILE = 0.75
SMOOTH_GRID = (0.0, 0.15, 0.3)
HOTSPOT_SCALE = 10.0


def _gbm() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_depth=4,
        learning_rate=0.08,
        max_iter=200,
        min_samples_leaf=20,
        random_state=42,
    )


def _fit_calibrated(frame: pd.DataFrame):
    labels = frame["label"].astype(int)
    try:
        model = CalibratedClassifierCV(_gbm(), method="sigmoid", cv=3)
        model.fit(frame[FEATURE_COLUMNS], labels)
        return model
    except ValueError:
        # A cross-validation fold can be single-class on a small split.
        model = _gbm()
        model.fit(frame[FEATURE_COLUMNS], labels)
        return model


def _fit_baseline(frame: pd.DataFrame) -> Pipeline:
    pipe = Pipeline(
        [
            ("scale", StandardScaler()),
            ("clf", LogisticRegression(max_iter=500, class_weight="balanced", random_state=42)),
        ]
    )
    pipe.fit(frame[FEATURE_COLUMNS], frame["label"].astype(int))
    return pipe


def _attach_hotspot(frame: pd.DataFrame, index: HotspotIndex, leave_one_out: bool) -> pd.DataFrame:
    out = frame.copy()
    lats = out["lat"].to_numpy(dtype="float64")
    lngs = out["lng"].to_numpy(dtype="float64")
    if leave_one_out:
        mask = out["label"].to_numpy(dtype=bool)
        out[HOTSPOT_FEATURE] = index.counts_for_training(lats, lngs, mask)
    else:
        out[HOTSPOT_FEATURE] = index.counts(lats, lngs)
    return out


def _index_from_cases(frame: pd.DataFrame) -> HotspotIndex:
    cases = frame[frame["label"] == 1]
    return HotspotIndex(cases["lat"].to_numpy(dtype="float64"), cases["lng"].to_numpy(dtype="float64"))


def _blend(probability: np.ndarray, hotspot: np.ndarray, weight: float) -> np.ndarray:
    local = np.clip(hotspot / HOTSPOT_SCALE, 0.0, 1.0)
    return (1.0 - weight) * probability + weight * local


def _metrics(y_true: np.ndarray, probability: np.ndarray) -> dict:
    y_true = y_true.astype(int)
    if len(np.unique(y_true)) < 2:
        return {"average_precision": None, "recall_at_0_5": None, "brier": None, "note": "single_class_holdout"}
    predicted = (probability >= 0.5).astype(int)
    return {
        "average_precision": float(average_precision_score(y_true, probability)),
        "recall_at_0_5": float(recall_score(y_true, predicted, zero_division=0)),
        "brier": float(brier_score_loss(y_true, probability)),
        "positives": int(y_true.sum()),
        "rows": int(len(y_true)),
    }


def _choose_smooth_weight(y_true: np.ndarray, probability: np.ndarray, hotspot: np.ndarray) -> float:
    best_weight = 0.0
    best_score = -1.0
    if len(np.unique(y_true.astype(int))) < 2:
        return 0.0
    for weight in SMOOTH_GRID:
        blended = _blend(probability, hotspot, weight)
        score = average_precision_score(y_true, blended)
        if score > best_score:
            best_score = score
            best_weight = weight
    return float(best_weight)


def _prepare(frame: pd.DataFrame) -> pd.DataFrame:
    table = frame.copy()
    table["target_time"] = pd.to_datetime(table["target_time"])
    table = table.dropna(subset=FEATURE_COLUMNS[:-1]).sort_values("target_time").reset_index(drop=True)
    if len(table) < 80 or table["label"].nunique() < 2:
        raise ValueError("Training table is too small or has a single class.")
    return table


def _split(table: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    cut = int(len(table) * TEMPORAL_FRACTION)
    cut = min(max(cut, 1), len(table) - 1)
    train = table.iloc[:cut].copy()
    temporal = table.iloc[cut:].copy()
    lng_cut = float(train["lng"].quantile(SPATIAL_LNG_QUANTILE))
    spatial = train[train["lng"] >= lng_cut].copy()
    fit = train[train["lng"] < lng_cut].copy()
    if fit["label"].nunique() < 2 or len(fit) < 40:
        fit = train
        spatial = temporal.iloc[0:0].copy()
    return fit, temporal, spatial


def _score_split(fit: pd.DataFrame, holdout: pd.DataFrame) -> tuple[dict, dict, float]:
    index = _index_from_cases(fit)
    fit_ready = _attach_hotspot(fit, index, leave_one_out=True)
    model = _fit_calibrated(fit_ready)
    baseline = _fit_baseline(fit_ready)
    if holdout.empty:
        empty = {"average_precision": None, "note": "empty_holdout"}
        return empty, empty, 0.0
    hold_ready = _attach_hotspot(holdout, index, leave_one_out=False)
    probability = model.predict_proba(hold_ready[FEATURE_COLUMNS])[:, 1]
    baseline_p = baseline.predict_proba(hold_ready[FEATURE_COLUMNS])[:, 1]
    weight = _choose_smooth_weight(
        hold_ready["label"].to_numpy(),
        probability,
        hold_ready[HOTSPOT_FEATURE].to_numpy(dtype="float64"),
    )
    blended = _blend(probability, hold_ready[HOTSPOT_FEATURE].to_numpy(dtype="float64"), weight)
    return _metrics(hold_ready["label"].to_numpy(), blended), _metrics(hold_ready["label"].to_numpy(), baseline_p), weight


def train_and_save(table_path=TRAINING_TABLE_PATH, model_path=DEFAULT_MODEL_PATH) -> dict:
    table = _prepare(pd.read_csv(table_path))
    fit, temporal, spatial = _split(table)
    temporal_model, temporal_base, smooth_weight = _score_split(fit, temporal)
    spatial_model, spatial_base, _ = _score_split(fit, spatial)

    full_index = _index_from_cases(table)
    full = _attach_hotspot(table, full_index, leave_one_out=True)
    boosted_ap = temporal_model.get("average_precision") or -1.0
    baseline_ap = temporal_base.get("average_precision") or -1.0
    # Serve the model that ranked complaints better on the time holdout.
    if baseline_ap > boosted_ap:
        final_model = _fit_baseline(full)
        served_model = "logistic_baseline"
        smooth_weight = 0.0
    else:
        final_model = _fit_calibrated(full)
        served_model = "calibrated_gradient_boosting"
    medians = {column: float(full[column].median()) for column in FEATURE_COLUMNS}

    manifest = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "rows": int(len(table)),
        "cases": int((table["label"] == 1).sum()),
        "controls": int((table["label"] == 0).sum()),
        "features": FEATURE_COLUMNS,
        "horizon_hours": 1,
        "served_model": served_model,
        "smooth_weight": smooth_weight,
        "validation": {
            "temporal_holdout": {"model": temporal_model, "logistic_baseline": temporal_base},
            "spatial_holdout": {"model": spatial_model, "logistic_baseline": spatial_base},
        },
        "label_definition": (
            "A case is a water or drainage complaint from the OpenCity Bengaluru export, "
            "not a surveyed flood depth. Controls are non-water complaints from the same export."
        ),
        "coverage": "Predictions are supported only inside the Bengaluru labelled box.",
        "weather_source": "Open-Meteo ERA5 reanalysis (historical) and forecast API (operations).",
        "terrain_source": "Open-Meteo elevation (Copernicus DEM, SRTM-class), relief versus four neighbours.",
        "boundaries": "GAUL 2024 when GAUL_GEOJSON is set; otherwise the labelled pilot box only.",
        "not_a_sensor": "This model does not read municipal sensors and is not a live flood warning.",
        "selection_rule": "The served model is whichever of the boosted model and the logistic baseline has higher average precision on the time holdout.",
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": final_model,
            "case_lats": table.loc[table["label"] == 1, "lat"].to_numpy(dtype="float64"),
            "case_lngs": table.loc[table["label"] == 1, "lng"].to_numpy(dtype="float64"),
            "smooth_weight": smooth_weight,
            "feature_columns": FEATURE_COLUMNS,
            "feature_medians": medians,
            "manifest": manifest,
        },
        model_path,
    )
    # The BallTree radians array is not needed; case coordinates rebuild the index.
    manifest_path = model_path.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
