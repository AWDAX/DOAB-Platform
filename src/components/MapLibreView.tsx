import { useEffect, useRef, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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

  // Choose appropriate basemap style (use ArcGIS World Gray Canvas: 100% Free, No API Key, Clean Civic Map)
  const styleConfig = useMemo(() => {
    const tileUrl = isDarkMode
      ? 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    return {
      version: 8 as const,
      sources: {
        'esri-canvas-tiles': {
          type: 'raster' as const,
          tiles: [tileUrl],
          tileSize: 256,
          attribution: '&copy; Esri &copy; OpenStreetMap'
        }
      },
      layers: [
        {
          id: 'esri-canvas-tiles-layer',
          type: 'raster' as const,
          source: 'esri-canvas-tiles',
          minzoom: 0,
          maxzoom: 16
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
      pitch: 45, // 3D tilt
      bearing: -17.6
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      map.resize();
    });

    // Multiple micro-delays to guarantee canvas resize within parent absolute bounds
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

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* 3D Indicator Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold shadow-lg">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
        <span>3D GPU VECTOR ENGINE (MapLibre GL)</span>
      </div>
    </div>
  );
}
