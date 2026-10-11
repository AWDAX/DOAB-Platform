import { useEffect, useRef, useMemo, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import Tooltip from './Tooltip';
import { playClick } from '../utils/soundFx';
import type { TelemetryIncident } from '../data/waterloggingIncidents';

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
  activeRouteGeometry
}: MapLibreViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [bearing, setBearing] = useState<number>(-17.6);

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

    map.on('load', () => {
      map.resize();
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

  // Update style when theme changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(styleConfig as any);
      setTimeout(() => mapRef.current?.resize(), 60);
    }
  }, [styleConfig]);

  // Update center & zoom if changed from outside
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        center: [center[1], center[0]],
        zoom: zoom,
        duration: 800
      });
    }
  }, [center[0], center[1], zoom]);

  // Render markers and layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add user marker if available
    if (userLocation) {
      const userEl = document.createElement('div');
      userEl.className = 'w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center animate-pulse';
      const innerDot = document.createElement('div');
      innerDot.className = 'w-2 h-2 rounded-full bg-white';
      userEl.appendChild(innerDot);

      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
      markersRef.current.push(userMarker);
    }

    // Add incident markers
    incidents.slice(0, 100).forEach(incident => {
      const el = document.createElement('div');
      const isSelected = selectedIncident?.id === incident.id;
      const isFlood = envMode === 'flood';

      let bg = isFlood ? '#0284c7' : '#d97706';
      if (incident.severity === 'Critical') bg = '#e11d48';
      else if (incident.severity === 'High') bg = isFlood ? '#0369a1' : '#b45309';

      el.style.backgroundColor = bg;
      el.style.width = isSelected ? '22px' : '14px';
      el.style.height = isSelected ? '22px' : '14px';
      el.style.borderRadius = '50%';
      el.style.border = isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.85)';
      el.style.boxShadow = isSelected ? '0 0 16px ' + bg : '0 2px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectIncident(incident);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.lng, incident.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [incidents, selectedIncident, envMode, userLocation]);

  // Handle route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const routeSourceId = 'active-route-source';
    const routeLayerId = 'active-route-layer';

    const updateRoute = () => {
      if (!map.isStyleLoaded()) return;

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

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once('styledata', updateRoute);
    }
  }, [activeRouteGeometry, envMode]);

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
          Ctrl + Drag to orbit • Right-click to tilt
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
