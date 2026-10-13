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
- **All Alerts Filter Bar (`NotificationPage.tsx`)**: Uses a single container (`overflow-x-hidden`) with `layoutId="alertsFilterActivePill"` and fixed font weights so switching between `All Alerts`, `Critical`, `High`, and `Medium` never shifts toolbar width or triggers horizontal scrollbars on mobile.
- **Map Rendering Engine Switcher (`MapPage.tsx`)**: Enlarged `2D Lite` and `3D GPU` pill buttons (`px-3 py-1.5 text-[11px]`) for effortless touch switching.
- **DOAB Assistant Mode Switcher (`AssistantPage.tsx`)**: Uses `layoutId="assistantModePill"` with enlarged touch targets (`px-3 py-1.5 sm:px-3.5 sm:py-2`).

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


