from app.boundaries import pilot_polygon, locate
from app.routing import decode_polyline, maps_directions_url, recommend_routes


def test_maps_url_has_origin_destination_and_no_secret():
    url = maps_directions_url((12.97, 77.59), (12.99, 77.62), [(12.98, 77.60)])
    assert url.startswith("https://www.google.com/maps/dir/?api=1")
    assert "origin=12.97,77.59" in url
    assert "destination=12.99,77.62" in url
    assert "waypoints=12.98,77.6" in url
    assert "key=" not in url


def test_polyline_round_trip_shape():
    # Encoded form of (38.5, -120.2) from the Google polyline algorithm sample.
    points = decode_polyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
    assert len(points) == 3
    assert abs(points[0][0] - 38.5) < 0.01


def test_missing_route_key_is_unscored(monkeypatch):
    monkeypatch.delenv("GOOGLE_ROUTES_API_KEY", raising=False)
    result = recommend_routes((12.97, 77.59), (12.99, 77.62))
    assert result["scored"] is False
    assert result["label"] == "unscored"
    assert result["routes"][0]["mean_risk"] is None
    assert result["routes"][0]["maps_url"].startswith("https://www.google.com/maps/dir/")


def test_pilot_box_contains_bengaluru_centre():
    collection = pilot_polygon()
    collection["source"] = "pilot_bbox"
    assert locate(12.97, 77.59, collection)["matched"] is True
    assert locate(28.6, 77.2, collection)["matched"] is False
