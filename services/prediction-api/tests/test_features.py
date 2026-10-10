import numpy as np
import pandas as pd

from app.features import HOTSPOT_FEATURE, HotspotIndex, weather_feature_table


def test_rolling_rain_does_not_use_the_next_hour():
    index = pd.date_range("2020-06-01", periods=4, freq="h")
    precip = pd.Series([0.0, 0.0, 1.0, 100.0], index=index)
    table = weather_feature_table(precip)
    issue = index[2]
    assert table.loc[issue, "precip_1h"] == 1.0
    assert table.loc[issue, "precip_3h"] == 1.0
    assert 100.0 not in table.loc[issue, ["precip_1h", "precip_3h"]].to_numpy()


def test_training_hotspot_does_not_count_itself():
    lats = np.array([12.97, 12.971, 13.2])
    lngs = np.array([77.59, 77.591, 77.7])
    index = HotspotIndex(lats, lngs)
    raw = index.counts(lats[:1], lngs[:1])
    left_out = index.counts_for_training(lats[:1], lngs[:1], np.array([True]))
    assert raw[0] >= 1
    assert left_out[0] == raw[0] - 1
    assert HOTSPOT_FEATURE == "hotspot_density_1km"
