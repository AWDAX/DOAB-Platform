# 🗺️ DOAB Geospatial Architecture: Data Sources, Engine Mechanics & Usage

This document provides a comprehensive technical overview of how geospatial mapping works in the DOAB platform, where every layer of data originates, how Leaflet and MapLibre GL utilize that data, and how it powers our urban disaster resilience interface.

---

## 1. High-Level Architecture Overview

The DOAB mapping engine operates on a strict **Two-Tier Geospatial Separation**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER / PWA                            │
│                                                                        │
│  [ TIER 2: DOAB APPLICATION DATA LAYER (GeoJSON / Vectors / HTML5) ]   │
│   • Historical Waterlogging Incidents (BBMP municipal telemetry)      │
│   • 1-Hour Machine Learning Flood Prediction Contours (FastAPI API)    │
│   • Dynamic Macro Danger Risk Halos (Haversine Spatial Clustering)     │
│   • Live GPS Ground-Lock Coordinate Beacon (HTML5 Geolocation)         │
│   • Multi-modal Safe High-Ground Routing Corridors                     │
│                                                                        │
│  ──────────────────────────────▲────────────────────────────────────── │
│                                │ Drawn On Top Of                       │
│  ──────────────────────────────▼────────────────────────────────────── │
│                                                                        │
│  [ TIER 1: GLOBAL BASEMAP TILE LAYER (Streaming Web Mercator Grid) ]   │
│   • 2D Lite (Leaflet): Raster Image Tile Grid (.png/.jpg)              │
│   • 3D GPU (MapLibre GL): WebGL/WebGPU Hardware Accelerated Vector/Sat │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Where the Data Comes From

### Tier 1: The Earth Basemap (Streaming Global CDNs)
Neither the browser nor our servers store maps of the world. Map tiles are streamed dynamically based on the user's viewport using the standard **Web Mercator (`EPSG:3857`)** tile coordinate formula: `{z}/{x}/{y}` (`z` = zoom level, `x` = column, `y` = row).

| View Mode & Engine | Tile CDN Server Endpoint | Source Providers | What Data It Transmits |
| :--- | :--- | :--- | :--- |
| **Light Mode** *(2D & 3D)* | `services.arcgisonline.com/.../Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` | **Esri, OpenStreetMap contributors, Garmin, HERE** | Global road networks, coastlines, water bodies, and city labels rendered in a clean, high-contrast, minimalist light-gray canvas. |
| **Dark Mode — 2D Lite** *(Leaflet)* | `services.arcgisonline.com/.../Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}` | **Esri, OpenStreetMap contributors** | The exact same vector street and geographic topologies, rendered in neutral charcoal tones for night operations. |
| **Dark Mode — 3D GPU** *(MapLibre GL)* | `services.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}` | **NASA, USGS, Maxar Technologies, Airbus, ESA** | High-resolution satellite and aerial optical photography captured by Earth observation satellites. |

> **Key Advantage:** These endpoints require **zero API keys**, have **no localhost/CORS locks**, use edge CDNs for sub-40ms response times in India, and eliminate rate-limiting penalties during disaster monitoring.

---

### Tier 2: Civic Disaster & Incident Data (Our Platform Layer)

Every pin, risk boundary, and route displayed on top of the basemap is computed and served by our platform's services:

#### 1. Historical Municipal Incidents & Complaints
- **File:** `src/data/waterloggingIncidents.ts`
- **Origin:** Real open-data municipal disaster records from OpenCity and BBMP (Bruhat Bengaluru Mahanagara Palike), cleaned and categorized by severity (`Critical`, `High`, `Medium`, `Low`).
- **Telemetry Included:** Exact WGS-84 coordinates (`lat`, `lng`), ward names, standing water depth descriptions, and resolution timestamps.

#### 2. One-Hour Machine Learning Flood Prediction
- **Service:** `services/prediction-api/app/main.py` via `useForecast.ts`
- **Data Inputs:**
  - **Precipitation:** Open-Meteo ERA5 / live weather API.
  - **Terrain Elevation:** Open-Meteo Copernicus DEM (Digital Elevation Model) & NASA SRTM 30m resolution radar elevation.
- **Output:** Normalized $0.0 - 1.0$ inundation probability across geographical grid cells in Bengaluru, visualized as colored risk contours.

#### 3. Macro Danger Clusters (Spatial Haversine Clustering)
- **Engine:** Client-side compute in `src/pages/MapPage.tsx` using the Great-Circle Haversine formula:
  $$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
- **Function:** Groups nearby complaints occurring within a dynamic radius ($1.6\text{ km} - 4.5\text{ km}$) into actionable macro hazard sectors with calculated perimeter halos.

#### 4. Real-Time Hardware GPS Location
- **API:** Browser native `navigator.geolocation.getCurrentPosition()`.
- **Function:** Triangulates device GPS / Wi-Fi cell data to place the user's real live beacon and compute live distance (`haversineKm`) to the nearest hazard node.

#### 5. Administrative & Municipal Ward Boundaries (Future Extension & Roadmap)
- **Service Endpoint:** `GET /boundaries` (`services/prediction-api/app/boundaries.py`)
- **Preferred Data Source:** UN FAO GAUL 2024 / Survey of India district and BBMP ward boundary polygons (`gaul2024_india.geojson`).
- **Current Architecture & Hiding Rationale:**
  - In local development and lightweight deployments where the full GAUL polygon dataset is absent, the backend returns a fallback rectangular pilot corridor bounding box (`PILOT_BBOX`: `min_lat: 12.60, max_lat: 13.30, min_lng: 77.30, max_lng: 77.90`).
  - Previously, this was rendered via a `<GeoJSON>` layer on the map, producing an unexplained vertical rectangle outline over Bengaluru.
  - To maintain a clean, professional, and seamless basemap presentation, this raw bounding box outline is **hidden by default** in `src/pages/MapPage.tsx`.
- **Future Integration Plan:**
  - When official civic boundaries (e.g. BBMP 198 ward polygons or national administrative boundaries) are bundled, re-enable the layer conditionally:
    ```tsx
    {boundaries && boundaries.source !== 'pilot_bbox' && (
      <GeoJSON data={boundaries as never} style={() => ({ color: '#64748b', weight: 1.2, fillOpacity: 0.05 })} />
    )}
    ```
  - An optional layer toggle will also be integrated into the map's Layers & Filter slide-over drawer so operators can toggle ward outlines on/off at will.

---

## 3. How Leaflet (2D Lite) Uses This Data

Leaflet functions as a **DOM & 2D Canvas Tile Pipeline**:

1. **Raster Tile Rendering:**
   - Leaflet calculates which $\{z, x, y\}$ square images intersect the viewport.
   - It downloads $256 \times 256\text{ px}$ image tiles (`.jpg` or `.png`) and injects them into HTML `<img>` elements positioned with CSS hardware transforms.
2. **Data Overlay Layering:**
   - Over the image layer, Leaflet creates an SVG/Canvas overlay pane (`leaflet-overlay-pane` and `leaflet-marker-pane`).
   - Incident pins are rendered as custom HTML `L.divIcon` DOM elements with CSS animations.
   - Clusters and prediction cells are drawn as geometric vector circles (`L.Circle`) and GeoJSON boundaries.
3. **Overzoom Protection (`maxNativeZoom`):**
   - Esri Canvas tiles natively cap at zoom level 16 in India.
   - We configure `maxNativeZoom={16}` and `maxZoom={18}`.
   - When zooming to levels 17 and 18, Leaflet **hardware-scales** the existing level 16 tile rather than requesting missing tiles, completely preventing `"Map data not yet available"` errors.

---

## 4. How MapLibre GL (3D GPU) Uses This Data

MapLibre GL operates as a **hardware-accelerated WebGL / WebGPU graphics engine**:

1. **GPU Texture Upload:**
   - MapLibre loads tile images into GPU memory textures.
   - A vertex and fragment shader pipeline draws the terrain across a 3D perspective matrix.
2. **True 3D Pitch, Bearing & Camera Orbit:**
   - Allows tilting ($0^\circ - 85^\circ$) and rotating ($0^\circ - 360^\circ$) freely via mouse (`Ctrl + Drag`), touch gestures, or our Neo-Glass camera control rack.
   - Incident pins and route vectors adapt their perspective transformations dynamically to match camera pitch and bearing.
3. **GPU Raster Oversampling:**
   - Configured with `maxzoom: 16` on the raster source and `maxZoom: 18` on the camera.
   - MapLibre applies bilinear texture interpolation on the GPU when zoomed close, ensuring smooth rendering at high magnification.

---

## 5. Summary Matrix

| Metric | 2D Lite (`Leaflet`) | 3D GPU (`MapLibre GL`) |
| :--- | :--- | :--- |
| **Primary Technology** | HTML DOM + Canvas + SVG | WebGL 2.0 / WebGPU Shader Pipeline |
| **Basemap Medium** | 2D Raster Tiles (.jpg / .png) | GPU Textures (Raster & Vector support) |
| **Camera Freedom** | Top-down flat 2D | Full 3D Tilt, Pitch, and 360° Bearing Orbit |
| **Device Footprint** | Extremely low battery & CPU load | GPU accelerated; smooth 60–120 FPS |
| **Target Use Case** | Low-bandwidth mobile field devices | Command center operations & 3D topography analysis |
| **Custom Cursor** | Touch/mouse SVG hand grab (`cover_hand_grab.svg`) | Touch/mouse SVG hand grab (`cover_hand_grab.svg`) |
