# DOAB (दोआब) — Two Waters
**Detect → Order → Alert → Back-check**

DOAB is a civic prototype for urban waterlogging. The live piece is a one-hour model estimate for the Bengaluru area that has geolocated complaint labels. It is not a municipal sensor network, not an official warning, and it does not dispatch crews or move funds.

Developed by **Team Contrarians** for WeMakeDevs Hackathon.

---

## 🌊 Core Capabilities & The Loop

1. **Detect**: A model estimates waterlogging probability one hour ahead where labelled Bengaluru complaints, rainfall and elevation are available. Other places return "not enough data".
2. **Order**: Work orders are a concept on the page. Nothing is dispatched.
3. **Alert**: The map and alerts show the model estimate, labelled as an estimate.
4. **Back-check**: Photo verification is not wired to the model.

---

## ⚡ Key Highlights & Architecture

- **Dual-Engine Interactive Mapping**: Adaptive toggle between **2D Lite** (battery-efficient Leaflet raster pipeline) and **3D Vector GPU** (MapLibre GL hardware-accelerated 3D tilt/orbit engine). See [`GEOSPATIAL_ARCHITECTURE.md`](./GEOSPATIAL_ARCHITECTURE.md) for data sources and tile mechanics.
- **Precision Safe Routing**: Multi-modal navigation avoiding high-risk flood zones and waterlogged roads, with vehicle clearance thresholds and elevation biasing.
- **Zero-Jerk Route Transitions**: Hardware-accelerated CSS keyframe transitions and synchronous pre-paint scroll coordination (`scrollbar-gutter: stable`).
- **Unified Auth & Preferences**: Google Firebase Authentication, saved session hints, custom audio feedback toggles, and user-configurable routing parameters.
- **Responsive & Touch-First**: Optimized for desktop operations centers, tablets, and field mobile touch screens.
- **Voice AI Operations Copilot**: Interactive audio telemetry assistant with speech synthesis and real-time civic incident query handling.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **Geospatial & Mapping**: Leaflet, React-Leaflet, GeoJSON Ward Boundaries
- **Authentication**: Firebase Auth (Google OAuth & Email/Password)
- **Icons & UI**: Lucide React, Custom Canvas Particle Engine, Micro-sound FX Engine

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/AWDAX/DOAB-Platform-.git
cd DOAB-Platform-

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
```

### 📱 Android Mobile App (.apk)
```bash
# Sync web assets to Android
npm run apk:sync

# Build native Android debug APK
npm run apk:build

# Open in Android Studio
npm run apk:open
```
> For complete architecture, offline vs live-URL mode, and native SOS capabilities, see [`ANDROID_APP_GUIDE.md`](./ANDROID_APP_GUIDE.md).


### One-hour estimate API
```bash
cd services/prediction-api
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.cli build-dataset
.venv/bin/python -m app.cli train
.venv/bin/uvicorn app.main:app --port 8000
```
Set `VITE_PREDICTION_API_URL` in `.env` (see `.env.example`). Optional `GOOGLE_ROUTES_API_KEY` and `GAUL_GEOJSON` stay on the server. Without the route key, the app returns an unscored Google Maps link. Without a GAUL file, the map shows the labelled pilot box only.

Rainfall is Open-Meteo ERA5. Elevation is Open-Meteo Copernicus DEM. Labels are OpenCity Bengaluru complaints, not surveyed flood depths.

---

## 👥 Engineering Team — Contrarians

- **DOAB Architecture & Engineering Team**
- Team: **Contrarians**
