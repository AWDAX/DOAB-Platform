# 🎨 DOAB UI/UX Design System & Architectural Guide

This document is the **single source of truth** for all design rules, color tokens, kinetic physics, interaction behaviors, and component architectures across the **DOAB** platform (Environmental Hacks, Track 02).

---

## 🚫 0. TOP-PRIORITY INVIOLABLE RULES (MANDATORY FOR ALL AGENTS)

> [!CAUTION]
> **STRICT BAN ON EMOJIS, GEMINI SPARKLES, AND COLOURED STATUS ORBS/BALLS**
> - **NEVER USE EMOJIS ANYWHERE (SURFACES, CODE, TITLES, BUTTONS, LABELS, TOASTS, CARDS, TOOLTIPS, DOCUMENTATION).**
>   - No 🟢, 🔴, 🟡, 🔵, ⚠️, 🌧️, 🌊, 🤖, ✨, or any Unicode emoji character in user-facing UI or code.
> - **NEVER USE GEMINI/AI SPARKLES (`Sparkles` icon, starry gradients, rainbow sweeps, or fake AI hype flair).**
> - **NEVER USE COLOURED STATUS BALLS / PULSING DOTS.**
>   - Replace all status dots with crisp monospace badges (`[LIVE]`, `[STANDBY]`, `[ALERT]`, `[VERIFIED]`, `[OFFLINE]`).
> - **ALWAYS USE MINIMALIST SEMANTIC LUCIDE LINE ICONS OR MONOSPACE BADGES.**
> - **PHYSICS & TRANSITIONS MUST BE FAST AND TACTILE (100ms - 180ms).**
>   - Never write sluggish, floaty 400ms+ transitions for theme or mode toggles. Transitions must be snappy, crisp, and high-performance.
> - **STRICT BAN ON HACKATHON TRACK TAGS / PILLS / BANNERS**:
>   - **NEVER ADD HACKATHON TRACK PILLS OR TAGS ON UI SURFACES** (e.g. `Track 02: Heat & Water • Environmental Civic Grid`, `Track 02`, `Built for Environmental Hacks`).
>   - Keep hero sections, headers, and footers clean, uncluttered, and strictly product-focused. DOAB is a real-world civic life-safety and dispatch platform.
> - **STRICT DESIGN CONSISTENCY ACROSS ALL PAGES**:
>   - All platform cards must use `.neo-glass-card` with `rounded-2xl` and `border-[var(--border-color)]`.
>   - All inputs must use `rounded-xl`, `border-[var(--border-color)]`, and zero browser focus rings (`focus:outline-none focus:ring-1 focus:ring-[var(--text-main)]`).
>   - Typography must be clean sans-serif paired with high-density `font-mono` badges.
>   - All cards and content elements must maintain symmetrical, centered X-axis alignment (`mx-auto` containers, equal left/right padding).

---

## 🌊 1. DOAB Dual-State Environmental Theme Architecture

DOAB (Detect, Order, Alert, Back-check) features an environment-aware dynamic theme architecture:

### 1.1 The Flood Theme: "Sea Porcelain Blur"
- **Base Surfaces:** Sea Porcelain Blur (`#F4F6F8` light mode) and Deep Oceanic Depth (`#0A1118` dark mode).
- **Accents:** Crisp Aqua (`#38BDF8`), Deep Oceanic (`#0C4A6E` / `#0284C7`), and translucent frosted glass (`rgba(16, 26, 36, 0.6)`).
- **Textures:** Liquid ripples, crisp aquatic borders, and subtle glassmorphic blurs.

### 1.2 The Drought Theme: "Amber Golden Ground"
- **Base Surfaces:** Dusty Porcelain (`#FAFAF9` light mode) and Deep Ground (`#1C1612` dark mode).
- **Accents:** Premium Amber (`#F59E0B`), Golden Bronze (`#D97706`), and Sun-baked Terracotta (`#78350F`).
- **Textures:** Solid, matte finishes, sharp neo-glass cuts, and warm baked glows.

---

## 🏛️ 2. Design Philosophy: The High-End "Non-AI" Standard

Inspired by Linear, Apple, and Vercel:
- **Strict Tone Hierarchy**: Environmental palettes instead of arbitrary neon rainbow pop.
- **Architectural Typography**: Clean pairings of modern sans-serif headings with high-density monospace badges.
- **Modern Unboxed Layouts**: Avoid claustrophobic boxy containers. Use open, sleek modern spacing with subtle hairline separators.
- **High-Contrast Dark Mode Outlines**: Dark mode cards use visible, crisp borders (`border-[var(--border-color)]`) with specular highlights.

---

## 🌓 3. Color Palette, Surface Tokens & Centralized Primary Gradients

| Surface Level | Flood Mode (Light / Dark) | Drought Mode (Light / Dark) |
| :--- | :--- | :--- |
| **Canvas Background** | `#F4F6F8` / `#0A1118` | `#FAFAF9` / `#1F1915` |
| **Platform Cards** | `#FFFFFF` / `#101A24` | `#FFFFFF` / `#2C241E` |
| **Primary Text (`--text-main`)** | `#0C4A6E` / `#E0F2FE` | `#78350F` / `#FFF7ED` |
| **Glassmorphic Blur** | `backdrop-blur-xl` + Sea tint | `backdrop-blur-xl` + Amber tint |
| **Active Accent** | `#0284C7` (Cerulean) | `#D97706` (Bronze Amber) |

### 3.1 Centralized Light-Mode Primary Button & Sliding Pill Gradients (`src/index.css`)
All primary buttons (`Create Safe Path`, `Open in Google Maps`, primary CTAs) and active sliding background pills (`2D Lite / 3D GPU`, `All Alerts` filter tabs, `Desktop Sidebar` vertical pill, `Assistant` mode switcher) share a centralized CSS variable (`--primary-btn-gradient` / `--auth-btn-gradient`) in Light Mode:
- **Flood Mode (Light Theme)**:
  - `--primary-btn-gradient`: `linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)` (Deep Ocean Slate/Navy 3-stop vertical specular gradient)
  - `--primary-btn-hover-gradient`: `linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)`
- **Drought Mode (Light Theme, `.theme-drought`)**:
  - `--primary-btn-gradient`: `linear-gradient(180deg, #271206 0%, #451a03 50%, #78350f 100%)` (Deep Roasted Espresso to Rich Earth 3-stop vertical specular gradient matching the warm Amber/Dusty Porcelain canvas)
  - `--primary-btn-hover-gradient`: `linear-gradient(180deg, #451a03 0%, #78350f 50%, #92400e 100%)`
- **Dark Mode**: Preserves high-contrast monochrome/light-foam fills without overriding dark-mode surfaces.

### 3.2 Executive Severity Color Palette (Map Pins, Halos, & Alert Badges)
Never use neon or toyish primary colors for severity levels. Always use the calibrated executive palette:
- **Critical**: Deep Garnet Rose (`#BE123C` / `rose-700` light, `rose-300` dark)
- **High**: Warm Copper Amber (`#B45309` / `amber-700` light, `amber-300` dark)
- **Medium / Moderate**: Muted Steel Slate (`#475569` / `slate-700` light, `slate-300` dark)
- **Low / Safe**: Deep Forest Teal (`#0F766E` / `teal-700` light, `teal-300` dark)

### 3.3 Premium Danger Button Gradient System (`src/index.css`)
All destructive action buttons (`Delete route`, `Clear All sessions`, `Confirm danger action`) use a centralized CSS variable pair analogous to the existing navy primary gradient:
- **Flood Mode (Light + Dark Themes)**:
  - `--danger-btn-gradient`: `linear-gradient(180deg, #4C0519 0%, #881337 50%, #BE123C 100%)` (Deep Maroon → Rose Crimson 3-stop vertical specular gradient)
  - `--danger-btn-hover-gradient`: `linear-gradient(180deg, #881337 0%, #BE123C 50%, #E11D48 100%)`
- **Drought Mode (Light + Dark Themes)**:
  - `--danger-btn-gradient`: `linear-gradient(180deg, #450A0A 0%, #7F1D1D 50%, #991B1B 100%)` (Deep Charcoal Carmine → Burnt Clay 3-stop gradient matching the warm drought palette)
  - `--danger-btn-hover-gradient`: `linear-gradient(180deg, #7F1D1D 0%, #991B1B 50%, #B91C1C 100%)`

**Application pattern** (Tailwind v4 `bg-[image:var(...)]`):
```tsx
className="... text-white bg-[image:var(--danger-btn-gradient)]
  hover:bg-[image:var(--danger-btn-hover-gradient)]
  hover:shadow-[0_4px_14px_rgba(190,18,60,0.45)] transition-all shadow-xs"
```

**Scope of application** (all destructive action buttons across the platform):
- `ConfirmationModal.tsx` — `isDanger` confirm button
- `BestRoutesPage.tsx` — table row delete button + mobile card delete button
- `AssistantPage.tsx` — "Clear All" sessions button + session-item delete icon
- `MapPage.tsx` — Waypoint A / Waypoint B X clear buttons (hover only, transparent at rest)

---

## 🧩 4. Component Standards & Interactive Craft

### 4.1 Desktop Sidebar & Vertical Sliding Pill (`GlobalSidebar.tsx`)
- Desktop sidebar (`hidden md:flex`) is collapsible (`w-56` expanded, `w-14` collapsed) via button click or keyboard hotkeys:
  - **Collapse Sidebar**: `Ctrl + [`
  - **Expand Sidebar**: `Ctrl + ]`
- **Vertical Sliding Active Pill**: Uses Framer Motion (`layoutId="desktopSidebarVerticalPill"`, spring `stiffness: 420, damping: 34`) with `bg-[var(--text-main)]` so the active background pill glides smoothly between navigation items.
- **Profile Avatar Ring**: Enlarged profile avatar (`w-6.5 h-6.5` in sidebar, `w-6 h-6` in mobile bottom nav) with a subtle amber ring.

### 4.2 Unified Monochromatic Hover Feedback
- All navigation bar icon buttons (`Bell`, `ThemeToggle`, `Settings`, `Hamburger`, `Tour Guide`, and `Collapse Sidebar`) use a unified monochromatic hover treatment:
  - `hover:bg-[var(--text-main)]/5 hover:text-[var(--text-main)]`
- Never use colored neon drop-shadows on icon hover.
- All navbar icons share identical container geometry (`w-9 h-9 rounded-xl`) and `strokeWidth={2}` so no icon appears feeble or mismatched.

### 4.3 Professional Civic Iconography (No Toyish Shields)
- Do not use `Shield`, `ShieldCheck`, or `ShieldAlert` icons across routing, alerts, or telemetry surfaces.
- Use semantic precision icons: `CheckCircle2` (verified low-risk corridor), `AlertTriangle` (critical hazard), `Radio` (high-severity broadcast), `Activity` (moderate telemetry), `Radar`, `Navigation2`, and `Compass`.

### 4.4 Shared-Layout Sliding Pill Toolbars (Zero Layout Shift)
- **All Alerts Filter Bar (`NotificationPage.tsx`)**: Uses a single container (`overflow-x-hidden`) with `layoutId="alertsSeveritySlidingPill"` and fixed font weights so switching between `All Alerts`, `Critical`, `High`, and `Medium` never shifts toolbar width or triggers horizontal scrollbars on mobile.
- **Live Risk Monitor Tabs (`MapPage.tsx`)**: Segmented switcher between `Search`, `Forecast`, `Clusters`, and `Hazard` utilizes a Framer Motion shared-layout sliding pill (`layoutId="liveRiskActiveTabPill"` with `transition={{ type: 'spring', stiffness: 420, damping: 34 }}`). Content sits at `relative z-10` with truncated labels to guarantee zero layout shift.
- **Map Rendering Engine Switcher (`MapPage.tsx`)**: Enlarged `2D Lite` and `3D GPU` pill buttons (`px-3 py-1.5 text-[11px]`) for effortless touch switching.
- **Desktop Sidebar Navigation (`GlobalSidebar.tsx`)**: Vertical sliding pill with `layoutId="desktopSidebarVerticalPill"`.
- **Dual Climate Mode Selector (`LandingPage.tsx`)**: Shared pill toggle between `Monsoon (Flood)` and `Scarcity (Drought)` with `layoutId="landingModePill"`.

### 4.5 Framer Motion "Flying Outside Pill" Defect: Root Cause & Resolution
When implementing Framer Motion shared layout sliding backgrounds (`layoutId="myPill"`), buttons or tabs can occasionally exhibit a defect where the background pill appears to "fly in from outside" the screen (usually top-left `(0, 0)`) or jump jarringly across components.

#### Root Causes:
1. **Unscoped / Shared `layoutId` Collision Across Views**:
   If two distinct components or viewports (e.g. mobile vs. desktop navigation bars, or tab switchers across different routes) accidentally share the identical `layoutId` string without `<LayoutGroup id="...">` scoping, Framer Motion's global layout coordinator attempts to morph between the unmounted DOM rect of one component and the newly mounted rect of another.
2. **Conditional Unmounting Inside AnimatePresence Without Layout Isolation**:
   When a parent panel collapses or unmounts, Framer Motion caches the element's bounding client rect. If re-rendered before layout geometry stabilizes, it defaults the initial coordinate matrix to `(0, 0)` at the top-left of the viewport, causing an awkward fly-in flightpath.
3. **Missing `relative` Positioning or Unconstrained Parent Container**:
   If the container holding the pill lacks `relative` positioning, the `absolute inset-0` background pill computes its position relative to the nearest positioned ancestor (often the entire page viewport or body).

#### Standard Architecture & Prevention Checklist:
1. **Always Unique & Scoped `layoutId` Strings**:
   Each sliding pill toolbar in DOAB must possess a distinct, domain-prefixed identifier:
   - Sidebar: `desktopSidebarVerticalPill`
   - Alerts Filter: `alertsSeveritySlidingPill`
   - Live Risk Inspector Tabs: `liveRiskActiveTabPill`
   - Landing Modes: `landingModePill`
2. **Strict Z-Index Layering**:
   The pill element must always carry `absolute inset-0 rounded-* bg-[var(--text-main)] -z-10 pointer-events-none`, and the button text/icons must be wrapped in `relative z-10` to guarantee text remains crisp and clickable without interfering with pointer events.
3. **Subtle Spring Physics**:
   Use a critically-damped spring configuration (`stiffness: 420, damping: 34`) to eliminate overshoot oscillations and keep motion subtle, immediate, and native-feeling.
4. **Collapsible Panel Transitions with `AnimatePresence`**:
   Collapsible panels (such as the `Live Risk Monitor` inspector in `MapPage.tsx`) must wrap conditional blocks with `<AnimatePresence initial={false}>` and `<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">` to ensure smooth expanding and collapsing without layout jarring or content clipping.

### 4.6 Waypoint Card Architecture: Interactive Children in Clickable Containers (`MapPage.tsx`)
When a clickable card/chip needs to contain interactive children (e.g. an X clear button or GPS locate button), the outer card **must be converted from `<button>` to `<div>`** since nesting `<button>` inside `<button>` is invalid HTML and causes undefined behavior:
- **Waypoint A (Origin) card**: Converted to `<div onClick={() => setPathPickingTarget('origin')}>`. Contains two nested interactive buttons: the `LocateFixed` GPS locate button and the conditional X clear button (visible only when `pathOrigin` is set).
- **Waypoint B (Destination) card**: Converted to `<div onClick={() => setPathPickingTarget('destination')}>`. Contains the conditional X clear button (visible only when `pathDest` is set).
- **`e.stopPropagation()` is mandatory** on all inner buttons to prevent the outer `<div>` `onClick` from firing when the user clicks the GPS/X buttons.
- **X clear button style**: Transparent at rest (`text-[var(--text-muted)]`), transitions to premium red gradient on hover (`hover:bg-[image:var(--danger-btn-gradient,...)]`) with a subtle glow shadow. Size `h-3 w-3` icon in `p-1` padding.

### 4.7 AWS Location Service Autocomplete: Preventing Incident Title Pollution (`MapPage.tsx`)
The `localCivicPlacesIndex` useMemo previously iterated over all `allIncidentsPool` items (600+ incident problem reports like "Leaking pipeline — Konena Agrahara") and inserted their `problem_summary` as searchable titles. This caused origin/destination autocomplete to surface civic complaint titles instead of real geocoded locations.

**Fix applied:**
- Removed the incident pool iteration entirely from `localCivicPlacesIndex`. The index now contains only the 21 `ALL_REGIONS` state/city geographic entries.
- The `fetchHybridPlaceSuggestions` function tries the raw query first via AWS Location Service (`doab-place-index`, `ap-southeast-2`), then appends `, India` and retries only if zero results are returned — never polluting with incident titles.
- **AWS Identity Pool**: `ap-southeast-2:ff8ccdf5-4e7a-45c8-861d-51221d0ea28d` (`VITE_AWS_COGNITO_IDENTITY_POOL_ID` in `.env`).

---

## 📐 5. Scrollbar Gutter Space Architecture & Page Isolation

### 5.1 The Layout Shift Problem
On dynamic full-height or centered pages (such as Login/Auth), modal reveals or small viewport changes cause vertical scrollbars to appear and disappear. In default browsers, this shifts the viewport width by ~15px-17px, causing jarring X-axis layout jumps and throwing centered cards off-balance.

### 5.2 The Standard Fix: Scoped `scrollbar-gutter: stable`
To eliminate layout shift **without** forcing gutter space onto edge-to-edge pages (like the Landing Page, Map, or Team Page), `scrollbar-gutter: stable` must be scoped strictly to the Auth route via lifecycle-bound classes.

```tsx
// In AuthPage.tsx (Mount & Cleanup lifecycle)
useEffect(() => {
  document.documentElement.classList.add('auth-page');
  return () => {
    document.documentElement.classList.remove('auth-page');
  };
}, []);
```

### 5.3 Color Harmony Rule for Gutter Tracks
The reserved scrollbar gutter track **must always match the background color of the page's fixed header and footer** (`var(--bg-card)`: `#FFFFFF` in Light Mode, `#101A24` in Dark Flood Mode, `#2C241E` in Dark Drought Mode).

---

## 🏎️ 6. Morphing Floating Navbar Architecture & Layout-Shift Prevention

1. **Stable Anchor Footprint**: Keep the primary logo and brand acronym (`DOAB`) permanently visible at a stable flex footprint on desktop.
2. **Zero Conditional Flex Dividers**: Avoid injecting or removing structural flex siblings in a `justify-between` header on scroll.
3. **Smooth Gap Interpolation**: Transition `gap` smoothly on `.portfolio-header nav`.

---

## 📱 7. Mobile & Touch-Screen Ergonomics (Android APK & Mobile Web)

1. **Symmetrical Mobile Logged-In Header (`Navbar.tsx`)**:
   - **Left**: Notification Bell + Theme Toggle (`w-9 h-9` each).
   - **Center**: Standalone `DOAB` emblem (`absolute left-1/2 -translate-x-1/2`, text hidden on mobile).
   - **Right**: Hamburger menu button (`w-9 h-9`).
2. **Viewport-Clamped Recent Alerts Panel (`Navbar.tsx`)**:
   - Uses `fixed top-[4.25rem] left-2.5 right-2.5 sm:absolute sm:w-80` so the notification popover never overflows the screen on mobile devices.
3. **Map Page Mobile Layout (`MapPage.tsx`)**:
   - Top search/engine bar sits at `top-1.5` on mobile (`sm:top-4` on desktop) and displays the concise title `Live Risk` on mobile (`Live Risk Monitor` on desktop) so the `2D Lite` / `3D GPU` switcher has ample horizontal space.
   - Right-side floating map controls sit at `top-[4.5rem]` on mobile (`sm:top-4` on desktop) cleanly below the `Live Risk` bar.
4. **Assistant Page Mobile Decluttering (`AssistantPage.tsx`)**:
   - The top title banner (`DOAB Operational Assistant / Dual-Climate Telemetry & Verified Emergency Routing`), left AI Orb, and Fullscreen/Expand button are hidden on mobile and touch-screen views (`hidden lg:flex pointer-coarse:hidden`) so the conversational canvas has maximum vertical space.
5. **Single-Line Action Buttons & Subtitles (`BestRoutesPage.tsx`, `ProfilePage.tsx`)**:
   - `Open in Google Maps` and the 4 Safe Computed Path header buttons (`Routes Guide`, `Create Safe Path`, `Share Route`, `Save Offline`) use `whitespace-nowrap` and uniform `h-9` heights.
   - Profile Page header subtitle uses `sm:whitespace-nowrap` so it never folds awkwardly onto two lines on desktop.

---

## 🗺️ 8. Map Camera Persistence & Cluster Focus Behavior (`MapPage.tsx` & `MapLibreView.tsx`)

1. **One-Time Initial GPS Zoom-In**:
   - `mapSessionState` persists `hasCompletedInitialLocationZoom`, `mapCenter`, `mapZoom`, `userCoords`, `hasRealLocation`, and `isViewingMyLocation` across route transitions.
   - The automatic zoom-in animation to the user's live GPS location runs **only the very first time** location is detected in a session, or when the user explicitly toggles out from their location and toggles back in via the Location crosshair button.
   - Switching to another page and returning to `Live Map` restores the exact map viewport immediately without re-running `flyTo`.
2. **Overlapping Cluster Selection Dimming**:
   - When a macro risk cluster is selected (`selectedClusterKey != null`), all unselected clusters subtly dim (`fillOpacity: 0.045`, `lineOpacity: 0.45`, `weight: 1.3`) in both 2D Lite (Leaflet) and 3D GPU (MapLibre GL) views so the active cluster stands out clearly.

---

## 🚚 9. Role-Adaptive Commercial Fleet Experience (`userRole === 'delivery'`)

### Problem
Delivery riders and commercial fleet partners face unique operational vulnerabilities during extreme weather that standard citizen interfaces do not address:
1. Fleet drivers risk water ingress damage to engine exhausts, EV batteries, and air filters at water levels as low as 8.2 cm.
2. Riders face strict platform SLAs (on-time delivery vs. detour penalties) and customer parcel damage liability if waterproof packaging is breached.
3. Building dedicated separate URL paths (e.g. `/delivery/map`, `/delivery/routes`) fragments navigation, duplicates bundle size, and creates maintenance overhead.

### Solution Architecture
Instead of maintaining brittle separate URL branches, DOAB implements industry-standard **Role-Adaptive Experiences** across unified civic URLs:
1. **Commercial Fleet Header Badges (`BestRoutesPage.tsx`, `MapPage.tsx`, `AssistantPage.tsx`)**:
   - Uses `border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs` pill geometry with `Truck` icon tinted in `text-[var(--color-brand-accent)]`.
   - Dynamically displays the courier partner identifier (e.g. `Fleet • SWIGGY-BLR-9021`).
2. **Rider SLA & Parcel Inundation Shield Matrix (`BestRoutesPage.tsx`)**:
   - Integrated directly into the computed elevation routes view when `doab_user_role === 'delivery'`.
   - **Delivery ETA Trade-Off**: Quantifies detour delay vs. waterlog gridlock (`+3 min detour vs gridlock`).
   - **Powertrain & Exhaust Safety**: Enforces the `<8.2cm` flood clearance ceiling to safeguard two-wheeler/EV exhaust systems, air intakes, and batteries from stall.
   - **Parcel Integrity**: Features verified high-ground ridge routing with `0% Parcel Damage Risk` and dry compartment status.
3. **DOAB Assistant Fleet Dispatch Awareness (`useDOABChat.ts` & `AssistantPage.tsx`)**:
   - Adapts system prompts to courier dispatch constraints.
   - Greets delivery riders with their active fleet vendor ID.
   - Replaces generic civic suggestion chips with courier-specific prompts (*Rider Powertrain Clearance (<8.2cm)*, *SLA vs Flood Detour Check*, *Underpass Submerged Alert*, *Order Waterproofing Risk*).

---

## 🎨 10. Design Token Harmonization & Profile Button Symmetry

### Problem
1. **Theme Clash**: Hardcoded color definitions in commercial fleet components produced harsh color collisions in Drought theme.
2. **Profile Page Button Height Asymmetry**: In `ProfilePage.tsx`, the `Profile Guide` button used different vertical height and padding from the `Sign Out` button (`h-9` vs `h-10` and mismatched border radii), resulting in a visually misaligned bottom action row.

### Solution Architecture
1. **Zero Hardcoded Accent Collisions**:
   - All role-specific banners, cards, and badges inherit strictly from core CSS variables (`--color-brand-accent`, `--text-main`, `--text-muted`, `--border-color`, and `--bg-card`).
   - **Flood Theme**: Badges and highlights tint softly with Sea Blue / Aqua without visual vibration.
   - **Drought Theme**: Elements gracefully transition to the Golden Bronze / Baked Terracotta palette.
2. **Profile Action Symmetry (`ProfilePage.tsx`)**:
   - Harmonized both `Profile Guide` and `Sign Out` buttons to uniform `h-10` heights, `rounded-xl` geometry, `text-xs font-mono font-bold` typography, and matching flexbox alignment.
3. **Glassmorphism Standard (`neo-glass-card`)**:
   - Cards maintain uniform backdrop-filter blur and subtle borders (`border-[var(--border-color)]`), preventing visual fragmentation between citizen and commercial views.

---

## 🔐 11. Developer & Admin Auth Security Architecture (`adminAuth.ts` & CI/CD)

### Problem
1. Default string literals in logical OR expressions (`import.meta.env.VITE_ADMIN_USERNAME || 'admin'`) leaked fallback credentials into compiled production client bundles, allowing trivial reverse engineering of admin privileges.
2. Descriptive error messages leaked account presence information.
3. Manual environment variable configuration during deployment created credential drift between local development and hosted web apps.

### Solution Architecture
1. **Zero-Hint Fallback Security**:
   - Stripped all hardcoded string literals and defaults (`|| 'admin'`, `|| 'admin@doab.gov.in'`).
   - Client bundle inspection cannot discover default usernames, emails, or backdoor credentials.
2. **Unified Error Responses**:
   - Authentication errors consistently return `"Invalid admin username or password."` without disclosing whether an account exists or whether admin access is configured.
3. **Automated Secret-Driven CD (`.github/workflows/deploy-frontend.yml`)**:
   - Admin credentials (`VITE_ADMIN_USERNAME`, `VITE_ADMIN_PASSWORD`, `VITE_ADMIN_EMAIL`) are managed exclusively through GitHub Repository Secrets.
   - Automatic push-to-main trigger injects secrets directly into Vite's production build step, syncing to S3 (`doab-frontend-970909364340`) and CloudFront (`E20R65BKZ9U404`).

---

## 🎯 12. Geospatial Wait-to-Bloom & Vector Flight Decoupling (`MapPage.tsx`, `MapLibreView.tsx`, `index.css`)

### Problem & Optical Jerk Root Cause
1. **The 32× Vector Distortion**: When a user clicked a reported incident pin from an overview perspective (e.g. Zoom 5 or 6), Leaflet immediately mounted the geographic `<Circle>` (with a real-world radius of 180m–480m) at the initial zoom level.
2. **Mid-Flight SVG Transformation**: During the 1.8-second camera flight (`map.flyTo`), Leaflet scaled the vector SVG layer container using CSS 3D matrix transforms:
   $$\text{Container Scale} = 2^{(11 - 6)} = 32\times \text{ magnification}$$
   This caused the risk halo circle to appear hugely magnified and distorted across the country while the camera was in flight.
3. **Arrival Snap**: Once the camera completed its landing at Zoom 11, Leaflet reset the CSS transform and repainted the SVG circle at the native Zoom 11 pixel radius, causing an abrupt visual "pop" or "jerk".

### Solution Architecture: Wait-to-Bloom
1. **Decoupled Selection Feedback**:
   - The **Pin Marker Icon** updates instantly with selection halo, border, and beacon pulse for zero-latency user feedback.
   - The **Geographic Halo `<Circle>` & Proximity Polyline** defer mounting until camera flight terminates via `onFlightEnd` / `moveend` (`!isMapFlying`).
2. **Smooth 400ms CSS Blooming Animation (`index.css`)**:
   - Added `@keyframes haloBloom` and `.focused-risk-halo-bloom`:
     ```css
     @keyframes haloBloom {
       0% {
         opacity: 0;
       }
       100% {
         opacity: 1;
       }
     }

     .focused-risk-halo-bloom {
       opacity: 0;
       animation: haloBloom 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
       transition: opacity 0.4s ease-out;
       transform-origin: center;
     }
     ```
   - On camera arrival, the halo smoothly blossoms from `opacity: 0` to its target fill opacity (`0.16`) over 400ms without visual snapping.
3. **Dual-Engine Hardware Parity (`MapLibreView.tsx`)**:
   - Implemented identically across both 2D Lite (`Leaflet`) and 3D GPU (`MapLibre GL`) rendering pipelines via `fill-opacity-transition: { duration: 400 }` and `line-opacity-transition: { duration: 400 }` paint rules.

---

## ⚡ 13. Layout Stability, Anti-Jitter Engineering & Monospace Drawer Architecture (`MapPage.tsx`)

### 13.1 Root Causes of Floating Card Jitter
1. **Dynamic Content Height Overflow**: When an expandable drawer (e.g. 7-Day NWP Forecast) is opened, sudden DOM insertion pushes the parent card past its `maxHeight`. The browser abruptly injects a vertical scrollbar, reducing available content width by 12–15px and causing all inner text, inputs, and tabs to twitch horizontally.
2. **Sibling Chip Shifting**: Using fluid or dynamic width constraints (e.g. `min-w-[94px]` vs `min-w-[96px]`) combined with conditional active borders creates subpixel layout shifts that displace adjacent action chips when toggled.

### 13.2 Anti-Jitter Architecture Rules
1. **Stable Scrollbar Gutter (`scrollbarGutter: 'stable'`)**:
   - Always apply `scrollbarGutter: 'stable'` to floating HUD card containers (`#tour-map-search`). This reserves scrollbar space and ensures zero horizontal layout snapping when drawers expand or contract.
2. **Fixed-Width Invariant Toggle Chips**:
   - Toggle buttons placed side-by-side must use identical, fixed width classes (e.g. `w-[106px] shrink-0`) with matched border widths (`border-[var(--text-main)]` active vs `border-[var(--border-color)]` inactive) to guarantee zero horizontal layout shift on toggle.
3. **Framer Motion Height Transitions (`AnimatePresence`)**:
   - Never inject expandable drawers with raw conditional rendering (`{isOpen && <div>...</div>}`).
   - Always wrap expandable sub-panels in `<AnimatePresence initial={false}>` and `<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">`.
4. **Dynamic Container Headroom Expansion**:
   - When an expandable drawer is triggered inside a height-constrained card, dynamically elevate the card's `maxHeight` boundary (e.g. from `700px` to `740px`) and expand inner list containers (e.g. `max-h-[340px]`) so all items fit cleanly without forcing inner scroll collisions.
5. **DOAB Monospace Operational Badges**:
   - Adhere strictly to the DOAB Monospace Standard: `[EXPAND 7D]`, `[COLLAPSE]`, `[CRIT]`, `[HIGH]`, `[ZONE]`, `[LIVE]`. Never use emojis or pulsing colored dots.



