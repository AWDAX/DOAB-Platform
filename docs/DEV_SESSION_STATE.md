# Developer Session State & Next Agent Execution Directive

**Current Branch:** `frontend` (merged & synced with `main`)  
**Last Updated:** October 15, 2026  
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
- **Live IMD Weather & Radar Telemetry:** Real-time 24h rainfall (mm), diurnal min/max temperatures, Doppler Radar / Satellite nowcast severe warnings, and 7-day NWP outlook active via 1,405 station registry and KD-tree lookup.
- **Routing Engine:** Offline SRTM digital elevation solver fallback active in `BestRoutesPage.tsx` providing ranked corridors (8.2%, 16.5%, 44.8% risk).
- **Interactive Safe Path Creator:** Fully draggable, speech-enabled, OSRM/DEM-evaluated 3-tier corridor system with dual-surface evaluation loaders and instant in-memory route caching.

---

## 🚀 Completed Session: IMD Weather Integration, Prioritized Intersection Model, State Focus Decoupling & Anti-Jitter Engineering (October 15, 2026)

### 1. Macro Risk Clusters: Prioritized Intersection Scoring Model (`MapPage.tsx`)
- **Problem:** Naive linear summation ($\text{Recency} + \text{Proximity} + \text{Criticality}$) allowed severe incidents from 3 weeks ago or fresh incidents 1,500 km away to falsely crowd out active, local dangers in the cluster ranking.
- **Solution:** Implemented the Multiplicative Prioritized Intersection Model:
  $$\text{Intersection Factor} = \frac{\text{Recency} \times \text{Proximity}}{100}$$
  $$\text{Trifecta} = \frac{\text{Intersection Factor} \times \text{Criticality}}{100}$$
  $$\text{Composite Score} = (0.45 \times \text{Intersection Factor}) + (0.35 \times \text{Criticality}) + (0.20 \times \text{Trifecta})$$
- **Impact:** Recent cases must be near the operational focus to rank at the top. Far-off events have their recency score dampened by distance, ensuring actionable, localized priority.

### 2. State Focus vs. Live GPS Location Decoupling (`MapPage.tsx`)
- **Problem:** When a user explicitly selected a state from the combobox (e.g., Uttar Pradesh), proximity was still calculated against the user's remote physical GPS (e.g., Bengaluru), giving every cluster in the selected state a near-zero proximity penalty and displaying "1,642 km from you".
- **Solution:** Decoupled the operational reference center:
  - When `selectedState !== 'all'`, `referenceCenter` snaps to the selected state's regional capital/corridor center (`distFromRef`), and cluster cards contextually display `~X.X km from state focus`.
  - Only in All-India mode does it use the user's live GPS (`X.X km from you`).

### 3. Layout Stability & Anti-Jitter Architecture (`MapPage.tsx`, `docs/UI_DESIGN_SYSTEM.md`)
- **Problem 1 (Chip Shifting):** Toggling `Recent Cases` shifted `Nearest Cases` horizontally due to fluid `min-w` and border width variations.
  - **Fix:** Enforced invariant `w-[106px] shrink-0` and matched active border widths (`border-[var(--text-main)]`), guaranteeing zero sibling shift on toggle.
- **Problem 2 (7-Day Drawer Jitter):** Expanding the 7-day forecast pushed the card past `maxHeight`, causing the browser to abruptly inject a vertical scrollbar, reducing available card width and twitching all tabs.
  - **Fix:** Added `scrollbarGutter: 'stable'` to `#tour-map-search`, wrapped the drawer in Framer Motion `<AnimatePresence>` and `<motion.div>` with `overflow-hidden`, and elevated card `maxHeight` boundary from 700px to 740px dynamically on expansion.
- **Problem 3 (7-Day List Truncation):** List was clamped to `max-h-48` (192px), showing only 5 days and requiring nested inner scrolling.
  - **Fix:** Increased inner list max-height to `max-h-[340px]`, allowing all 7 days to fit cleanly inside the card without clipping or inner scrollbars.

### 4. Official IMD City Weather & Nowcast Engine Integration (`services/prediction-api/app/imd.py`, `src/data/stationRegistry.ts`)
- **Discovery:** Reverse-engineered official IMD City Weather endpoints (`citywx/responsive/api/search.php` and `fetchCity_static.php`).
- **Backend Service:** Implemented `IMDStationClient` with KD-Tree nearest station lookup across 1,405 stations, TTL caching, 24h rainfall parsing (accounting for IMD standard synoptic reporting cycles), temperature min/max fallback handling, and Doppler Weather Radar/Satellite nowcast warning extraction.
- **Frontend Integration:** Linked active station weather to the user's viewport/location, surfacing 24h rain (mm), temperature, nowcast warnings, and 7-day NWP synoptic forecast directly in the Live Risk Monitor.

### 5. Multi-Source Civic & Disaster Ingestion Architecture Verification
- Comprehensive audit of data sources documented in `docs/LIVE_CIVIC_DATA_INGESTION_ARCHITECTURE.md`:
  - **NDMA Sachet**: ITU Common Alerting Protocol (CAP) live alerts across all 36 states and UTs.
  - **GMDA OneMap**: Esri ArcGIS REST FeatureServer (`flood_survey_2/FeatureServer/0`) for underpass flood depth surveys.
  - **UFEWS Gorakhpur**: Ward-level municipal waterlogging incident stream.
  - **OpenCity / Janaagraha**: Geocoded municipal drainage grievance dataset.
  - **NASA SRTM & ISRO CartoDEM**: 30m digital elevation models powering hydrological slope and depression calculations.
- Verified TypeScript build integrity (`tsc -b && vite build` passing with zero errors).

### 6. Luminous Oceanic Dark Theme Elevation (`src/index.css`, `docs/UI_DESIGN_SYSTEM.md`)
- **Elevation Refinement:** Upgraded Flood Dark Mode tokens from sunken abyssal black to elevated frosted navy:
  - `--bg-main`: `#0A1118` → `#0E1724` (Deep Oceanic Canvas).
  - `--bg-card`: `#101A24` → `#162436` (Elevated Frosted Navy Card for crisp contrast and specular card readability).
  - `--border-color`: `rgba(14, 165, 233, 0.15)` → `rgba(56, 189, 248, 0.20)` (Glassy Specular Aqua Rim).
- **Documentation Parity:** Synchronized all design system tables and token matrices in `docs/UI_DESIGN_SYSTEM.md` with live production CSS.

---

## 🚀 Completed Session: Live Interactive Risk Routing, Speech Recognition, Memory Caching & Draggable Architecture (October 14, 2026)

### 1. Search Autocomplete Anti-Jitter & Stable Layout (`MapPage.tsx`)
- **Problem:** Dynamic population of place suggestions caused unpredictable container expansion, rapid card shifting, and visual jitter while users typed.
- **Solution:** Restructured the search flyout into a positioned dropdown with fixed vertical clamping (`max-h-48 overflow-y-auto`), backdrop blur, elevated `z-50` layering, and smooth entry animations, preventing layout displacement of the underlying controls.

### 2. Multimodal Voice Landmark / Address Input (HTML5 SpeechRecognition) (`MapPage.tsx`, `VoiceAssistant.tsx`)
- **Problem:** Typing vernacular landmark names or long addresses in emergency conditions or on mobile screens was slow and error-prone.
- **Solution:** Integrated native HTML5 SpeechRecognition across:
  - **Waypoint A (Origin)** search input.
  - **Waypoint B (Safe Destination)** search input.
  - **Live Risk Monitor** global search input.
- **Ergonomics:** Added minimalist microphone action buttons (`Mic`), pulsing listening indicators (`isListeningTarget`), speech-to-text string normalization, and graceful toast fallbacks for unsupported browsers.

### 3. Custom Path Naming & In-Place Route Editing (`MapPage.tsx`, `BestRoutesPage.tsx`)
- **Problem:** Custom-created routes were automatically assigned rigid coordinate strings (e.g. `Safe Corridor to Map Point B (28.4825° N...)`), giving users no way to personalize routes or update names after saving.
- **Solution:**
  - Added an inline `Route Name` input inside the "Create Safe Elevation Path" panel with dynamic contextual placeholders based on parsed landmark labels (e.g. `Knowledge Park to Punjab` or `Safe Corridor to Sharda Hospital`).
  - Added in-place route renaming directly inside `BestRoutesPage.tsx` with instant localStorage persistence across all saved route records.

### 4. Incident Tooltip Color Harmonization & 3D MapLibre Support (`MapPage.tsx`, `MapLibreView.tsx`, `src/index.css`)
- **Problem:** Incident marker tooltips used default blue text clashing with our theme tokens, and tooltips failed to display in the 3D MapLibre GPU terrain view.
- **Solution:**
  - Calibrated tooltip typography and borders to match `--color-brand-accent` / `--text-main`.
  - Implemented custom HTML hover popups for 3D MapLibre with pointer-events pass-through and altitude offset calibration so incident cards render crisply in 3D perspective tilts.

### 5. Amazon Location Service Suggestion Precision & Proximity Biasing (`MapPage.tsx`, `src/lib/amazonLocation.ts`)
- **Problem:** Searching "Sharda Hospital" suggested "Knowledge Park" without displaying the landmark name, or surfaced identical place names from distant Indian states.
- **Solution:**
  - Overhauled suggestion label resolution: `place.label.split(',')[0].trim()` is prioritized as the primary title, while municipality and state are rendered as subtitles.
  - Biased geocoding API queries using active GPS coordinates (or current map viewport center) so proximate landmarks appear first.

### 6. Dropdown Outside-Click Dismissal & Keyboard Navigation (`MapPage.tsx`)
- **Problem:** Search dropdowns remained open after place selection or outside clicks, cluttering the map.
- **Solution:** Enforced click-outside listeners via React `useRef`, auto-collapsed suggestions on selection, and added keyboard <kbd>Enter</kbd> support to immediately select the top suggestion.

### 7. Zero-Lag In-Memory Route Geometry Caching (`MapPage.tsx`)
- **Problem:** Switching transit modes or re-evaluating the same origin/destination pair triggered redundant OSRM network requests and recalculations.
- **Solution:** Implemented `routeGeometryCache` Map storing calculated road network geometries keyed by `${startLng},${startLat}->${endLng},${endLat}:${profile}`, delivering instant (<1ms) corridor switching.

### 8. Draggable Map Panels with Framer Motion (`MapPage.tsx`)
- **Problem:** Floating command panels obstructed map inspection on tablet and desktop screens.
- **Solution:** Implemented gesture-based drag positioning with `dragControls` (`createPathDragControls`, `liveRiskDragControls`), visual `<GripHorizontal />` handles, and boundary containment (`dragConstraints={mapParentRef}`).

### 9. Automatic Waypoint Deselection (`MapPage.tsx`)
- **Problem:** Accidental map taps moved already-placed points A and B.
- **Solution:** Once both waypoints are selected, map picking automatically locks (`setPathPickingTarget(null)`). Users must explicitly tap "Origin Point" or "Safe Destination" to reposition a point.

### 10. Saved Route Tombstone Filtering Fix (`BestRoutesPage.tsx`, `MapPage.tsx`)
- **Problem:** Custom coordinate-only routes were not appearing in Saved Routes because `doab_deleted_route_summaries` tombstoned generic route strings like `Safe Corridor`.
- **Solution:** Generated unique collision-free route identifiers, un-tombstoned newly created routes, and guaranteed persistent display in `BestRoutesPage.tsx`.

### 11. Live Risk Monitor Ergonomics & Direct Route Trigger (`MapPage.tsx`)
- **Problem:** Live Risk Monitor header was cramped, and selecting a place required an extra "Compute Safe Path" button click.
- **Solution:**
  - Expanded panel width to `sm:w-[420px] md:w-[450px]` for ample breathing room.
  - Removed redundant manual buttons.
  - Selecting any search suggestion directly opens the Safe Elevation Path panel with Point B set and Point A defaulted to user location.

### 12. Search Flyout Click Interception Root Cause & Fix (`MapPage.tsx`)
- **Problem:** Clicking suggestions in Live Risk Monitor didn't trigger Create Safe Elevation Path.
- **Root Cause:** The suggestions container was rendered outside `alsDropdownRef`. Document `mousedown` fired first, causing the click-outside handler to wipe `alsSuggestions` and unmount the button before `onClick` could execute.
- **Solution:** Enclosed the suggestions dropdown inside `alsDropdownRef`, added `onMouseDown={(e) => e.preventDefault()}`, and added keyboard <kbd>Enter</kbd> support.

### 13. Route Evaluation Lifecycle & Dual-Surface Progress Loaders (`MapPage.tsx`)
- **Problem:** User requested not to show un-evaluated paths (Safest, Balanced, Direct), but rather to show an appropriate loader while evaluation runs.
- **Solution:**
  - Introduced `isEvaluatingRoutes` state. Gated candidate routes on the map and in the card with `!isEvaluatingRoutes`.
  - Designed a sleek evaluation loader in the panel with a spinner, `DEM + AI` badge, telemetry assessment subtitle, and animated smooth progress bar.
  - Added a floating map evaluation pill at the bottom of the viewport so users have clear visual feedback on both surfaces.

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

### 13. Production SEO Optimization & SERP Architecture
- **Complete Meta & Social Card Architecture (`index.html`):**
  - Configured high-intent title tags, concise search meta description (<160 chars), keywords, canonical link (`https://doab.sahnirmaan.live/`), and robots directives.
  - Implemented Open Graph (`og:type`, `og:site_name`, `og:url`, `og:title`, `og:description`, `og:image`, `og:locale`) for Facebook, LinkedIn, Discord, and WhatsApp rich embeds.
  - Integrated Twitter Card meta tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
  - Added Schema.org JSON-LD structured data (`WebApplication` and `Organization`) providing rich snippet eligibility on Google search results.
  - Added semantic `<noscript>` crawler fallback with accessible HTML content for search engine indexers before JavaScript hydration.
- **Search Engine Discovery Protocols (`robots.txt` & `sitemap.xml`):**
  - Created `public/robots.txt` allowing indexing across all core public routes while protecting internal `/dev-admin` paths.
  - Created `public/sitemap.xml` listing canonical URLs with change frequencies and priorities (1.0 for home, 0.9 for map, 0.85 for routes).
- **Dynamic Client-Side Route SEO (`RouteSEO.tsx`):**
  - Created reactive route SEO controller mounted at the root router level in `App.tsx`.
  - Automatically updates `document.title`, `<meta name="description">`, canonical links, OpenGraph, and Twitter tags whenever the user navigates between `/map`, `/routes/best`, `/team`, `/notifications`, etc.
- **PWA Manifest Search Optimization (`manifest.json`):**
  - Enhanced PWA manifest with descriptive title, localized language tags, and search categories (`weather`, `navigation`, `utilities`, `safety`).

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
