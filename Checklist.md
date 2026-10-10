# DOAB — SMART INDIA HACKATHON 2026 EXECUTION CHECKLIST
**Team Name:** ClusterGuilders  
**Project:** DOAB (Problem Statement SIH26043)  
**Target Event:** SIH Internal Round (05 Sept 2026 at NIET Greater Noida, 8:00 AM)  
**Governing Standard:** Production Rigor, Anti-AI Aesthetics, Complete Defense Readiness  

---

## 1. Codebase & Infrastructure Readiness Checklist

- [x] **Monorepo Directory Integrity:**
  - [x] `apps/client-pwa` (React 18 + Vite + Tailwind + IndexedDB + Leaflet) verified and building without errors (`0` errors in 20.5s).
  - [x] `apps/core-api` (Node.js + Express + Mongoose + Typesense) routing cleanly.
  - [x] `apps/university-service` (Java 21 + Spring Boot 3 + Maven) compiling via `mvn clean compile`.
  - [x] `apps/ai-service` (Python 3.11 + FastAPI) running with BART/Sentence-BERT endpoints active.
- [x] **Docker Local Dev Mesh:**
  - [x] `docker compose up -d` spins up all 6 containers (`mongo`, `redis`, `typesense`, `core-api`, `university-service`, `ai-service`) with green health checks.
- [x] **Contracts & Single Source of Truth:**
  - [x] `contracts/problem-dna.schema.json` matches Mongoose models and FastAPI Pydantic schemas.
  - [x] `contracts/university-service.openapi.yaml` endpoints match Spring Boot `@RestController` annotations.
- [x] **Demo Seed Data Loaded:**
  - [x] `node scripts/seed-demo-data.js` runs cleanly and populates 15 realistic Jharkhand scenarios (Dumka water, Ranchi crop, Dhanbad mining).

---

## 2. Frontend & UI/UX Compliance Checklist (Anti-AI Rules)

- [x] **Zero Emojis Enforced:** Verified that zero emojis exist in navigation headers, buttons, cards, modal titles, or notifications.
- [x] **Editorial Monochrome Styling:**
  - [x] Light Theme (#FBFBFB canvas, crisp 1.5px solid borders, #0A0A0A text) enabled as default.
  - [x] Dark Theme toggle operational with Neo-Brutalist Frosted Glass styling (`backdrop-blur-xl`, subtle white borders).
- [x] **Preferences Modal with Portfolio Rules:**
  - [x] Unboxed bare gear icon beside heading with smooth cubic-bezier rotation.
  - [x] Single active accordion dropdown rule (expanding one collapses others).
  - [x] Parent master switch disable rule (`parent-disabled` styling).
  - [x] Interactive Platform Language & Dialect matching cards (English, Hindi, Santali).
  - [x] Unique active/inactive SVGs for every sensory sub-setting with zero green colors.
- [x] **Curvy Arrow Kinetic Physics:**
  - [x] Way 1: Vector stroke draw-in animation on viewport entrance.
  - [x] Way 2: Continuous flowing dotted dash-march when Search Bar is active.
- [x] **AI Copilot & Continuous Gaze Physics:**
  - [x] `<AIOrbFace />` calculates cursor coordinates and continuously tracks gaze across the entire dashboard.
  - [x] Chat window is draggable anywhere on the screen by its header bar.
  - [x] Full-screen report expand mode (`Maximize2` / `Minimize2`).
  - [x] Slide-out previous chat sessions history drawer.
- [x] **Automatic Incognito Onboarding:**
  - [x] Auto-prompts first-visit and incognito sessions to select preferred dialect and sound settings.
- [x] **Offline Asset Fallbacks:**
  - [x] Local WebP avatars (`suneet.webp`, `devanshu.webp`, `prakhar.webp`, `manisha.webp`, `zainav.webp`) bundled in `public/avatars/`.
  - [x] All avatar images configured with `loading="lazy"` and `onError` local fallbacks.

---

## 3. Team Member Role Defense & Ownership Checklist

- [x] **Suneet Chugh (Team Leader & Lead Architect):**
  - [x] Full-Stack Architecture, Groq LLaMA-3.3 NLP pipeline, Typesense hybrid search, and PWA offline sync engine.
  - [x] [GitHub](https://github.com/suneetchugh-dev) • [LinkedIn](https://www.linkedin.com/in/suneetchugh-dev/)
- [x] **Devanshu Kaushik (Frontend & Geospatial Mapping Lead):**
  - [x] Leaflet.js district heatmaps, OpenStreetMap GIS telemetry, and responsive PWA navigation.
  - [x] [GitHub](https://github.com/ks-devanshu) • [LinkedIn](https://www.linkedin.com/in/devanshu-kaushik-90409a254/)
- [x] **Prakhar Chaturvedi (DevOps & Integration QA Lead):**
  - [x] Docker Compose multi-container mesh, cross-service API contracts, and CI automated verification.
  - [x] [GitHub](https://github.com/prakc7) • [LinkedIn](https://www.linkedin.com/in/prakc7/)
- [x] **Manisha (University Portal & Spring Boot Lead):**
  - [x] Spring Boot 3.3 microservices, Spring Security RBAC, and NEP 2020 Capstone credit tracking.
  - [x] [GitHub](https://github.com/Manisha-002) • [LinkedIn](https://www.linkedin.com/in/manisha-504069348/)
- [x] **Zainav (UI Component & Workflow Engineering Lead):**
  - [x] Obsidian neo-glass design system, intake form wizards, and multilingual dialect switching flows.
  - [x] [GitHub](https://github.com/zainav7428) • [LinkedIn](https://www.linkedin.com/in/zainav-mansuri-a0a69b325)

---

## 4. Live Demo Resilience & Failover Contingency Checklist

- [x] **Offline Standalone Demo Mode:**
  - [x] Cached demo scenarios tested with airplane mode / internet disconnected to prove PWA offline resilience.
- [x] **Screen Recording & Video Backup:**
  - [x] High-definition 1080p screen recording of the full end-to-end demo flow saved locally.
- [x] **PPT Deck & Backup PDF:**
  - [x] Official SIH presentation deck saved in `.pptx` and `.pdf` formats.
- [x] **Live Reset Script:**
  - [x] Quick command `node scripts/seed-demo-data.js` verified to reset all demo tickets in under 2 seconds.
