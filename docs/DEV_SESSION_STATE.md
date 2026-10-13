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

### 4. Framer Motion Sliding Pill Toolbars, Collapsible Panels & Sidebar Hotkeys
- **Desktop Sidebar (`GlobalSidebar.tsx`, `KeyboardShortcutsModal.tsx`):** Added a vertical sliding active background pill (`layoutId="desktopSidebarVerticalPill"`) for desktop views (`hidden md:flex`) and added `Ctrl + [` (collapse sidebar) and `Ctrl + ]` (expand sidebar) keyboard shortcuts.
- **Live Risk Monitor Tabs (`MapPage.tsx`):** Segmented switcher between `Search`, `Forecast`, `Clusters`, and `Hazard` now features a Framer Motion shared-layout sliding background pill (`layoutId="liveRiskActiveTabPill"` with critically-damped spring `stiffness: 420, damping: 34`). Labels are truncated and elevated to `relative z-10` for zero layout shift.
- **Live Risk Inspector Collapsible Transition (`MapPage.tsx`):** Wrapped the expandable telemetry panel `{!isMobileCollapsed && ...}` in `<AnimatePresence initial={false}>` + `<motion.div>` with a smooth, subtle height and opacity transition (`duration: 0.22, ease: [0.16, 1, 0.3, 1]`), eliminating harsh abrupt cutoffs.
- **Flying Outside Pill Root Cause Diagnosis & Prevention (`docs/UI_DESIGN_SYSTEM.md`):** Diagnosed and documented why shared-layout pills can fly in from top-left `(0, 0)` or cross-viewports (unscoped `layoutId` collision across routes/components, unmounted rect caching during layout stabilization, or unconstrained parent containers). Enforced unique domain-prefixed layout IDs (`liveRiskActiveTabPill`, `desktopSidebarVerticalPill`, `alertsSeveritySlidingPill`, `landingModePill`) with strict z-indexing (`absolute inset-0 -z-10 pointer-events-none`).
- **All Alerts Filter Toolbar (`NotificationPage.tsx`):** Zero-shift sliding background pill (`layoutId="alertsSeveritySlidingPill"`) that stays contained within mobile screens without horizontal scrollbars.
- **Map & Assistant Switchers (`MapPage.tsx`, `AssistantPage.tsx`):** Enlarged touch targets and added smooth sliding background pills for `2D Lite / 3D GPU` and Assistant modes.

### 5. Map Camera Session Persistence & Cluster Selection Dimming (`MapPage.tsx`, `MapLibreView.tsx`)
- **One-Time Initial GPS Zoom-In:** Added `mapSessionState` persistence and skipped redundant mount-time `flyTo` calls in both 2D Lite and 3D GPU engines. The automatic zoom-in animation to the user's location now runs **only the very first time** GPS is detected in a session, or when the user explicitly toggles out from their location and toggles back in via the Location crosshair button.
- **Overlapping Cluster Dimming:** Selecting a macro risk cluster subtly dims unselected clusters (`fillOpacity: 0.045`, `lineOpacity: 0.45`) in both 2D and 3D views.

### 6. Mobile & Native Android Touch Refinements
- **Logged-In Mobile Navbar (`Navbar.tsx`):** Symmetrical 3-zone header (Bell + Theme Toggle on left, standalone centered `DOAB` logo, Hamburger icon on right), uniform `w-9 h-9` sizing, `strokeWidth={2}`,unified monochromatic hover state (`hover:bg-[var(--text-main)]/5 hover:text-[var(--text-main)]`), and viewport-clamped Recent Alerts drawer.
- **Map Page Mobile (`MapPage.tsx`):** Concise `Live Risk` label on mobile (`top-1.5` on mobile, `sm:top-4` on desktop) and shifted right-side floating map controls down (`top-[4.5rem]`) below the `Live Risk` bar.
- **Assistant Page Mobile (`AssistantPage.tsx`):** Hidden the header title/subtitle (`DOAB Operational Assistant / Dual-Climate Telemetry & Verified Emergency Routing`), left AI Orb, and Fullscreen/Expand button on mobile and touch-screen views.
- **Routes, Profile & Team Pages (`BestRoutesPage.tsx`, `ProfilePage.tsx`, `TeamPage.tsx`):** Prevented button/subtitle wrapping (`whitespace-nowrap`), aligned Safe Computed Path action buttons, removed all mock disclaimers in favor of actionable retry fallbacks, and updated Team Page telemetry metrics to nationwide coverage (`20+ States`).

### 7. Map Page: AWS Location Autocomplete Fix, LocateFixed GPS Button & X Clear Waypoints (`MapPage.tsx`)
- **AWS Location Autocomplete Fix:** Removed the incident pool iteration from `localCivicPlacesIndex` that was surfacing 600+ civic complaint titles (e.g. "Leaking pipeline", "Overflow (Uttar Pradesh)") in the origin/destination search autocomplete. The index now contains only 21 `ALL_REGIONS` geographic entries. `fetchHybridPlaceSuggestions` tries the raw query via AWS Location first, appends `, India` only on zero results.
- **LocateFixed Embedded GPS Button:** Removed old text-button "Use Current Location" above the origin input and replaced with a small `LocateFixed` icon button embedded directly inside the Waypoint A chip, with a `Tooltip` (no text label). Waypoint A card converted from `<button>` to `<div>` since it now contains interactive children.
- **X Clear Buttons on Waypoint A & B:** Added conditional X clear buttons inside both the Origin (Waypoint A) and Destination (Waypoint B) cards. Each appears only when the respective waypoint is set, uses `e.stopPropagation()`, and clears the coords + address + suggestions. Style: transparent at rest, premium red gradient glow on hover. Waypoint B card also converted from `<button>` to `<div>` for the same reason.
- **Removed Error Fallback Banner (`NotificationPage.tsx`):** Deleted the `{status === 'error' && ...}` block showing "Live forecast service temporarily unreachable / Retry Sync".

### 8. Premium Danger Button Gradient System (`src/index.css`, multiple pages)
- **CSS Variables Added:** Added `--danger-btn-gradient` and `--danger-btn-hover-gradient` to all 4 theme blocks (`:root`, `.dark`, `.theme-drought`, `.dark.theme-drought`) in `src/index.css` — Deep Maroon → Rose Crimson (`#4C0519 → #881337 → #BE123C`) for flood themes; Deep Carmine → Burnt Clay (`#450A0A → #7F1D1D → #991B1B`) for drought themes, matching the terracotta palette.
- **Applied to all destructive buttons:**
  - `ConfirmationModal.tsx` — `isDanger` confirm button (was `bg-rose-600`)
  - `BestRoutesPage.tsx` — table row delete button + mobile card delete button (were ghost rose hover icons)
  - `AssistantPage.tsx` — "Clear All" sessions button + session-item delete icon
  - All buttons now: solid gradient at rest, lighter gradient + `hover:shadow-[0_4px_14px_rgba(190,18,60,0.45)]` crimson glow on hover.

### 9. Role-Adaptive Delivery Partner Experience & Commercial Fleet Shield Matrix
- **Unified Route Architecture:** Eliminated code-bloating redundant routes (`/delivery/routes`) in favor of dynamic role-adaptive interfaces driven by `doab_user_role === 'delivery'`.
- **Commercial Fleet Header Badges:** Added clean `Fleet • {vendorId}` badges to `BestRoutesPage.tsx`, `MapPage.tsx` (Live Risk Monitor dock), and `AssistantPage.tsx` adhering to theme tokens (`border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs`).
- **Rider SLA & Parcel Inundation Shield Matrix (`BestRoutesPage.tsx`):**
  - Displays turn-by-turn dispatch calculations (+3 min detour vs gridlock, <8.2cm powertrain & exhaust ceiling, 0% parcel damage guarantee).
  - Theme-harmonized using `neo-glass-card`, `--color-brand-accent`, and `--text-main` tokens for complete contrast compatibility across Flood & Drought themes.
- **DOAB Assistant Dispatch Awareness (`useDOABChat.ts` & `AssistantPage.tsx`):**
  - Injected courier telemetry guidelines into LLM system prompts and local deterministic sensor fallbacks.
  - Replaced generic prompt chips with courier SLA and powertrain safety queries.

### 10. Developer & Admin Auth Security Hardening & Automated CD Integration
- **Zero-Hint Fallback Security (`src/lib/adminAuth.ts`):** Removed all hardcoded string literals and fallbacks (`|| 'admin'`, `|| 'admin@doab.gov.in'`) that leaked administrative defaults into compiled client bundles.
- **Constant Generic Error Output:** Consolidated error reporting to `"Invalid admin username or password."` to eliminate configuration sniffing and credential enumeration.
- **Automated GitHub Actions Deployment ([`.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml)):**
  - Added `VITE_ADMIN_USERNAME`, `VITE_ADMIN_PASSWORD`, and `VITE_ADMIN_EMAIL` to the production build step.
  - Injected all 3 admin credentials into GitHub Repository Secrets (`AWDAX/DOAB-Platform`) via the GitHub CLI without exposing secrets in logs.
  - Automatic push-to-main trigger compiles, syncs to S3 bucket (`doab-frontend-970909364340`), and invalidates CloudFront distribution (`E20R65BKZ9U404`).

### 11. Geospatial Wait-to-Bloom & Seamless Halo Transitions (Leaflet & MapLibre)
- **Eliminated Mid-Flight 32× Vector Scaling Artifact:**
  - Synchronous click actions previously mounted the real-world 180m–480m geographic SVG halo instantly while the map was still at low national overview zoom (Zoom 5/6).
  - During camera `flyTo` (1.8s), Leaflet multiplied the vector layer container by the zoom ratio ($2^{(11-6)} = 32\times$), causing an oversized distorted circle during the flight that abruptly snapped into place when the camera landed.
  - Implemented **Wait-to-Bloom**: The pin marker selection and pulse ring remain 100% instant for immediate user responsiveness. The vector risk halo `<Circle>`, cluster beacon rings, and spatial proximity polyline defer mounting until camera flight completes via `onFlightEnd` / `moveend`.
- **Smooth 400ms CSS Blooming (`index.css`):**
  - Added `@keyframes haloBloom` and `.focused-risk-halo-bloom` styling with `animation: haloBloom 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards` and `transition: opacity 0.4s ease-out`.
  - Upon camera arrival, the halo smoothly transitions from `opacity: 0` to its target fill opacity (`0.16`) without jarring leaps.
- **Dual-Engine Hardware Parity (`MapLibreView.tsx`):**
  - Added `isCameraFlying` state tracking with MapLibre's `moveend` listener and `fill-opacity-transition: { duration: 400 }` / `line-opacity-transition: { duration: 400 }` paint rules so 3D GPU mode exhibits identical visual polish.

### 12. Licensing Architecture & Anti-Theft Copyleft Protection (GNU GPLv3)
- **Adopted GNU General Public License v3.0 (`LICENSE`):**
  - Resolved discrepancy between `README.md` badge and missing root license file.
  - Formally established strong copyleft protection: anyone who uses, modifies, or forks DOAB must keep all derivative works 100% open source under the same GPLv3 terms, preventing closed-source commercial exploitation or proprietary copycats while maintaining open public benefit.
  - Updated `README.md` badge to `License: GPLv3`, synced `package.json` with `"license": "GPL-3.0-or-later"`, and attributed copyright to `Team Contrarians (AWDAX)`.

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
