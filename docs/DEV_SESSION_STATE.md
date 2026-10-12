# Developer Session State & Next Agent Execution Directive

**Current Branch:** `frontend` (synced with `main` at `c86d41c`)  
**Last Updated:** October 12, 2026  
**Primary Next Plan Document:** [`docs/FUTURE_NATIONAL_GRID_IMD_PLAN.md`](./FUTURE_NATIONAL_GRID_IMD_PLAN.md)

---

## 🚨 MANDATORY DIRECTIVE FOR NEXT AGENT SESSION

The user has explicitly mandated that the **NEXT plan for any future agent session** MUST directly execute and build according to:
👉 **[`docs/FUTURE_NATIONAL_GRID_IMD_PLAN.md`](./FUTURE_NATIONAL_GRID_IMD_PLAN.md)**

Do NOT invent alternative architectures or revert to unverified scrapers. Follow the exact technical roadmap specified in `docs/FUTURE_NATIONAL_GRID_IMD_PLAN.md`.

---

## Current Status (Hackathon Demo & Live Web App)

- **Live Production App:** Deployed on `main` (`c86d41c`).
- **Data Parity:** ~450–600 stratified nationwide incident pins across 20+ states and 40 macro cluster halos are live on both localhost and production (`doab.sahnirmaan.live`).
- **Routing Engine:** Offline SRTM digital elevation solver fallback active in `BestRoutesPage.tsx` providing ranked corridors (8.2%, 16.5%, 44.8% risk).
- **Video Readiness:** User is currently recording the hackathon demo video.

---

## Next Implementation Phases (From `FUTURE_NATIONAL_GRID_IMD_PLAN.md`)

### Phase 1: Real-Time IMD Client Service (`services/prediction-api/app/imd.py`)
- [ ] Implement `IMDStationClient` using the verified lightweight REST endpoints:
  - Station Catalog: `GET https://city.imd.gov.in/citywx/responsive/api/search.php?query=` (1,405 stations).
  - Station Weather: `POST https://city.imd.gov.in/citywx/responsive/api/fetchCity_static.php` with `{ "ID": station_id }`.
- [ ] Build a spatial KD-Tree index (`scipy.spatial.cKDTree`) over the 1,405 station coordinates for sub-millisecond nearest-station resolution.
- [ ] Add 15-minute in-memory / Redis TTL caching to prevent redundant requests.

### Phase 2: Hierarchical Spatial Grid (Uber H3)
- [ ] Implement Uber H3 hexagonal spatial indexing (`h3-py` / `h3-js`) replacing rigid square grids:
  - Resolution 6 (~36 km²) for national macro overview.
  - Resolution 8 (~0.73 km²) for city ward telemetry.
  - Resolution 10 (~15,000 m²) for micro travel corridors.
- [ ] Hierarchical LOD: Aggregate child hexagons to parent hexagons using risk mean/max.

### Phase 3: Temporal Half-Life Decay on Historical Complaints
- [ ] Update `HotspotIndex` in `services/prediction-api/app/features.py`:
  - Replace flat `query_radius` count with exponential 24-month half-life decay ($w = 2^{-\Delta t / 24\text{mo}}$) to account for municipal civil works remediation.
  - Implement the Chronic Recurrence Multiplier for persistent multi-monsoon bottlenecks.

### Phase 4: Model Training Run
- [ ] Run `python -m app.cli build-dataset` to cache historical precipitation.
- [ ] Run `python -m app.cli train` to export calibrated `models/waterlogging_1h.joblib`.

### Phase 5: Multi-Criteria Route Optimization
- [ ] Route edge cost formulation:
  $$\text{Cost}(e) = \text{Length}(e) \times \left(1 + 0.5 \cdot P_{\text{ML}}(e) + 0.3 \cdot \text{Rain}_{\text{live}}(e) + 0.2 \cdot \text{IMD}_{\text{Alert}}(e)\right)$$
- [ ] Provide Pareto route ranking (Fastest vs. Flood-Avoidant Safest) in under 50 ms.
