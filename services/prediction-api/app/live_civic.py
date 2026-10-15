"""Live official civic incident & disaster alert ingestion.

Connects DOAB to verified Indian government feeds:
1. NDMA Sachet (National Disaster Management Authority) - Common Alerting Protocol (CAP)
2. GMDA OneMap (Gurugram Metropolitan Development Authority) - ArcGIS REST FeatureServer
"""

from __future__ import annotations

import json
import logging
import ssl
import time
import urllib.request
from typing import Any

log = logging.getLogger(__name__)

NDMA_ALERTS_URL = "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails"
GMDA_ARCGIS_URL = (
    "https://onemapdepts.gmda.gov.in/server/rest/services/flood_survey_2/FeatureServer/0/query"
    "?where=1%3D1&outFields=*&f=geojson&resultRecordCount=100"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}

# Cache configurations
_ndma_cache: tuple[float, list[dict[str, Any]]] | None = None
_gmda_cache: tuple[float, list[dict[str, Any]]] | None = None
NDMA_CACHE_TTL = 600   # 10 minutes
GMDA_CACHE_TTL = 900   # 15 minutes


def _create_legacy_ssl_context() -> ssl.SSLContext:
    """Create an SSL context supporting legacy TLS renegotiation for Indian municipal servers."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        # OpenSSL 3.0 legacy renegotiation flag
        OP_LEGACY_SERVER_CONNECT = 0x4
        ctx.options |= OP_LEGACY_SERVER_CONNECT
    except Exception:
        pass
    return ctx


def fetch_live_ndma_alerts() -> list[dict[str, Any]]:
    """Fetch live disaster & flood warnings from the NDMA Sachet national platform."""
    global _ndma_cache
    now = time.time()
    if _ndma_cache and now - _ndma_cache[0] < NDMA_CACHE_TTL:
        return _ndma_cache[1]

    normalized_alerts: list[dict[str, Any]] = []
    try:
        ctx = _create_legacy_ssl_context()
        req = urllib.request.Request(NDMA_ALERTS_URL, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            if resp.status == 200:
                raw_data = json.loads(resp.read().decode("utf-8", errors="ignore"))
                if isinstance(raw_data, list):
                    for item in raw_data:
                        # Extract coordinates from centroid string e.g. "81.25,26.20"
                        centroid_str = item.get("centroid") or ""
                        lat: float | None = None
                        lng: float | None = None
                        if centroid_str and "," in centroid_str:
                            parts = centroid_str.split(",")
                            try:
                                # NDMA centroid is typically lng,lat or lat,lng based on bounds
                                # In Indian geography: lat is ~8 to 37, lng is ~68 to 97
                                p0, p1 = float(parts[0].strip()), float(parts[1].strip())
                                if 65 <= p0 <= 100 and 6 <= p1 <= 40:
                                    lng, lat = p0, p1
                                elif 6 <= p0 <= 40 and 65 <= p1 <= 100:
                                    lat, lng = p0, p1
                            except (ValueError, IndexError):
                                pass

                        disaster = str(item.get("disaster_type", "Weather Alert")).strip()
                        raw_sev = str(item.get("severity", "Medium")).strip()
                        severity = "Medium"
                        if any(x in raw_sev.lower() for x in ["red", "emergency", "extreme", "severe"]):
                            severity = "Critical"
                        elif any(x in raw_sev.lower() for x in ["orange", "warning", "high"]):
                            severity = "High"
                        elif any(x in raw_sev.lower() for x in ["yellow", "watch", "moderate"]):
                            severity = "Medium"
                        else:
                            severity = "Low"

                        normalized_alerts.append({
                            "id": f"NDMA-{item.get('identifier', int(now))}",
                            "source": "NDMA Sachet (National Disaster Alert)",
                            "disaster_type": disaster,
                            "category": "Flood" if "flood" in disaster.lower() else "Severe_Weather",
                            "severity": severity,
                            "severity_level": item.get("severity_level", ""),
                            "area_description": item.get("area_description", "India Region"),
                            "lat": lat,
                            "lng": lng,
                            "effective_start_time": item.get("effective_start_time"),
                            "effective_end_time": item.get("effective_end_time"),
                            "warning_message": item.get("warning_message", ""),
                            "color": item.get("severity_color", "#FFA500"),
                            "sender_org": item.get("sender_org_id", "SDMA/NDMA"),
                            "status": "Active",
                        })
        _ndma_cache = (now, normalized_alerts)
        log.info("Successfully fetched and cached %d NDMA live alerts", len(normalized_alerts))
    except Exception as exc:
        log.warning("NDMA alerts fetch failed: %s. Using cached if present.", exc)
        if _ndma_cache:
            return _ndma_cache[1]

    return normalized_alerts


def fetch_live_gmda_incidents() -> list[dict[str, Any]]:
    """Fetch official surveyed waterlogging spots from GMDA OneMap ArcGIS Server."""
    global _gmda_cache
    now = time.time()
    if _gmda_cache and now - _gmda_cache[0] < GMDA_CACHE_TTL:
        return _gmda_cache[1]

    normalized_incidents: list[dict[str, Any]] = []
    try:
        ctx = _create_legacy_ssl_context()
        req = urllib.request.Request(GMDA_ARCGIS_URL, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            if resp.status == 200:
                raw_data = json.loads(resp.read().decode("utf-8", errors="ignore"))
                features = raw_data.get("features", [])
                for feat in features:
                    geom = feat.get("geometry") or {}
                    coords = geom.get("coordinates") or []
                    props = feat.get("properties") or {}
                    if len(coords) >= 2:
                        lng, lat = float(coords[0]), float(coords[1])
                        oid = props.get("objectid") or feat.get("id")
                        remarks = props.get("remarks") or "Surveyed underpass/road waterlogging hotspot"
                        survey_type = props.get("surveytype") or "Waterlogging"
                        
                        normalized_incidents.append({
                            "id": f"GMDA-WL-{oid}",
                            "source": "GMDA OneMap Official (Gurugram)",
                            "category": "Waterlogging",
                            "survey_type": survey_type,
                            "severity": "High",
                            "lat": lat,
                            "lng": lng,
                            "area_description": f"Gurugram Sector / Zone (Ward {props.get('ward', 'N/A')})",
                            "remarks": remarks,
                            "water_type_road": props.get("water_type_road"),
                            "gully_trap": props.get("gully_trap"),
                            "status": props.get("status") or "Active Survey Point",
                            "updated_time": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(props.get("created_date", now * 1000) / 1000)),
                        })
        _gmda_cache = (now, normalized_incidents)
        log.info("Successfully fetched and cached %d GMDA waterlogging spots", len(normalized_incidents))
    except Exception as exc:
        log.warning("GMDA survey fetch failed: %s. Using cached if present.", exc)
        if _gmda_cache:
            return _gmda_cache[1]

    return normalized_incidents


def get_all_live_civic_data() -> dict[str, Any]:
    """Return consolidated live civic alerts and ground-truth waterlogging incidents."""
    ndma = fetch_live_ndma_alerts()
    gmda = fetch_live_gmda_incidents()
    
    # Filter for active flood/waterlogging specific items
    flood_alerts = [a for a in ndma if a.get("category") == "Flood" or "rain" in str(a.get("disaster_type", "")).lower()]
    
    return {
        "status": "ok",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": {
            "ndma_total_alerts": len(ndma),
            "ndma_flood_alerts": len(flood_alerts),
            "gmda_waterlogging_points": len(gmda),
        },
        "national_alerts": ndma,
        "municipal_waterlogging": gmda,
    }
