import { useEffect, useRef, useMemo, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import Tooltip from './Tooltip';
import { playClick } from '../utils/soundFx';
import type { TelemetryIncident } from '../data/waterloggingIncidents';

export interface MapLibreCluster {
  lat: number;
  lng: number;
  clusterRadiusKm: number;
  highestSeverity: 'Critical' | 'High' | 'Medium' | 'Low';
  ward?: string;
  category?: string;
  count?: number;
}

interface MapLibreViewProps {
  center: [number, number];
  zoom: number;
  incidents: TelemetryIncident[];
  selectedIncident: TelemetryIncident | null;
  onSelectIncident: (incident: TelemetryIncident) => void;
  isDarkMode: boolean;
  envMode: 'flood' | 'drought';
  userLocation: { lat: number; lng: number } | null;
  activeRouteGeometry?: [number, number][];
  clusters?: MapLibreCluster[];
  showHeatLayer?: boolean;
}

// Generate accurate circle polygon coordinates in [lng, lat] for hardware-accelerated 3D WebGL rendering
function createGeoJSONCircle(centerLngLat: [number, number], radiusInMeters: number, points = 48): [number, number][] {
  const coords: [number, number][] = [];
  const km = radiusInMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((centerLngLat[1] * Math.PI) / 180));
  const distanceY = km / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLngLat[0] + x, centerLngLat[1] + y]);
  }
  coords.push(coords[0]);
  return coords;
}

export default function MapLibreView({
  center,
  zoom,
  incidents,
  selectedIncident,
  onSelectIncident,
  isDarkMode,
  envMode,
  userLocation,
  activeRouteGeometry,
  clusters = [],
  showHeatLayer = false
}: MapLibreViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const currentStyleModeRef = useRef<boolean>(isDarkMode);
  const [bearing, setBearing] = useState<number>(-17.6);
  const [pitch, setPitch] = useState<number>(45);
  const [isDraggingZ, setIsDraggingZ] = useState<boolean>(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    startBearing: number;
    startPitch: number;
    hasMoved: boolean;
  } | null>(null);

  // Basemap style: Crisp Light Gray Canvas for light mode, High-Res Sat/Dark Night Imagery for dark mode
  const styleConfig = useMemo(() => {
    const tileUrl = isDarkMode
      ? 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    // Canvas tiles natively cap at zoom 16 in India/global, whereas satellite imagery goes to 18+
    const maxNativeTileZoom = isDarkMode ? 18 : 16;

    return {
      version: 8 as const,
      sources: {
        'esri-base-tiles': {
          type: 'raster' as const,
          tiles: [tileUrl],
          tileSize: 256,
          maxzoom: maxNativeTileZoom
        }
      },
      layers: [
        {
          id: 'esri-base-tiles-layer',
          type: 'raster' as const,
          source: 'esri-base-tiles',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };
  }, [isDarkMode]);

  // Synchronize all vector layers (Clusters, Focused Risk Halo, Proximity Vectors, Route)
  const syncLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. SAHNIRMAAN Macro Danger Cluster Halos
    const clusterSourceId = 'cluster-halos-source';
    const clusterFillId = 'cluster-halos-fill';
    const clusterLineId = 'cluster-halos-line';

    if (map.getLayer(clusterFillId)) map.removeLayer(clusterFillId);
    if (map.getLayer(clusterLineId)) map.removeLayer(clusterLineId);
    if (map.getSource(clusterSourceId)) map.removeSource(clusterSourceId);

    if (showHeatLayer && clusters && clusters.length > 0) {
      const clusterFeatures = clusters.slice(0, 8).map((cluster, idx) => {
        const radiusM = Math.max(cluster.clusterRadiusKm * 500, 1600);
        const circleCoords = createGeoJSONCircle([cluster.lng, cluster.lat], radiusM);
        const color = cluster.highestSeverity === 'Critical' ? '#E11D48' : '#D97706';
        return {
          type: 'Feature' as const,
          id: idx,
          properties: {
            color,
            severity: cluster.highestSeverity
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [circleCoords]
          }
        };
      });

      map.addSource(clusterSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: clusterFeatures
        }
      });

      map.addLayer({
        id: clusterFillId,
        type: 'fill',
        source: clusterSourceId,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.08
        }
      });

      map.addLayer({
        id: clusterLineId,
        type: 'line',
        source: clusterSourceId,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.8,
          'line-dasharray': [3, 2]
        }
      });
    }

    // 2. Focused Risk Halo for Currently Inspected Incident
    const selectedHaloSourceId = 'selected-incident-halo-source';
    const selectedHaloFillId = 'selected-incident-halo-fill';
    const selectedHaloLineId = 'selected-incident-halo-line';

    if (map.getLayer(selectedHaloFillId)) map.removeLayer(selectedHaloFillId);
    if (map.getLayer(selectedHaloLineId)) map.removeLayer(selectedHaloLineId);
    if (map.getSource(selectedHaloSourceId)) map.removeSource(selectedHaloSourceId);

    if (showHeatLayer && selectedIncident) {
      const radiusM = selectedIncident.severity === 'Critical' ? 480 : selectedIncident.severity === 'High' ? 320 : 180;
      const haloCoords = createGeoJSONCircle([selectedIncident.lng, selectedIncident.lat], radiusM);
      const color = selectedIncident.severity === 'Critical' ? '#E11D48' : selectedIncident.severity === 'High' ? '#D97706' : '#0284C7';

      map.addSource(selectedHaloSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { color },
          geometry: {
            type: 'Polygon',
            coordinates: [haloCoords]
          }
        }
      });

      map.addLayer({
        id: selectedHaloFillId,
        type: 'fill',
        source: selectedHaloSourceId,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.16
        }
      });

      map.addLayer({
        id: selectedHaloLineId,
        type: 'line',
        source: selectedHaloSourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      });
    }

    // 3. Spatial Proximity Vector from User GPS to Inspected Incident
    const proximitySourceId = 'proximity-vector-source';
    const proximityLayerId = 'proximity-vector-layer';

    if (map.getLayer(proximityLayerId)) map.removeLayer(proximityLayerId);
    if (map.getSource(proximitySourceId)) map.removeSource(proximitySourceId);

    if (userLocation && selectedIncident) {
      const color = selectedIncident.severity === 'Critical' ? '#E11D48' : '#D97706';
      map.addSource(proximitySourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { color },
          geometry: {
            type: 'LineString',
            coordinates: [
              [userLocation.lng, userLocation.lat],
              [selectedIncident.lng, selectedIncident.lat]
            ]
          }
        }
      });

      map.addLayer({
        id: proximityLayerId,
        type: 'line',
        source: proximitySourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.75
        }
      });
    }

    // 4. Active Route Polyline
    const routeSourceId = 'active-route-source';
    const routeLayerId = 'active-route-layer';

    if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
    if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);

    if (activeRouteGeometry && activeRouteGeometry.length > 1) {
      const coordinates = activeRouteGeometry.map(pt => [pt[1], pt[0]]);
      map.addSource(routeSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      map.addLayer({
        id: routeLayerId,
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': envMode === 'flood' ? '#0ea5e9' : '#f59e0b',
          'line-width': 4,
          'line-dasharray': [2, 1]
        }
      });
    }
  };

  // Synchronize HTML DOM Markers (User GPS and Incident Pins)
  const syncMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    // Clean previous markers cleanly
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add user marker if available
    if (userLocation) {
      const userEl = document.createElement('div');
      userEl.className = 'w-8 h-8 flex items-center justify-center relative cursor-pointer';
      userEl.style.zIndex = '50';
      userEl.style.pointerEvents = 'auto';
      userEl.innerHTML = `
        <span class="absolute inset-0 rounded-full bg-sky-500/35 animate-ping"></span>
        <span class="absolute -inset-1 rounded-full bg-sky-400/20"></span>
        <div class="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center relative z-10">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      `;
      userEl.title = 'Your Live GPS Location';

      const userPopup = new maplibregl.Popup({ 
        offset: 18, 
        closeButton: false 
      }).setHTML(`
        <div style="padding: 6px 10px; font-family: monospace; font-size: 11px; border-radius: 10px; background: #0f172a; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
          <div style="font-weight: bold; display: flex; align-items: center; gap: 6px; color: #38bdf8;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
            Your Real Live GPS Location
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">
            ${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E
          </div>
        </div>
      `);

      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(userPopup)
        .addTo(map);
      markersRef.current.push(userMarker);
    }

    // Add incident markers with clear visibility and click dispatching
    incidents.slice(0, 150).forEach(incident => {
      const isSelected = selectedIncident?.id === incident.id;
      const isFlood = envMode === 'flood';

      let dotColor = isFlood ? '#0284c7' : '#d97706';
      if (incident.severity === 'Critical') dotColor = '#e11d48';
      else if (incident.severity === 'High') dotColor = isFlood ? '#0369a1' : '#b45309';

      const el = document.createElement('div');
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      el.style.zIndex = isSelected ? '30' : '10';
      el.title = `${incident.title} (${incident.severity})`;

      if (isSelected) {
        el.className = 'relative flex items-center justify-center';
        el.style.width = '28px';
        el.style.height = '28px';
        el.innerHTML = `
          <span style="position:absolute; inset:0; border-radius:50%; background:${dotColor}40; animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <div style="
            width: 18px; 
            height: 18px; 
            border-radius: 50%; 
            background: ${dotColor}30; 
            border: 2px solid ${dotColor}; 
            box-shadow: 0 0 12px ${dotColor}; 
            display: flex; align-items:center; justify-content:center;
          ">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 4px #ffffff;"></div>
          </div>
        `;
      } else {
        el.className = 'flex items-center justify-center transition-transform hover:scale-125';
        el.style.width = '18px';
        el.style.height = '18px';
        el.innerHTML = `
          <div style="
            width: 11px; 
            height: 11px; 
            border-radius: 50%; 
            background: ${dotColor}; 
            border: 2px solid #ffffff; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          "></div>
        `;
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectIncident(incident);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.lng, incident.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  };

  // Map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleConfig as any,
      center: [center[1], center[0]], // MapLibre takes [lng, lat]
      zoom: zoom,
      maxZoom: 18,
      pitch: 45, // 3D tilt
      bearing: -17.6,
      attributionControl: false // Removes standard bottom-right attribution bar cleanly
    });

    map.on('rotate', () => {
      setBearing(Math.round(map.getBearing()));
    });

    map.on('pitch', () => {
      setPitch(Math.round(map.getPitch()));
    });

    map.on('load', () => {
      map.resize();
      syncLayers();
      syncMarkers();
    });

    // Staggered micro-delays to guarantee canvas resize within parent absolute bounds
    const r1 = setTimeout(() => map.resize(), 60);
    const r2 = setTimeout(() => map.resize(), 300);

    mapRef.current = map;

    return () => {
      clearTimeout(r1);
      clearTimeout(r2);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update style when theme changes and re-bind layers & markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (currentStyleModeRef.current !== isDarkMode) {
      currentStyleModeRef.current = isDarkMode;
      map.setStyle(styleConfig as any);
      map.once('styledata', () => {
        map.resize();
        syncLayers();
        syncMarkers();
      });
    }
  }, [styleConfig, isDarkMode]);

  // Update center & zoom if changed from outside with cinematic flight
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [center[1], center[0]],
        zoom: zoom,
        duration: 2000,
        essential: true,
        curve: 1.42,
        speed: 1.2
      });
    }
  }, [center[0], center[1], zoom]);

  // Sync vector layers when relevant dependencies change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      syncLayers();
    } else {
      map.once('styledata', syncLayers);
    }
  }, [clusters, showHeatLayer, selectedIncident, userLocation, activeRouteGeometry, envMode]);

  // Sync markers when incidents or selections change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    syncMarkers();
  }, [incidents, selectedIncident, envMode, userLocation]);

  const handleZoomIn = () => {
    playClick();
    mapRef.current?.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    playClick();
    mapRef.current?.zoomOut({ duration: 300 });
  };

  const handleRotateLeft = () => {
    playClick();
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ bearing: map.getBearing() - 45, duration: 400 });
  };

  const handleRotateRight = () => {
    playClick();
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ bearing: map.getBearing() + 45, duration: 400 });
  };

  const handleResetBearing = () => {
    playClick();
    mapRef.current?.resetNorthPitch({ duration: 500 });
  };

  // Hold & Drag to perform 3D Z-Rotation (Bearing) and Elevation Tilt (Pitch)
  const handleZPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    const map = mapRef.current;
    if (!map) return;

    playClick();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startBearing: map.getBearing(),
      startPitch: map.getPitch(),
      hasMoved: false
    };
    setIsDraggingZ(true);
  };

  const handleZPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;
    const map = mapRef.current;
    if (!map) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      dragStartRef.current.hasMoved = true;
    }

    // Horizontal drag controls Z-Rotation (Bearing); Vertical drag controls Elevation (Pitch)
    const newBearing = (dragStartRef.current.startBearing + deltaX * 0.75) % 360;
    const newPitch = Math.min(65, Math.max(0, dragStartRef.current.startPitch - deltaY * 0.45));

    map.setBearing(newBearing);
    map.setPitch(newPitch);
    setBearing(Math.round(newBearing));
    setPitch(Math.round(newPitch));
  };

  const handleZPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;
    const map = mapRef.current;
    const hadMoved = dragStartRef.current.hasMoved;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    dragStartRef.current = null;
    setIsDraggingZ(false);

    // If simply tapped/clicked without dragging, toggle 3D tilt perspective (0° flat <-> 45° 3D)
    if (!hadMoved && map) {
      playClick();
      const currentPitch = map.getPitch();
      const nextPitch = currentPitch > 20 ? 0 : 45;
      map.easeTo({ pitch: nextPitch, duration: 400 });
      setPitch(nextPitch);
    }
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 3D Indicator Badge & Tip */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span>3D GPU VECTOR ENGINE (MapLibre GL)</span>
        </div>
        <div className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[9px] font-mono">
          Hold 3D button & drag to orbit • Right-click to tilt
        </div>
      </div>

      {/* ── Professional Neo-Glass 3D GPU Camera Control Rack (Bottom-Right) ── */}
      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-6 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)]/90 dark:bg-[#12100e]/90 backdrop-blur-xl border border-[var(--border-color)] dark:border-white/15 shadow-xl pointer-events-auto">
        {/* Zoom In (+) */}
        <Tooltip content="Zoom In (+ or Scroll)" position="left">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
            aria-label="Zoom in"
          >
            <Plus size={15} />
          </button>
        </Tooltip>

        {/* Zoom Out (-) */}
        <Tooltip content="Zoom Out (- or Scroll)" position="left">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
            aria-label="Zoom out"
          >
            <Minus size={15} />
          </button>
        </Tooltip>

        <div className="w-5 h-px bg-[var(--border-color)] dark:bg-white/10 my-0.5" />

        {/* 3D Z-Rotation & Orbit Drag Button (Hold & Drag to Orbit, Click to Toggle Tilt) */}
        <div className="relative">
          <Tooltip content="Hold & Drag for 3D Z-Rotation • Click to Tilt" position="left" disabled={isDraggingZ}>
            <button
              type="button"
              onPointerDown={handleZPointerDown}
              onPointerMove={handleZPointerMove}
              onPointerUp={handleZPointerUp}
              onPointerCancel={handleZPointerUp}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-grab active:cursor-grabbing select-none relative group ${
                isDraggingZ
                  ? 'bg-cyan-500 text-slate-950 shadow-lg ring-2 ring-cyan-400 scale-105'
                  : 'text-[var(--text-main)] hover:bg-[var(--text-main)]/10'
              }`}
              aria-label="Hold and drag to rotate 3D camera around Z-axis"
            >
              <div 
                className="w-5 h-5 flex items-center justify-center transition-transform duration-75"
                style={{ transform: isDraggingZ ? `rotate(${bearing}deg)` : undefined }}
              >
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.6" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  {/* Isometric 3D Cube with Central Z-Axis */}
                  <path d="M12 2.5 L19.5 6.8 L12 11 L4.5 6.8 Z" className={isDraggingZ ? "fill-slate-950/20" : "fill-current/10"} />
                  <path d="M4.5 6.8 L4.5 15.5 L12 19.8 L12 11" />
                  <path d="M19.5 6.8 L19.5 15.5 L12 19.8" />
                  {/* Orbital curved rotation arrow around Z axis */}
                  <path d="M2.5 11 A9.5 5 0 0 0 21.5 11" strokeDasharray="2 1.5" strokeWidth="1.3" className={isDraggingZ ? "text-slate-950" : "text-cyan-500"} />
                </svg>
              </div>

              {/* Mini "3D" indicator badge on button */}
              <span className={`absolute -bottom-0.5 -right-0.5 text-[7px] font-mono font-black px-1 rounded-sm leading-tight ${
                isDraggingZ ? 'bg-slate-950 text-cyan-400' : 'bg-[var(--bg-main)] text-[var(--color-brand-accent)] border border-[var(--border-color)]'
              }`}>
                3D
              </span>
            </button>
          </Tooltip>

          {/* Live Rotation HUD while dragging */}
          {isDraggingZ && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-900/95 text-cyan-400 border border-cyan-500/40 text-[10px] font-mono font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md pointer-events-none z-30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span>Z-Orbit: {bearing}°</span>
              <span className="text-slate-600">•</span>
              <span>Tilt: {pitch}°</span>
            </div>
          )}
        </div>

        {/* Rotate / Compass Reset (Authentic Marine / GIS Navigation Needle) */}
        <Tooltip content={bearing !== 0 ? `Reset North (Bearing: ${bearing}°)` : "Orient to True North"} position="left">
          <button
            type="button"
            onClick={handleResetBearing}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer relative group"
            aria-label="Reset orientation north"
          >
            <div 
              className="w-5 h-5 flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${-bearing}deg)` }}
            >
              <svg 
                viewBox="0 0 24 24" 
                className="w-4.5 h-4.5 overflow-visible drop-shadow-xs"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.2"
              >
                {/* Outer Subtle Compass Dial Ring */}
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="1.5 2" />
                
                {/* North Needle Pointer (Vibrant Red) */}
                <polygon 
                  points="12,2.5 15,12 12,10.5 9,12" 
                  className="fill-rose-500 stroke-rose-600" 
                  strokeWidth="0.8" 
                />
                
                {/* South Needle Pointer (Polished Slate / Neutral) */}
                <polygon 
                  points="12,21.5 15,12 12,10.5 9,12" 
                  className="fill-slate-400 dark:fill-neutral-300 stroke-slate-500 dark:stroke-neutral-400" 
                  strokeWidth="0.8" 
                />

                {/* Center Pivot Bezel */}
                <circle cx="12" cy="11.5" r="1.8" className="fill-white dark:fill-[#12100e] stroke-neutral-700 dark:stroke-white/80" strokeWidth="1" />
                
                {/* Cardinal 'N' Marker Text */}
                <text 
                  x="12" 
                  y="1.8" 
                  textAnchor="middle" 
                  className="text-[6.5px] font-mono font-black fill-rose-600 dark:fill-rose-400 select-none"
                  style={{ fontSize: '6.5px', fontWeight: 900 }}
                >
                  N
                </text>
              </svg>
            </div>
          </button>
        </Tooltip>

        {/* Orbit Left */}
        <Tooltip content="Rotate Camera Left 45°" position="left">
          <button
            type="button"
            onClick={handleRotateLeft}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
            aria-label="Orbit left"
          >
            <RotateCcw size={14} />
          </button>
        </Tooltip>

        {/* Orbit Right */}
        <Tooltip content="Rotate Camera Right 45°" position="left">
          <button
            type="button"
            onClick={handleRotateRight}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
            aria-label="Orbit right"
          >
            <RotateCcw size={14} className="-scale-x-100" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
