# Developer Session State & Next Agent Execution Directive

**Current Branch:** `frontend` (merged & synced with `main`)  
**Last Updated:** October 13, 2026  
**Primary Next Plan Documents:** 
1. 🎯 **Immediate Present Plan:** [`docs/BACKEND_SERVING_AND_LAMBDA_ARCHITECTURE.md`](./BACKEND_SERVING_AND_LAMBDA_ARCHITECTURE.md) (RDS PostgreSQL Seeder, FastAPI Viewport Endpoint, AWS Lambda IMD Ingestion)
2. 🗺️ **National Grid & Weather Roadmap:** [`docs/FUTURE_NATIONAL_GRID_IMD_PLAN.md`](./FUTURE_NATIONAL_GRID_IMD_PLAN.md) (Uber H3, 1,405 IMD Stations, Temporal Decay Half-Life)

---

## 🚨 MANDATORY DIRECTIVE FOR NEXT AGENT SESSION

The user has explicitly mandated that the **NEXT plan for any future agent session** MUST directly execute and build according to:
👉 **[`docs/BACKEND_SERVING_AND_LAMBDA_ARCHITECTURE.md`](./BACKEND_SERVING_AND_LAMBDA_ARCHITECTURE.md)** (Immediate Present Execution)
👉 **[`docs/FUTURE_NATIONAL_GRID_IMD_PLAN.md`](./FUTURE_NATIONAL_GRID_IMD_PLAN.md)** (National Grid & Model Roadmap)

Do NOT invent alternative architectures or revert to unverified scrapers. Follow the exact technical roadmaps specified in these two files.

---

## Current Status (Hackathon Demo, Live Web App & Native Android APK)

- **Live Production App & Native APK:** Built, verified, and synced across all 4 `DOAB-APP.apk` deliverable locations.
- **Data Parity:** ~450–600 stratified nationwide incident pins across 20+ states and 40 macro cluster halos are live on both localhost and production (`doab.sahnirmaan.live`).
- **Routing Engine:** Offline SRTM digital elevation solver fallback active in `BestRoutesPage.tsx` providing ranked corridors (8.2%, 16.5%, 44.8% risk).

---

## ✅ Completed Session Summary (UI/UX, Google OAuth, Map Persistence & Mobile Ergonomics)

### 1. Google OAuth & Account Switcher Restoration (`AuthPage.tsx`, `firebase.ts`)
- **Web (Desktop & Mobile Browser):** Restored standard Firebase Web Google OAuth (`signInWithPopup` with `prompt: 'select_account'`) for both **"Sign in with Google"** and **"Sign in with Another Google Account"**, preserving the clean desktop layout without any custom form disruption.
- **Native Android APK (`Capacitor.isNativePlatform()`):** Uses `@codetrix-studio/capacitor-google-auth` (`GoogleAuth.signOut()` followed by `GoogleAuth.signIn()`) bridged into Firebase via `GoogleAuthProvider.credential(idToken)` so the native Android OS account picker opens reliably.

### 2. Centralized Dual-Theme Light-Mode Primary Gradients (`src/index.css`)
- Unified primary buttons (`Create Safe Path`, `Open in Google Maps`, primary CTAs) and active sliding background pills (`2D Lite / 3D GPU`, `All Alerts` filter bar, `Desktop Sidebar` vertical pill, `DOAB Assistant` mode switcher) under `--primary-btn-gradient` / `--auth-btn-gradient` in Light Mode only:
  - **Flood Mode (Light Theme):** `linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)` (Deep Ocean Slate/Navy 3-stop vertical specular gradient).
  - **Drought Mode (Light Theme, `.theme-drought`):** `linear-gradient(180deg, #271206 0%, #451a03 50%, #78350f 100%)` (Deep Espresso to Rich Earth 3-stop vertical specular gradient matching the warm Amber/Dusty Porcelain canvas).

### 3. Professional Civic Iconography & Executive Severity Palette
- Replaced all toyish `Shield` / `ShieldCheck` / `ShieldAlert` SVGs across `BestRoutesPage.tsx`, `NotificationPage.tsx`, `Navbar.tsx` (Recent Alerts drawer), `LandingPage.tsx`, `ProfilePage.tsx`, `PermissionsModal.tsx`, and `EmergencyDangerBroadcast.tsx` with precision civic engineering icons (`CheckCircle2`, `AlertTriangle`, `Radio`, `Activity`, `Radar`, `Navigation2`, `Compass`).
- Standardized severity colors to the calibrated executive palette: Deep Garnet Rose (`#BE123C`) for Critical, Warm Copper Amber (`#B45309`) for High, Muted Steel Slate (`#475569`) for Medium, and Deep Forest Teal (`#0F766E`) for Low/Safe.

### 4. Framer Motion Sliding Pill Toolbars & Sidebar Hotkeys
- **Desktop Sidebar (`GlobalSidebar.tsx`, `KeyboardShortcutsModal.tsx`):** Added a vertical sliding active background pill (`layoutId="desktopSidebarVerticalPill"`) for desktop views (`hidden md:flex`) and added `Ctrl + [` (collapse sidebar) and `Ctrl + ]` (expand sidebar) keyboard shortcuts.
- **All Alerts Filter Toolbar (`NotificationPage.tsx`):** Replaced border/layout shifts with a zero-shift sliding background pill (`layoutId="alertsFilterActivePill"`) that stays contained within mobile screens without horizontal scrollbars.
- **Map & Assistant Switchers (`MapPage.tsx`, `AssistantPage.tsx`):** Enlarged touch targets and added smooth sliding background pills for `2D Lite / 3D GPU` and Assistant modes.

### 5. Map Camera Session Persistence & Cluster Selection Dimming (`MapPage.tsx`, `MapLibreView.tsx`)
- **One-Time Initial GPS Zoom-In:** Added `mapSessionState` persistence and skipped redundant mount-time `flyTo` calls in both 2D Lite and 3D GPU engines. The automatic zoom-in animation to the user's location now runs **only the very first time** GPS is detected in a session, or when the user explicitly toggles out from their location and toggles back in via the Location crosshair button.
- **Overlapping Cluster Dimming:** Selecting a macro risk cluster subtly dims unselected clusters (`fillOpacity: 0.045`, `lineOpacity: 0.45`) in both 2D and 3D views.

### 6. Mobile & Native Android Touch Refinements
- **Logged-In Mobile Navbar (`Navbar.tsx`):** Symmetrical 3-zone header (Bell + Theme Toggle on left, standalone centered `DOAB` logo, Hamburger icon on right), uniform `w-9 h-9` sizing, `strokeWidth={2}`,unified monochromatic hover state (`hover:bg-[var(--text-main)]/5 hover:text-[var(--text-main)]`), and viewport-clamped Recent Alerts drawer.
- **Map Page Mobile (`MapPage.tsx`):** Concise `Live Risk` label on mobile (`top-1.5` on mobile, `sm:top-4` on desktop) and shifted right-side floating map controls down (`top-[4.5rem]`) below the `Live Risk` bar.
- **Assistant Page Mobile (`AssistantPage.tsx`):** Hidden the header title/subtitle (`DOAB Operational Assistant / Dual-Climate Telemetry & Verified Emergency Routing`), left AI Orb, and Fullscreen/Expand button on mobile and touch-screen views.
- **Routes, Profile & Team Pages (`BestRoutesPage.tsx`, `ProfilePage.tsx`, `TeamPage.tsx`):** Prevented button/subtitle wrapping (`whitespace-nowrap`), aligned Safe Computed Path action buttons, removed all mock disclaimers in favor of actionable retry fallbacks, and updated Team Page telemetry metrics to nationwide coverage (`20+ States`).

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
