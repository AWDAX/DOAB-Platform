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

## 🌓 3. Color Palette & Surface Tokens

| Surface Level | Flood Mode (Light / Dark) | Drought Mode (Light / Dark) |
| :--- | :--- | :--- |
| **Canvas Background** | `#F4F6F8` / `#0A1118` | `#FAFAF9` / `#1C1612` |
| **Platform Cards** | `#FFFFFF` / `rgba(16, 26, 36, 0.6)` | `#FFFFFF` / `rgba(38, 30, 24, 0.6)` |
| **Glassmorphic Blur** | `backdrop-blur-xl` + Sea tint | `backdrop-blur-xl` + Amber tint |
| **Active Accent** | `#0284C7` (Cerulean) | `#D97706` (Bronze Amber) |

---

## 🧩 4. Component Standards

### 4.1 Sleek Sidebars & Navigations
- Sidebars are collapsible (`w-48` expanded, `w-12` collapsed) with smooth, fast transitions.
- Clean icon alignments (Lucide React) and compact padding (`px-2.5 py-1.5`).

### 4.2 Maps & Overlays
- Maps bleed to the edges of the dashboard container.
- Controls (Search, Routing, Alerts) are **floating neo-glass overlays** with subtle backdrops.

### 4.3 Form Inputs & Focus
- Inputs use zero browser focus rings (`focus:outline-none focus:ring-1 focus:ring-[var(--text-main)]`), relying on subtle ambient border shifts.

### 4.4 Copilot Window
- Draggable and resizable with compact dimensions (~340px width), clean header bar (`h-10`), and micro-typography.
