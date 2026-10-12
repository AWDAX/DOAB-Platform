# DOAB / SAHNIRMAAN: Future National Grid & Real-Time IMD Architecture Plan

**Document Version:** 1.0.0  
**Project:** DOAB (Dynamic Overland Aquifer & Bathymetry Flood Intelligence) / SAHNIRMAAN  
**Date:** October 12, 2026  
**Status:** Approved Architectural Roadmap (Future Plan & Hackathon Demo Blueprint)

---

## Executive Summary

This document formalizes the future technical architecture for scaling the DOAB waterlogging intelligence platform from a metropolitan pilot to a **pan-India, real-time hazard routing and early-warning grid**. 

It details the synthesis of three core capabilities:
1. **Official Meteorological Ground Truth:** Reverse-engineered REST endpoints from the India Meteorological Department (IMD) spanning **1,405 stations nationwide**.
2. **Micro-Physical Topography & ML:** A calibrated `HistGradientBoosting` classifier evaluating SRTM digital elevation depressions, terrain slope, and historical drainage vulnerabilities.
3. **Temporal Remediation Decay:** An exponential half-life weighting model that penalizes stale historical complaints to account for municipal civil works and prevent false-positive alarms.

---

## 1. Official IMD Network Integration (`city.imd.gov.in`)

### 1.1 Reverse-Engineered Endpoint Discovery
Through reverse-engineering the production client-side bundle at `https://city.imd.gov.in/citywx/responsive/`, we discovered direct, lightweight JSON REST APIs that require no browser emulation (no Puppeteer needed):

| Purpose | Method & Endpoint | Request Payload | Data Returned |
|---|---|---|---|
| **Station Catalog (Pan-India)** | `GET /citywx/responsive/api/search.php?query=` | Empty query string | Array of **1,405 stations** across all Indian states with `station_id` and city names. |
| **Live Observations & 7-Day Forecast** | `POST /citywx/responsive/api/fetchCity_static.php` | `FormData({ "ID": station_id })` | High-precision `lat`, `lon` (9 decimals), live `rainfall` (mm), `rh0830`/`rh1730` humidity, 7-day past history, 7-day future forecasts, and official IMD hazard colors (`green`, `yellow`, `orange`, `red`). |

### 1.2 Sample Live Payload Verified (Station 42182 - Safdarjung, New Delhi)
```json
{
  "station_id": "42182",
  "station": "New Delhi-Safdarjung",
  "state": "7",
  "lat": "28.580000000",
  "lon": "77.200000000",
  "dat": "2026-10-12",
  "rainfall": "42.00",
  "rh1730": "74",
  "forecast0": "Partly cloudy sky",
  "color0": "yellow",
  "wColor": ["yellow", "green", "green", "green", "green", "green", "green"],
  "wText": [
    "During forenoon - Very Light to Light Rainfall, Thunderstorm accompanied with lightning...",
    "No Warning", ...
  ]
}
```

### 1.3 Production Caching & Rate-Limit Protection
* **Local Spatial Index:** All 1,405 station coordinates are pre-indexed in a spatial KD-Tree (`scipy.spatial.cKDTree` or PostGIS `ST_DWithin`).
* **TTL Cache:** Station responses are cached in Redis / Memory with a **15-minute TTL**. Since IMD observations update in hourly/half-day cycles, duplicate requests for the same city resolve in **< 1 millisecond** with zero network traffic.

---

## 2. National Hierarchical Grid Architecture

```
                    HIERARCHICAL RESOLUTION STACK (Uber H3)

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Level of Detail (LOD) 1: National View (Zoom 4-6)                       │
  │ • H3 Resolution 6 (~36 km² hexagons)                                    │
  │ • Aggregated batch mean of regional risk across state clusters          │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Zooming In
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Level of Detail (LOD) 2: City / District View (Zoom 7-11)               │
  │ • H3 Resolution 8 (~0.73 km² hexagons)                                  │
  │ • Ward-level incident density & nearest IMD station weather             │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Zooming In
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Level of Detail (LOD) 3: Travel Corridor / User View (Zoom 12-16)       │
  │ • H3 Resolution 10 (~15,000 m² micro-cells)                             │
  │ • Elevation depression, local slope, road segment waterlogging risk     │
  └─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Why Uber H3 Hexagons Supercede Square State Grids
1. **Elimination of Geometric Distortion:** A fixed 16x16 square grid across political states creates a 10x resolution disparity (e.g. Rajasthan cells = ~36.5 km vs Goa cells = ~3.8 km). H3 provides mathematically uniform hexagonal cells across the entire globe regardless of state boundaries.
2. **Equidistant Neighboring Vectors:** Square grids suffer from $\sqrt{2} \approx 1.414\times$ diagonal distortion. Hexagons have 6 equidistant neighbors, allowing continuous, distortion-free overland water runoff modeling and pathfinding.
3. **Cross-Border Natural Catchments:** Flood basins (e.g., Gangetic plain, Yamuna basin) span multiple states (Haryana, Delhi, UP, Bihar). Cells are indexed globally, and state filters are applied as non-destructive GeoJSON polygon masks.

---

## 3. Real-Time Risk Synthesis: Live IMD + Historical ML

When a user requests a route or views their current GPS location $(lat, lon)$, the risk score is computed as a weighted composite:

$$\text{CompositeRisk} = w_{\text{ML}} \cdot P_{\text{ML}}(\text{Rain}_{\text{live}}, \text{Slope}, \text{Elev}) + w_{\text{gauge}} \cdot \text{Norm}(\text{Rain}_{\text{live}}) + w_{\text{alert}} \cdot \text{IMD}_{\text{HazardLevel}}$$

### Role Breakdown:
* **$P_{\text{ML}}$ (The Micro-Physical Engine - 50% weight):** Identifies low-elevation bowls, underpasses, and slope basins that physically trap water given a specific rainfall volume.
* **$\text{Rain}_{\text{live}}$ (The Empirical Gauge - 30% weight):** Ground-truth rainfall recorded by the nearest IMD rain gauge station.
* **$\text{IMD}_{\text{HazardLevel}}$ (The Official Alert - 20% weight):**
  - Green $\rightarrow 0.0$
  - Yellow $\rightarrow 0.35$
  - Orange $\rightarrow 0.70$
  - Red $\rightarrow 1.00$

---

## 4. Temporal Decay & Civic Remediation Model

### 4.1 Concept Drift in Municipal Complaints
Municipal complaints are subject to civil remediation:
* Stormwater drains get desilted or enlarged.
* RCC culverts and pumping infrastructure are constructed.
* Therefore, a complaint filed in 2019 cannot carry the same operational weight as one filed in 2026.

### 4.2 Exponential Half-Life Formulation
Historical complaint points decay according to an exponential half-life of $T_{\text{half}} = 24\text{ months}$:

$$w(\Delta t) = 2^{-\frac{\Delta t}{24\text{ months}}}$$

* **Recent Event (3 months old):** $w \approx 0.92$
* **Medium-term Event (24 months old):** $w = 0.50$
* **Old Event (2019 / 84 months old):** $w \approx 0.088$ (Suppressed unless corroborated by recent recurrences).

### 4.3 Chronic Recurrence Multiplier
If an intersection logs complaints across multiple distinct monsoon seasons ($2019, 2021, 2024$), it is classified as a **Chronic Structural Bottleneck**, multiplying the decay base to preserve persistent hazard awareness.

---

## 5. Multi-Criteria Route Optimization

Instead of unconstrained Reinforcement Learning (which is unstable and computationally heavy on static hourly road graphs), routes are solved via **Multi-Criteria Dynamic $A^*$ / Contraction Hierarchies**:

$$\text{EdgeCost}(e) = \text{Length}(e) \times \left(1 + \alpha \cdot \text{CompositeRisk}(e) + \beta \cdot \text{DepressionFactor}(e)\right)$$

This allows the engine to output Pareto-optimal route options (e.g., **Fastest** vs. **Safest / Flood-Avoidant**) in under 40 milliseconds with complete explainability.
