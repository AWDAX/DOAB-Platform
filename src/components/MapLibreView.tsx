import { useEffect, useRef, useMemo, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Ensure MapLibre WebWorker loads correctly in Vite development and production
if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
}

import { Plus, Minus, RotateCcw } from 'lucide-react';
import Tooltip from './Tooltip';
import { playClick } from '../utils/soundFx';
import type { TelemetryIncident } from '../data/waterloggingIncidents';

export interface MapLibreCluster {
  id?: string;
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
  selectedClusterKey?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  pathOrigin?: [number, number] | null;
  pathDest?: [number, number] | null;
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
  showHeatLayer = false,
  selectedClusterKey = null,
  onMapClick,
  pathOrigin = null,
  pathDest = null
}: MapLibreViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const currentStyleModeRef = useRef<boolean>(isDarkMode);
  const [bearing, setBearing] = useState<number>(-17.6);
  const [pitch, setPitch] = useState<number>(45);
  const [isDraggingZ, setIsDraggingZ] = useState<boolean>(false);
  const [isCameraFlying, setIsCameraFlying] = useState<boolean>(false);
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

    // 1. DOAB Macro Danger Cluster Halos (Matching 2D Lite Double-Outline + Calibrated Alpha Fill)
    const clusterSourceId = 'cluster-halos-source';
    const clusterFillId = 'cluster-halos-fill';
    const clusterLineId = 'cluster-halos-line';
    const clusterOuterRingSourceId = 'cluster-outer-ring-source';
    const clusterOuterRingLineId = 'cluster-outer-ring-line';
    const legacyExtrusionId = 'risk-clusters-3d-elevation';

    try {
      if (map.getLayer(legacyExtrusionId)) map.removeLayer(legacyExtrusionId);
    } catch (_) {}

    if (showHeatLayer && clusters && clusters.length > 0) {
      // Render up to 64 macro danger clusters in 3D WebGL mode
      const topClusters = clusters.slice(0, 64);
      const selectedClusterObj = selectedClusterKey
        ? clusters.find((c, idx) => (c.id && c.id === selectedClusterKey) || `${c.ward}-${idx}` === selectedClusterKey)
        : null;
      const renderedClusters = selectedClusterObj && !topClusters.some((c) => (c.id && selectedClusterObj.id && c.id === selectedClusterObj.id))
        ? [...topClusters, selectedClusterObj]
        : topClusters;

      const clusterFeatures: any[] = [];
      const outerRingFeatures: any[] = [];

      renderedClusters.forEach((cluster, idx) => {
        const radiusM = Math.max(cluster.clusterRadiusKm * 500, 1600);
        const circleCoords = createGeoJSONCircle([cluster.lng, cluster.lat], radiusM);
        const clusterId = cluster.id || `${cluster.ward}-${idx}`;
        const isSelected = selectedClusterKey != null && (
          selectedClusterKey === clusterId || 
          selectedClusterKey === `${cluster.ward}-${idx}`
        );
        let color = '#475569';
        if (cluster.highestSeverity === 'Critical') color = '#BE123C';
        else if (cluster.highestSeverity === 'High') color = '#B45309';
        else if (cluster.highestSeverity === 'Medium') color = '#475569';
        else if (cluster.highestSeverity === 'Low') color = '#0F766E';

        const isFeeble = selectedClusterKey != null && !isSelected;
        clusterFeatures.push({
          type: 'Feature' as const,
          id: idx,
          properties: {
            color,
            severity: cluster.highestSeverity,
            opacity: isSelected ? 0.34 : isFeeble ? 0.045 : 0.08,
            lineWidth: isSelected ? 3.5 : isFeeble ? 1.3 : 1.8,
            lineOpacity: isSelected ? 1.0 : isFeeble ? 0.45 : 0.88,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [circleCoords]
          }
        });

        // Double outline outer ring for selected cluster (matches 2D Lite view)
        if (isSelected) {
          const outerCoords = createGeoJSONCircle([cluster.lng, cluster.lat], radiusM * 1.15);
          outerRingFeatures.push({
            type: 'Feature' as const,
            id: `outer-${idx}`,
            properties: { color },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [outerCoords]
            }
          });
        }
      });

      const clusterGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: clusterFeatures
      };

      const existingClusterSource = map.getSource(clusterSourceId) as maplibregl.GeoJSONSource | undefined;
      if (existingClusterSource && typeof existingClusterSource.setData === 'function') {
        existingClusterSource.setData(clusterGeoJson);
      } else {
        map.addSource(clusterSourceId, {
          type: 'geojson',
          data: clusterGeoJson
        });
      }

      if (!map.getLayer(clusterFillId)) {
        map.addLayer({
          id: clusterFillId,
          type: 'fill',
          source: clusterSourceId,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['get', 'opacity'],
            'fill-antialias': true
          }
        });
      }

      if (!map.getLayer(clusterLineId)) {
        map.addLayer({
          id: clusterLineId,
          type: 'line',
          source: clusterSourceId,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'lineWidth'],
            'line-opacity': ['get', 'lineOpacity']
          }
        });
      }

      const outerGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: outerRingFeatures
      };

      const existingOuterSource = map.getSource(clusterOuterRingSourceId) as maplibregl.GeoJSONSource | undefined;
      if (existingOuterSource && typeof existingOuterSource.setData === 'function') {
        existingOuterSource.setData(outerGeoJson);
      } else {
        map.addSource(clusterOuterRingSourceId, {
          type: 'geojson',
          data: outerGeoJson
        });
      }

      if (!map.getLayer(clusterOuterRingLineId)) {
        map.addLayer({
          id: clusterOuterRingLineId,
          type: 'line',
          source: clusterOuterRingSourceId,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-dasharray': [2, 3],
            'line-opacity': 0.85
          }
        });
      }
    } else {
      try {
        if (map.getLayer(clusterFillId)) map.removeLayer(clusterFillId);
        if (map.getLayer(clusterLineId)) map.removeLayer(clusterLineId);
        if (map.getSource(clusterSourceId)) map.removeSource(clusterSourceId);
        if (map.getLayer(clusterOuterRingLineId)) map.removeLayer(clusterOuterRingLineId);
        if (map.getSource(clusterOuterRingSourceId)) map.removeSource(clusterOuterRingSourceId);
      } catch (_) {}
    }

    // 2. Focused Risk Halo for Currently Inspected Incident
    const selectedHaloSourceId = 'selected-incident-halo-source';
    const selectedHaloFillId = 'selected-incident-halo-fill';
    const selectedHaloLineId = 'selected-incident-halo-line';

    try {
      if (map.getLayer(selectedHaloFillId)) map.removeLayer(selectedHaloFillId);
      if (map.getLayer(selectedHaloLineId)) map.removeLayer(selectedHaloLineId);
      if (map.getSource(selectedHaloSourceId)) map.removeSource(selectedHaloSourceId);
    } catch (_) {}

    if (showHeatLayer && selectedIncident) {
      const radiusM = selectedIncident.severity === 'Critical' ? 480 : selectedIncident.severity === 'High' ? 320 : 180;
      const haloCoords = createGeoJSONCircle([selectedIncident.lng, selectedIncident.lat], radiusM);
      const color = selectedIncident.severity === 'Critical' ? '#BE123C' : selectedIncident.severity === 'High' ? '#B45309' : '#475569';

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
          'fill-opacity': isCameraFlying ? 0 : 0.16,
          'fill-opacity-transition': { duration: 400, delay: 0 }
        }
      });

      map.addLayer({
        id: selectedHaloLineId,
        type: 'line',
        source: selectedHaloSourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': isCameraFlying ? 0 : 1,
          'line-opacity-transition': { duration: 400, delay: 0 }
        }
      });
    }

    // 3. Spatial Proximity Vector from User GPS to Inspected Incident
    const proximitySourceId = 'proximity-vector-source';
    const proximityLayerId = 'proximity-vector-layer';

    try {
      if (map.getLayer(proximityLayerId)) map.removeLayer(proximityLayerId);
      if (map.getSource(proximitySourceId)) map.removeSource(proximitySourceId);
    } catch (_) {}

    if (userLocation && selectedIncident) {
      const color = selectedIncident.severity === 'Critical' ? '#BE123C' : '#B45309';
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
          'line-opacity': isCameraFlying ? 0 : 0.75,
          'line-opacity-transition': { duration: 400, delay: 0 }
        }
      });
    }

    // 4. Active Route Polyline
    const routeSourceId = 'active-route-source';
    const routeLayerId = 'active-route-layer';

    try {
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
      if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);
    } catch (_) {}

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
          'line-color': isDarkMode ? '#f8fafc' : '#171717',
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

    // Clean previous markers and active hover popups cleanly
    if (hoverPopupRef.current) {
      hoverPopupRef.current.remove();
      hoverPopupRef.current = null;
    }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add user marker if available (Always classic blue GPS orb)
    if (userLocation) {
      const userEl = document.createElement('div');
      userEl.className = 'w-8 h-8 flex items-center justify-center relative cursor-pointer';
      userEl.style.zIndex = '50';
      userEl.style.pointerEvents = 'auto';
      userEl.innerHTML = `
        <span class="absolute inset-0 rounded-full bg-sky-500/35 animate-ping"></span>
        <span class="absolute -inset-1 rounded-full bg-sky-500/15"></span>
        <div class="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center relative z-10">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      `;

      const userPopup = new maplibregl.Popup({ 
        offset: 18, 
        closeButton: false,
        className: 'maplibre-custom-incident-popup'
      }).setHTML(`
        <div style="padding: 4px; display: flex; flex-direction: column; gap: 2px; min-width: 140px;">
          <div style="font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 6px; color: #38bdf8;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
            Live GPS Location
          </div>
          <div style="font-size: 9px; font-family: monospace; color: var(--text-muted, #94a3b8); margin-top: 2px;">
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

    // Add incident markers with custom neo-glass tooltips matching 2D Lite view
    incidents.forEach(incident => {
      const isSelected = selectedIncident?.id === incident.id;
      let dotColor = '#475569'; // Medium (Muted Steel Slate) default
      if (incident.severity === 'Critical') {
        dotColor = '#BE123C'; // Critical (Deep Garnet Rose)
      } else if (incident.severity === 'High') {
        dotColor = '#B45309'; // High (Warm Copper Amber)
      } else if (incident.severity === 'Medium') {
        dotColor = '#475569'; // Medium / Moderate (Slate)
      } else if (incident.severity === 'Low') {
        dotColor = '#0F766E'; // Low / Safe (Muted Teal)
      }

      const el = document.createElement('div');
      el.style.pointerEvents = 'auto';
      el.style.cursor = "url('/cursors/hand-pointer.svg') 10 2, pointer";
      el.style.zIndex = isSelected ? '30' : '10';

      if (isSelected) {
        el.className = 'relative flex items-center justify-center';
        el.style.width = '28px';
        el.style.height = '28px';
        el.innerHTML = `
          <span style="position:absolute; inset:0; border-radius:50%; background:${dotColor}40; animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite; pointer-events:none;"></span>
          <div style="
            width: 18px; 
            height: 18px; 
            border-radius: 50%; 
            background: ${dotColor}30; 
            border: 2px solid ${dotColor}; 
            box-shadow: 0 0 12px ${dotColor}; 
            display: flex; align-items:center; justify-content:center;
            pointer-events:none;
          ">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 4px #ffffff;"></div>
          </div>
        `;
      } else {
        el.className = 'group flex items-center justify-center';
        el.style.width = '22px';
        el.style.height = '22px';
        el.innerHTML = `
          <div class="transition-transform duration-200 ease-out group-hover:scale-130 pointer-events-none" style="
            width: 12px; 
            height: 12px; 
            border-radius: 50%; 
            background: ${dotColor}; 
            border: 2px solid #ffffff; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          "></div>
        `;
      }

      const popupHtml = `
        <div style="padding: 2px; display: flex; flex-direction: column; gap: 3px; min-width: 130px; max-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding-bottom: 3px; border-bottom: 1px solid var(--border-color);">
            <span style="font-size: 9px; font-family: monospace; font-weight: bold; padding: 1px 4px; border-radius: 4px; ${
              incident.severity === 'Critical' ? 'background: rgba(225, 29, 72, 0.15); color: #f43f5e;' :
              incident.severity === 'High' ? 'background: rgba(217, 119, 6, 0.15); color: #f59e0b;' :
              'background: rgba(100, 116, 139, 0.15); color: #94a3b8;'
            }">
              ${incident.severity}
            </span>
            <span style="font-size: 9px; font-family: monospace; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90px;">
              ${incident.ward || ''}
            </span>
          </div>
          <span style="font-weight: 600; font-size: 10.5px; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; line-height: 1.2;">
            ${incident.title}
          </span>
          ${incident.waterDepthCm ? `<span style="font-size: 9px; font-family: monospace; color: var(--text-main); font-weight: bold;">~${incident.waterDepthCm}cm Water Depth</span>` : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -12],
        className: 'maplibre-custom-incident-popup'
      }).setHTML(popupHtml);

      el.addEventListener('mouseenter', () => {
        if (hoverPopupRef.current) hoverPopupRef.current.remove();
        popup.setLngLat([incident.lng, incident.lat]).addTo(map);
        hoverPopupRef.current = popup;
        try {
          map.getCanvas().style.cursor = "url('/cursors/hand-pointer.svg') 10 2, pointer";
        } catch (_) {}
      });

      el.addEventListener('mouseleave', () => {
        popup.remove();
        if (hoverPopupRef.current === popup) hoverPopupRef.current = null;
        try {
          map.getCanvas().style.cursor = "url('/cursors/default_cursor.svg') 6 3, default";
        } catch (_) {}
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (hoverPopupRef.current === popup) hoverPopupRef.current = null;
        onSelectIncident(incident);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.lng, incident.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add Waypoint A (Origin Pin) in 3D Map
    if (pathOrigin) {
      const originEl = document.createElement('div');
      originEl.style.width = '28px';
      originEl.style.height = '28px';
      originEl.style.display = 'flex';
      originEl.style.alignItems = 'center';
      originEl.style.justifyContent = 'center';
      originEl.style.zIndex = '35';
      originEl.style.cursor = "url('/cursors/hand-pointer.svg') 10 2, pointer";
      originEl.innerHTML = `
        <div style="width:22px; height:22px; border-radius:8px; background:#171717; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
          A
        </div>
      `;

      const originPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -14],
        className: 'maplibre-custom-incident-popup'
      }).setHTML(`
        <div style="padding: 2px; display: flex; flex-direction: column; gap: 2px; min-width: 120px;">
          <div style="font-weight: 700; font-size: 11px; color: var(--text-main); display: flex; align-items: center; gap: 4px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:4px; background:#171717; color:#ffffff; font-size:9px; font-weight:800;">A</span>
            Point A (Origin)
          </div>
          <div style="font-size: 9px; font-family: monospace; color: var(--text-muted);">
            ${pathOrigin[0].toFixed(4)}° N, ${pathOrigin[1].toFixed(4)}° E
          </div>
        </div>
      `);

      originEl.addEventListener('mouseenter', () => {
        if (hoverPopupRef.current) hoverPopupRef.current.remove();
        originPopup.setLngLat([pathOrigin[1], pathOrigin[0]]).addTo(map);
        hoverPopupRef.current = originPopup;
      });
      originEl.addEventListener('mouseleave', () => {
        originPopup.remove();
        if (hoverPopupRef.current === originPopup) hoverPopupRef.current = null;
      });

      const originMarker = new maplibregl.Marker({ element: originEl })
        .setLngLat([pathOrigin[1], pathOrigin[0]])
        .addTo(map);
      markersRef.current.push(originMarker);
    }

    // Add Waypoint B (Destination Pin) in 3D Map
    if (pathDest) {
      const destEl = document.createElement('div');
      destEl.style.width = '28px';
      destEl.style.height = '28px';
      destEl.style.display = 'flex';
      destEl.style.alignItems = 'center';
      destEl.style.justifyContent = 'center';
      destEl.style.zIndex = '35';
      destEl.style.cursor = "url('/cursors/hand-pointer.svg') 10 2, pointer";
      destEl.innerHTML = `
        <div style="width:22px; height:22px; border-radius:8px; background:#171717; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
          B
        </div>
      `;

      const destPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -14],
        className: 'maplibre-custom-incident-popup'
      }).setHTML(`
        <div style="padding: 2px; display: flex; flex-direction: column; gap: 2px; min-width: 120px;">
          <div style="font-weight: 700; font-size: 11px; color: var(--text-main); display: flex; align-items: center; gap: 4px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:4px; background:#171717; color:#ffffff; font-size:9px; font-weight:800;">B</span>
            Point B (Destination)
          </div>
          <div style="font-size: 9px; font-family: monospace; color: var(--text-muted);">
            ${pathDest[0].toFixed(4)}° N, ${pathDest[1].toFixed(4)}° E
          </div>
        </div>
      `);

      destEl.addEventListener('mouseenter', () => {
        if (hoverPopupRef.current) hoverPopupRef.current.remove();
        destPopup.setLngLat([pathDest[1], pathDest[0]]).addTo(map);
        hoverPopupRef.current = destPopup;
      });
      destEl.addEventListener('mouseleave', () => {
        destPopup.remove();
        if (hoverPopupRef.current === destPopup) hoverPopupRef.current = null;
      });

      const destMarker = new maplibregl.Marker({ element: destEl })
        .setLngLat([pathDest[1], pathDest[0]])
        .addTo(map);
      markersRef.current.push(destMarker);
    }
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
      attributionControl: false, // Removes standard bottom-right attribution bar cleanly
      // Touch screen & pinch gesture controls:
      dragPan: true,
      touchZoomRotate: true, // Enables two-finger pinch-to-zoom and two-finger rotate
      touchPitch: true, // Enables two-finger swipe up/down to tilt 3D pitch
      doubleClickZoom: true,
      scrollZoom: true,
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

  // Register interactive map click handler for waypoint picking
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
      }
    };
    map.on('click', clickHandler);
    return () => {
      map.off('click', clickHandler);
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

  const prevCenterZoomRef = useRef<{ lat: number; lng: number; zoom: number }>({
    lat: center[0],
    lng: center[1],
    zoom,
  });

  // Update center & zoom if changed from outside with cinematic flight
  useEffect(() => {
    const prev = prevCenterZoomRef.current;
    const hasChanged =
      prev.lat !== center[0] ||
      prev.lng !== center[1] ||
      prev.zoom !== zoom;

    prevCenterZoomRef.current = { lat: center[0], lng: center[1], zoom };

    if (!hasChanged) return;

    const map = mapRef.current;
    if (map) {
      setIsCameraFlying(true);
      map.flyTo({
        center: [center[1], center[0]],
        zoom: zoom,
        duration: 2000,
        essential: true,
        curve: 1.42,
        speed: 1.2
      });

      const handleMoveEnd = () => {
        setIsCameraFlying(false);
      };

      map.once('moveend', handleMoveEnd);

      const timer = setTimeout(() => {
        map.off('moveend', handleMoveEnd);
        setIsCameraFlying(false);
      }, 2100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [center[0], center[1], zoom]);

  // Smoothly bloom halo layers when camera finishes flight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isCameraFlying) return;
    try {
      if (map.getLayer('selected-incident-halo-fill')) {
        map.setPaintProperty('selected-incident-halo-fill', 'fill-opacity', 0.16);
      }
      if (map.getLayer('selected-incident-halo-line')) {
        map.setPaintProperty('selected-incident-halo-line', 'line-opacity', 1);
      }
      if (map.getLayer('proximity-vector-layer')) {
        map.setPaintProperty('proximity-vector-layer', 'line-opacity', 0.75);
      }
    } catch (_) {}
  }, [isCameraFlying]);

  // Sync vector layers when relevant dependencies change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      syncLayers();
    } else {
      map.once('styledata', syncLayers);
      map.once('load', syncLayers);
    }
  }, [clusters, showHeatLayer, selectedClusterKey, selectedIncident, userLocation, activeRouteGeometry, envMode, isCameraFlying]);

  // Sync markers when incidents or selections change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    syncMarkers();
  }, [incidents, selectedIncident, envMode, userLocation, pathOrigin, pathDest]);

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


      {/* ── Professional Neo-Glass 3D GPU Camera Control Rack (Bottom-Right) ── */}
      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-6 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-color)] shadow-xl pointer-events-auto">
        {/* Zoom In (+) */}
        <Tooltip content="Zoom In (+ or Scroll)" position="left">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all duration-200 cursor-pointer"
            aria-label="Zoom in"
          >
            <Plus size={16} />
          </button>
        </Tooltip>

        {/* Zoom Out (-) */}
        <Tooltip content="Zoom Out (- or Scroll)" position="left">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all duration-200 cursor-pointer"
            aria-label="Zoom out"
          >
            <Minus size={16} />
          </button>
        </Tooltip>

        <div className="w-5 h-px bg-[var(--border-color)] my-0.5" />

        {/* 3D Z-Rotation & Orbit Drag Button (Hold & Drag to Orbit, Click to Toggle Tilt) */}
        <div className="relative">
          <Tooltip content="Hold & Drag for 3D Z-Rotation • Click to Tilt" position="left" disabled={isDraggingZ}>
            <button
              type="button"
              onPointerDown={handleZPointerDown}
              onPointerMove={handleZPointerMove}
              onPointerUp={handleZPointerUp}
              onPointerCancel={handleZPointerUp}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-grab active:cursor-grabbing select-none relative group ${
                isDraggingZ
                  ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-md'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'
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
                  <path d="M12 2.5 L19.5 6.8 L12 11 L4.5 6.8 Z" className={isDraggingZ ? "fill-current/20" : "fill-current/10"} />
                  <path d="M4.5 6.8 L4.5 15.5 L12 19.8 L12 11" />
                  <path d="M19.5 6.8 L19.5 15.5 L12 19.8" />
                  {/* Orbital curved rotation arrow around Z axis */}
                  <path d="M2.5 11 A9.5 5 0 0 0 21.5 11" strokeDasharray="2 1.5" strokeWidth="1.3" className="text-current" />
                </svg>
              </div>

              {/* Mini "3D" indicator badge on button */}
              <span className={`absolute -bottom-0.5 -right-0.5 text-[7px] font-mono font-black px-1 rounded-sm leading-tight ${
                isDraggingZ ? 'bg-[var(--bg-card)] text-[var(--text-main)]' : 'bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)]'
              }`}>
                3D
              </span>
            </button>
          </Tooltip>

          {/* Live Rotation HUD while dragging */}
          {isDraggingZ && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-xl bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] text-[10px] font-mono font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md pointer-events-none z-30">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)] animate-ping inline-block" />
              <span>Z-Orbit: {bearing}°</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span>Tilt: {pitch}°</span>
            </div>
          )}
        </div>

        {/* Rotate / Compass Reset (Authentic Marine / GIS Navigation Needle) */}
        <Tooltip content={bearing !== 0 ? `Reset North (Bearing: ${bearing}°)` : "Orient to True North"} position="left">
          <button
            type="button"
            onClick={handleResetBearing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all duration-200 cursor-pointer relative group"
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
                <circle cx="12" cy="11.5" r="1.8" className="fill-[var(--bg-card)] stroke-[var(--text-main)]" strokeWidth="1" />
                
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
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all duration-200 cursor-pointer"
            aria-label="Orbit left"
          >
            <RotateCcw size={15} />
          </button>
        </Tooltip>

        {/* Orbit Right */}
        <Tooltip content="Rotate Camera Right 45°" position="left">
          <button
            type="button"
            onClick={handleRotateRight}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all duration-200 cursor-pointer"
            aria-label="Orbit right"
          >
            <RotateCcw size={15} className="-scale-x-100" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
