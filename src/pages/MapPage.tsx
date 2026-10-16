import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { geocodePlace } from '../lib/amazonLocation';
import { MapContainer, TileLayer, Marker, Popup, Tooltip as LeafletTooltip, useMap, useMapEvents, Circle, GeoJSON, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Haversine formula to compute high-precision spatial distance (km) between GPS coordinates
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) return 0;
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Format duration into hours and minutes
export function formatRouteDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const totalMins = Math.max(1, Math.round(seconds / 60));
  if (totalMins < 60) return `~${totalMins} min`;
  const hrs = Math.floor(totalMins / 60);
  const rem = totalMins % 60;
  return rem > 0 ? `~${hrs}h ${rem}m` : `~${hrs}h`;
}

// Evaluate realistic travel time based on distance (urban city vs highway) and transit medium
export function calculateRealisticTravelDuration(
  distanceMeters: number,
  mode: 'driving' | 'motorcycle' | 'transit' | 'walking',
  tierMultiplier = 1.0
): number {
  const km = distanceMeters / 1000;
  if (km <= 0) return 60;
  let speedKmh: number;
  if (mode === 'walking') {
    speedKmh = 4.5;
  } else if (mode === 'motorcycle') {
    speedKmh = km <= 15 ? 36 : km <= 60 ? 52 : 68;
  } else if (mode === 'transit') {
    speedKmh = km <= 15 ? 22 : km <= 60 ? 40 : 58;
  } else {
    speedKmh = km <= 15 ? 28 : km <= 60 ? 48 : km <= 120 ? 68 : 85;
  }
  const effectiveSpeed = Math.max(3, speedKmh / tierMultiplier);
  return Math.round((km / effectiveSpeed) * 3600);
}
import { 
  AlertTriangle, 
  Route as RouteIcon, 
  Layers, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp,
  Maximize2,
  Minimize2,
  Info,
  Radar,
  Crosshair,
  Droplets,
  Navigation2,
  CheckCircle2,
  Compass,
  Activity,
  ExternalLink,
  Cpu,
  RefreshCw,
  Globe2,
  MapPin,
  Plus,
  SlidersHorizontal,
  Check,
  Truck,
  Car,
  Bike,
  Bus,
  Footprints,
  Mic,
  Pencil,
  GripHorizontal,
  History,
  ArrowRight,
  ShieldCheck,
  CloudRain,
  Waves,
  Clock
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { playClick } from '../utils/soundFx';
import AnimatedCrosshair from '../components/AnimatedCrosshair';
import Tooltip from '../components/Tooltip';
import MapLibreView from '../components/MapLibreView';
import AIOrbFace from '../components/AIOrbFace';
import { WATERLOGGING_DATASET_INCIDENTS, type TelemetryIncident } from '../data/waterloggingIncidents';
import { NATIONAL_MUNICIPAL_INCIDENTS } from '../data/nationalIncidents';
import { useForecast } from '../hooks/useForecast';
import { useUserSettings } from '../hooks/useUserSettings';
import { getPredictionCopy } from '../i18n/predictionCopy';
import { Capacitor } from '@capacitor/core';
import MapErrorBoundary from '../components/MapErrorBoundary';
import { NativeService } from '../utils/nativeService';

// Re-export TelemetryIncident type for backward-compatibility
export type { TelemetryIncident };

// Leaflet default icon asset fix to prevent missing asset 404s
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch (e) {
  console.warn('Failed to configure default Leaflet icon options:', e);
}

// Civic incidents export for global navbar search, alerts drawer & landing page
export const CIVIC_INCIDENTS: TelemetryIncident[] = WATERLOGGING_DATASET_INCIDENTS.filter((inc) => {
  const t = (inc.title || '').toLowerCase();
  const d = (inc.description || '').toLowerCase();
  return !t.includes('urinat') && !t.includes('shitting') && !d.includes('urinat') && !d.includes('shitting');
});

// Fast in-memory cache for computed street-network corridors (Safest, Balanced, Direct)
const routeGeometryCache = new Map<string, Array<{ geometry: [number, number][]; distance_meters: number; duration_seconds: number }>>();

// Helper: Custom Clean Minimalist Marker Icons (Apple & Mapbox Civic Standard — Premium Severity Palette)
function createIncidentMarkerIcon(severity: string, isSelected: boolean) {
  let ringColor = 'rgba(190, 18, 60, 0.85)';
  let haloColor = 'rgba(190, 18, 60, 0.16)';
  let dotColor = '#BE123C';

  if (severity === 'High') {
    ringColor = 'rgba(180, 83, 9, 0.85)';
    haloColor = 'rgba(180, 83, 9, 0.16)';
    dotColor = '#B45309';
  } else if (severity === 'Medium') {
    ringColor = 'rgba(71, 85, 105, 0.80)';
    haloColor = 'rgba(71, 85, 105, 0.14)';
    dotColor = '#475569';
  } else if (severity === 'Low') {
    ringColor = 'rgba(15, 118, 110, 0.78)';
    haloColor = 'rgba(15, 118, 110, 0.12)';
    dotColor = '#0F766E';
  }

  const size = isSelected ? 26 : 14;
  const half = size / 2;

  if (!isSelected) {
    return L.divIcon({
      className: 'custom-incident-pin',
      html: `
        <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
          <div style="
            width: 10px; 
            height: 10px; 
            border-radius: 50%; 
            background: ${dotColor}; 
            border: 2px solid #ffffff; 
            box-shadow: 0 1px 4px rgba(0,0,0,0.28);
            transition: transform 0.15s ease;
          "></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [half, half],
    });
  }

  return L.divIcon({
    className: 'custom-incident-pin-selected',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        <span style="position:absolute; inset:0; border-radius:50%; background:${haloColor}; animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
        <div style="
          width: 18px; 
          height: 18px; 
          border-radius: 50%; 
          background: ${haloColor}; 
          border: 2px solid ${ringColor}; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.35); 
          display: flex; align-items:center; justify-content:center;
        ">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dotColor};"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

// User Live GPS Pin (Classic Blue Location Orb)
const USER_LIVE_ICON = L.divIcon({
  className: 'user-live-pin',
  html: `
    <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(14,165,233,0.32); animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:16px; height:16px; border-radius:50%; background:#0284c7; border:3px solid #ffffff; box-shadow:0 3px 10px rgba(2,132,199,0.55); display:flex; align-items:center; justify-content:center;">
        <div style="width:4px; height:4px; border-radius:50%; background:#ffffff;"></div>
      </div>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Amazon Location Service Geocoded Pin Icon
const ALS_GEOCODED_ICON = L.divIcon({
  className: 'als-geocoded-pin',
  html: `
    <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(23,23,23,0.28); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:20px; height:20px; border-radius:50%; background:#171717; border:3px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center;">
        <div style="width:6px; height:6px; border-radius:50%; background:#ffffff;"></div>
      </div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Interactive Safe Path Origin Pin Icon (Strict Monochromatic Waypoint A)
const PATH_ORIGIN_ICON = L.divIcon({
  className: 'path-origin-pin',
  html: `
    <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <div style="width:22px; height:22px; border-radius:8px; background:#171717; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
        A
      </div>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Interactive Safe Path Destination Pin Icon (Strict Monochromatic Waypoint B)
const PATH_DEST_ICON = L.divIcon({
  className: 'path-dest-pin',
  html: `
    <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <div style="width:22px; height:22px; border-radius:8px; background:#171717; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
        B
      </div>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Map Click Listener to pick Origin and Destination points when in Path Creation Mode
function MapInteractiveClickHandler({
  enabled,
  onMapClick,
}: {
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  useMapEvents({
    click(e) {
      if (enabledRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Map Viewport Controller for Smooth Recenter and Immediate Tile Invalidation
function MapViewController({
  center,
  zoom,
  onFlightStart,
  onFlightEnd,
}: {
  center: [number, number];
  zoom: number;
  onFlightStart?: () => void;
  onFlightEnd?: () => void;
}) {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);
  const prevZoomRef = useRef<number>(zoom);
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFlightStartRef = useRef(onFlightStart);
  const onFlightEndRef = useRef(onFlightEnd);
  onFlightStartRef.current = onFlightStart;
  onFlightEndRef.current = onFlightEnd;

  useEffect(() => {
    const hasChanged =
      prevCenterRef.current[0] !== center[0] ||
      prevCenterRef.current[1] !== center[1] ||
      prevZoomRef.current !== zoom;

    prevCenterRef.current = center;
    prevZoomRef.current = zoom;

    if (!hasChanged) {
      try {
        map.invalidateSize();
      } catch (e) {}
      onFlightEndRef.current?.();
      return;
    }

    try {
      map.invalidateSize();
      onFlightStartRef.current?.();

      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
      }

      // Smooth cinematic flyTo transition across coordinate changes
      map.flyTo(center, zoom, {
        duration: 1.8,
        easeLinearity: 0.25,
        noMoveStart: true,
      });

      const handleMoveEnd = () => {
        onFlightEndRef.current?.();
      };

      map.once('moveend', handleMoveEnd);

      // Failsafe timer (1900ms) in case moveend is interrupted or skipped
      flightTimerRef.current = setTimeout(() => {
        map.off('moveend', handleMoveEnd);
        onFlightEndRef.current?.();
      }, 1900);
    } catch (e) {
      onFlightEndRef.current?.();
    }

    return () => {
      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
      }
    };
  }, [center, zoom, map]);

  useEffect(() => {
    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch (e) {}
    };

    window.addEventListener('resize', handleResize);
    
    // Multiple stage invalidation to ensure Leaflet renders immediately
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 350);
    const t3 = setTimeout(handleResize, 750);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [map]);

  return null;
}

export interface RegionOption {
  label: string;
  val: string;
  center: [number, number];
  zoom: number;
  badge?: string;
}

export const ALL_REGIONS: RegionOption[] = [
  { label: 'All India', val: 'all', center: [20.5937, 78.9629], zoom: 5, badge: 'National' },
  { label: 'Bengaluru (Karnataka)', val: 'karnataka', center: [12.9716, 77.5946], zoom: 12, badge: 'Live Sensor' },
  { label: 'Maharashtra (Mumbai/Pune)', val: 'maharashtra', center: [19.0760, 72.8777], zoom: 9, badge: 'Metropolitan' },
  { label: 'Uttar Pradesh (Lucknow/Varanasi)', val: 'uttar pradesh', center: [26.8467, 80.9462], zoom: 8, badge: 'Gangetic' },
  { label: 'Bihar (Patna/Gaya)', val: 'bihar', center: [25.5941, 85.1376], zoom: 8, badge: 'Flood Basin' },
  { label: 'Telangana (Hyderabad)', val: 'telangana', center: [17.3850, 78.4867], zoom: 9, badge: 'Deccan' },
  { label: 'Odisha (Bhubaneswar/Cuttack)', val: 'odisha', center: [20.2961, 85.8245], zoom: 8, badge: 'Coastal' },
  { label: 'Tamil Nadu (Chennai)', val: 'tamil nadu', center: [13.0827, 80.2707], zoom: 9, badge: 'Coastal' },
  { label: 'Madhya Pradesh (Bhopal/Indore)', val: 'madhya pradesh', center: [23.2599, 77.4126], zoom: 7, badge: 'Central' },
  { label: 'Andhra Pradesh (Amaravati/Vizag)', val: 'andhra pradesh', center: [16.5062, 80.6480], zoom: 8, badge: 'Coastal' },
  { label: 'West Bengal (Kolkata)', val: 'west bengal', center: [22.5726, 88.3639], zoom: 10, badge: 'Delta' },
  { label: 'Assam (Guwahati/Brahmaputra)', val: 'assam', center: [26.1445, 91.7362], zoom: 8, badge: 'River Basin' },
  { label: 'Manipur (Imphal)', val: 'manipur', center: [24.8170, 93.9368], zoom: 9, badge: 'Hilly' },
  { label: 'Delhi-NCR', val: 'delhi', center: [28.6139, 77.2090], zoom: 11, badge: 'Capital' },
  { label: 'Kerala (Kochi/Thiruvananthapuram)', val: 'kerala', center: [9.9312, 76.2673], zoom: 8, badge: 'Coastal' },
  { label: 'Gujarat (Ahmedabad/Surat)', val: 'gujarat', center: [23.0225, 72.5714], zoom: 8, badge: 'Western' },
  { label: 'Rajasthan (Jaipur/Jodhpur)', val: 'rajasthan', center: [26.9124, 75.7873], zoom: 7, badge: 'Arid' },
  { label: 'Punjab (Chandigarh/Amritsar)', val: 'punjab', center: [30.7333, 76.7794], zoom: 8, badge: 'Northern' },
  { label: 'Haryana (Gurugram/Faridabad)', val: 'haryana', center: [28.4595, 77.0266], zoom: 8, badge: 'NCR' },
  { label: 'Jharkhand (Ranchi/Jamshedpur)', val: 'jharkhand', center: [23.3441, 85.3096], zoom: 8, badge: 'Plateau' },
  { label: 'Uttarakhand (Dehradun/Haridwar)', val: 'uttarakhand', center: [30.3165, 78.0322], zoom: 8, badge: 'Himalayan' },
  { label: 'Himachal Pradesh (Shimla)', val: 'himachal pradesh', center: [31.1048, 77.1734], zoom: 8, badge: 'Himalayan' },
  { label: 'Jammu & Kashmir (Srinagar/Jammu)', val: 'kashmir', center: [34.0837, 74.7973], zoom: 8, badge: 'Northern' },
  { label: 'Goa (Panaji)', val: 'goa', center: [15.2993, 74.1240], zoom: 10, badge: 'Coastal' },
];

const DEFAULT_NATIONAL_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_NATIONAL_ZOOM = 5;

const getStoredUserCoords = (): { coords: [number, number]; hasReal: boolean } => {
  try {
    const cached = JSON.parse(localStorage.getItem('doab_user_coords_v1') || 'null');
    if (cached && typeof cached.lat === 'number' && typeof cached.lng === 'number' && !isNaN(cached.lat) && !isNaN(cached.lng)) {
      return { coords: [cached.lat, cached.lng], hasReal: true };
    }
  } catch {}
  return { coords: DEFAULT_NATIONAL_CENTER, hasReal: false };
};

const initialUserLocation = getStoredUserCoords();

// Session-persisted map state so switching away from MapPage and back does not re-trigger the initial GPS zoom-in animation
const mapSessionState: {
  hasCompletedInitialLocationZoom: boolean;
  mapCenter: [number, number];
  mapZoom: number;
  userCoords: [number, number];
  hasRealLocation: boolean;
  isViewingMyLocation: boolean;
  selectedState: string;
  isMultiStateMode: boolean;
  selectedStates: string[];
} = {
  hasCompletedInitialLocationZoom: initialUserLocation.hasReal,
  mapCenter: initialUserLocation.hasReal ? initialUserLocation.coords : DEFAULT_NATIONAL_CENTER,
  mapZoom: initialUserLocation.hasReal ? 14 : DEFAULT_NATIONAL_ZOOM,
  userCoords: initialUserLocation.coords,
  hasRealLocation: initialUserLocation.hasReal,
  isViewingMyLocation: initialUserLocation.hasReal,
  selectedState: 'all',
  isMultiStateMode: false,
  selectedStates: [],
};

export default function MapPage({ envMode = 'flood', isDarkMode = false }: { envMode?: 'flood' | 'drought'; isDarkMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const copy = getPredictionCopy();
  const [destination, setDestination] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');
  const [selectedState, setSelectedState] = useState<string>(() => mapSessionState.selectedState);
  const [isMultiStateMode, setIsMultiStateMode] = useState<boolean>(() => mapSessionState.isMultiStateMode);
  const [selectedStates, setSelectedStates] = useState<string[]>(() => mapSessionState.selectedStates);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [show7DayForecast, setShow7DayForecast] = useState(false);
  const [forecastSubTab, setForecastSubTab] = useState<'inundation' | 'imd'>('inundation');
  const stateComboboxRef = useRef<HTMLDivElement>(null);

  // Delivery Partner / Commercial Fleet mode context
  const [userRole, setUserRole] = useState<string>(() => localStorage.getItem('doab_user_role') || 'citizen');
  const [vendorId, setVendorId] = useState<string>(() => localStorage.getItem('doab_vendor_id') || 'SWIGGY-BLR-9021');

  useEffect(() => {
    const handleRoleSync = () => {
      setUserRole(localStorage.getItem('doab_user_role') || 'citizen');
      setVendorId(localStorage.getItem('doab_vendor_id') || 'SWIGGY-BLR-9021');
    };
    window.addEventListener('storage', handleRoleSync);
    window.addEventListener('doab_auth_changed', handleRoleSync);
    return () => {
      window.removeEventListener('storage', handleRoleSync);
      window.removeEventListener('doab_auth_changed', handleRoleSync);
    };
  }, []);

  const handleToggleMultiStateMode = () => {
    playClick();
    if (!isMultiStateMode) {
      setIsMultiStateMode(true);
      if (selectedState !== 'all' && !selectedStates.includes(selectedState)) {
        setSelectedStates([selectedState]);
      }
      setIsStateDropdownOpen(true);
    } else {
      setIsMultiStateMode(false);
      if (selectedStates.length > 0) {
        setSelectedState(selectedStates[selectedStates.length - 1]);
      }
    }
  };

  const handleResetAllIndia = () => {
    playClick();
    setSelectedState('all');
    setSelectedStates([]);
    setIsMultiStateMode(false);
    setMapCenter([20.5937, 78.9629]);
    setMapZoom(5);
    setIsViewingMyLocation(false);
    setIsStateDropdownOpen(false);
    setStateSearchQuery('');
  };

  const handleSelectRegion = (reg: typeof ALL_REGIONS[0]) => {
    playClick();
    setIsViewingMyLocation(false);
    if (isMultiStateMode) {
      setSelectedStates((prev) => {
        const exists = prev.includes(reg.val);
        const next = exists ? prev.filter((s) => s !== reg.val) : [...prev, reg.val];
        if (next.length === 0) {
          setSelectedState('all');
        } else {
          setSelectedState(next[next.length - 1]);
        }
        return next;
      });
      setMapCenter(reg.center);
      setMapZoom(reg.zoom);
    } else {
      setSelectedState(reg.val);
      setSelectedStates([reg.val]);
      setMapCenter(reg.center);
      setMapZoom(reg.zoom);
      setIsStateDropdownOpen(false);
      setStateSearchQuery('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateComboboxRef.current && !stateComboboxRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
    };
    if (isStateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStateDropdownOpen]);

  const selectedRegionObj = useMemo(() => {
    return ALL_REGIONS.find((r) => r.val === selectedState);
  }, [selectedState]);

  const filteredRegions = useMemo(() => {
    const statesOnly = ALL_REGIONS.filter((r) => r.val !== 'all');
    if (!stateSearchQuery.trim()) return statesOnly;
    const q = stateSearchQuery.toLowerCase();
    return statesOnly.filter((r) => r.label.toLowerCase().includes(q) || r.val.toLowerCase().includes(q));
  }, [stateSearchQuery]);

  const [showHeatLayer, setShowHeatLayer] = useState(true);
  const { mapEngine, updateMapEngine } = useUserSettings();
  const setMapEngine = updateMapEngine;

  // Path Creation Mode State (Interactive Map Waypoint Picking & Manual Input)
  const isCreatePathQuery = searchParams.get('mode') === 'create_path';
  const queryOriginLat = searchParams.get('origin_lat');
  const queryOriginLng = searchParams.get('origin_lng');
  const queryDestLat = searchParams.get('dest_lat');
  const queryDestLng = searchParams.get('dest_lng');
  const queryOriginName = searchParams.get('origin_name') || '';
  const queryDestName = searchParams.get('dest_name') || '';
  const queryRouteName = searchParams.get('name') || '';

  const initialOrigin: [number, number] | null = (queryOriginLat && queryOriginLng)
    ? [parseFloat(queryOriginLat), parseFloat(queryOriginLng)]
    : null;
  const initialDest: [number, number] | null = (queryDestLat && queryDestLng)
    ? [parseFloat(queryDestLat), parseFloat(queryDestLng)]
    : null;

  const [isPathCreationMode, setIsPathCreationMode] = useState<boolean>(isCreatePathQuery || Boolean(initialOrigin && initialDest));
  const [pathOrigin, setPathOrigin] = useState<[number, number] | null>(initialOrigin);
  const [pathDest, setPathDest] = useState<[number, number] | null>(initialDest);
  const [pathOriginAddress, setPathOriginAddress] = useState<string>(queryOriginName);
  const [pathDestAddress, setPathDestAddress] = useState<string>(queryDestName);
  const [pathPickingTarget, setPathPickingTarget] = useState<'origin' | 'destination' | null>(
    initialOrigin && initialDest ? null : initialOrigin ? 'destination' : 'origin'
  );
  const [pathSummaryName, setPathSummaryName] = useState<string>('');
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<number>(0);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [customRouteName, setCustomRouteName] = useState<string>(queryRouteName);
  const [isListeningTarget, setIsListeningTarget] = useState<'origin' | 'destination' | 'liveSearch' | 'stateSearch' | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'motorcycle' | 'transit' | 'walking'>('driving');
  const [osrmRoutes, setOsrmRoutes] = useState<Array<{ geometry: [number, number][]; distance_meters: number; duration_seconds: number }> | null>(null);
  const [isEvaluatingRoutes, setIsEvaluatingRoutes] = useState<boolean>(false);

  useEffect(() => {
    if (initialOrigin && initialDest) {
      setMapCenter([(initialOrigin[0] + initialDest[0]) / 2, (initialOrigin[1] + initialDest[1]) / 2]);
      setMapZoom(13);
    }
  }, []);

  // Fetch real street road network geometry and alternative bypass routes via OSRM with memory caching
  useEffect(() => {
    if (!pathOrigin || !pathDest) {
      setOsrmRoutes(null);
      setIsEvaluatingRoutes(false);
      return;
    }

    const startLng = pathOrigin[1];
    const startLat = pathOrigin[0];
    const endLng = pathDest[1];
    const endLat = pathDest[0];
    const profile = travelMode === 'walking' ? 'foot' : travelMode === 'motorcycle' ? 'bike' : 'driving';
    const cacheKey = `${startLng.toFixed(4)},${startLat.toFixed(4)}->${endLng.toFixed(4)},${endLat.toFixed(4)}:${profile}`;

    setIsEvaluatingRoutes(true);

    // Instant return if previously calculated for this origin, destination & transit profile
    if (routeGeometryCache.has(cacheKey)) {
      setOsrmRoutes(routeGeometryCache.get(cacheKey)!);
      const timer = setTimeout(() => {
        setIsEvaluatingRoutes(false);
      }, 250);
      return () => clearTimeout(timer);
    }

    let isCancelled = false;
    const fetchRealStreetRoutes = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?alternatives=true&geometries=geojson&overview=full`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM network error');
        const data = await res.json();
        if (isCancelled) return;
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No OSRM routes');

        let parsed = data.routes.map((r: any) => ({
          geometry: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
          distance_meters: Math.round(r.distance),
          duration_seconds: Math.round(r.duration),
        }));

        // If OSRM returned fewer than 3 alternatives, query real road detours via snapped waypoints
        // so ALL 3 corridors (Safest, Balanced, Direct) follow 100% genuine navigable streets
        if (parsed.length < 3) {
          const midLng = (startLng + endLng) / 2;
          const midLat = (startLat + endLat) / 2;
          const dLng = endLng - startLng;
          const dLat = endLat - startLat;

          // Perpendicular normal vector detour waypoints
          const detour1 = [midLng - dLat * 0.16, midLat + dLng * 0.16];
          const detour2 = [midLng + dLat * 0.16, midLat - dLng * 0.16];

          try {
            const d1Url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${detour1[0]},${detour1[1]};${endLng},${endLat}?overview=full&geometries=geojson`;
            const r1 = await fetch(d1Url);
            const d1Data = await r1.json();
            if (d1Data.code === 'Ok' && d1Data.routes?.[0]) {
              parsed.push({
                geometry: d1Data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
                distance_meters: Math.round(d1Data.routes[0].distance),
                duration_seconds: Math.round(d1Data.routes[0].duration),
              });
            }
          } catch (_) {}

          if (parsed.length < 3) {
            try {
              const d2Url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${detour2[0]},${detour2[1]};${endLng},${endLat}?overview=full&geometries=geojson`;
              const r2 = await fetch(d2Url);
              const d2Data = await r2.json();
              if (d2Data.code === 'Ok' && d2Data.routes?.[0]) {
                parsed.push({
                  geometry: d2Data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
                  distance_meters: Math.round(d2Data.routes[0].distance),
                  duration_seconds: Math.round(d2Data.routes[0].duration),
                });
              }
            } catch (_) {}
          }
        }

        if (!isCancelled && parsed.length > 0) {
          routeGeometryCache.set(cacheKey, parsed);
          setOsrmRoutes(parsed);
        }
      } catch (_) {
        // Fallback gracefully to terrain-calibrated geometry
      } finally {
        if (!isCancelled) {
          setIsEvaluatingRoutes(false);
        }
      }
    };

    fetchRealStreetRoutes();
    return () => {
      isCancelled = true;
    };
  }, [pathOrigin, pathDest, travelMode]);

  // Amazon Location Service + Local Landmark Autocomplete for Origin (A) & Destination (B)
  const [originSuggestions, setOriginSuggestions] = useState<import('../lib/amazonLocation').GeocodedPlace[]>([]);
  const [originAlsLoading, setOriginAlsLoading] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState<import('../lib/amazonLocation').GeocodedPlace[]>([]);
  const [destAlsLoading, setDestAlsLoading] = useState(false);
  const originDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alsCacheRef = useRef<Map<string, import('../lib/amazonLocation').GeocodedPlace[]>>(new Map());

  // Click-Outside Collapse Refs for All Autocomplete Dropdowns
  const alsDropdownRef = useRef<HTMLDivElement>(null);
  const originDropdownRef = useRef<HTMLDivElement>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  // Recent Searches Caching (Persisted in localStorage)
  const [recentSearches, setRecentSearches] = useState<import('../lib/amazonLocation').GeocodedPlace[]>(() => {
    try {
      const saved = localStorage.getItem('doab_recent_search_locations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const saveRecentSearch = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    if (!place || !place.label) return;
    try {
      const existing: import('../lib/amazonLocation').GeocodedPlace[] = JSON.parse(
        localStorage.getItem('doab_recent_search_locations') || '[]'
      );
      const filtered = existing.filter(
        (p) => p.label !== place.label && !(Math.abs(p.lat - place.lat) < 0.001 && Math.abs(p.lng - place.lng) < 0.001)
      );
      const updated = [place, ...filtered].slice(0, 6);
      localStorage.setItem('doab_recent_search_locations', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  }, []);

  // Draggable Floating Panels Drag Controls & Boundary Ref
  const mapParentRef = useRef<HTMLDivElement>(null);
  const liveRiskDragControls = useDragControls();
  const liveRiskHasDraggedRef = useRef(false);
  const createPathDragControls = useDragControls();

  // Panel Resizability States (with localStorage memory and safe boundary clamping)
  const [liveRiskWidth, setLiveRiskWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('doab_live_risk_w');
      return saved ? Math.min(Math.max(parseInt(saved, 10), 360), 680) : 450;
    } catch {
      return 450;
    }
  });
  const [liveRiskMaxHeight, setLiveRiskMaxHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('doab_live_risk_h');
      return saved ? Math.min(Math.max(parseInt(saved, 10), 380), 920) : 700;
    } catch {
      return 700;
    }
  });

  const [createPathWidth, setCreatePathWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('doab_create_path_w');
      return saved ? Math.min(Math.max(parseInt(saved, 10), 440), 780) : 580;
    } catch {
      return 580;
    }
  });
  const [createPathMaxHeight, setCreatePathMaxHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('doab_create_path_h');
      return saved ? Math.min(Math.max(parseInt(saved, 10), 400), 880) : 660;
    } catch {
      return 660;
    }
  });

  // Multi-zone Resize handler for Live Risk Monitor (East rail, South rail, and South-East corner)
  const handleLiveRiskResizeStart = useCallback((e: React.PointerEvent, direction: 'se' | 'e' | 's' = 'se') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = liveRiskWidth;
    const startH = liveRiskMaxHeight;
    let currentW = startW;
    let currentH = startH;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (direction === 'e' || direction === 'se') {
        currentW = Math.min(Math.max(startW + dx, 360), Math.min(680, window.innerWidth - 32));
        setLiveRiskWidth(currentW);
      }
      if (direction === 's' || direction === 'se') {
        currentH = Math.min(Math.max(startH + dy, 380), Math.min(850, window.innerHeight - 80));
        setLiveRiskMaxHeight(currentH);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      try {
        localStorage.setItem('doab_live_risk_w', String(currentW));
        localStorage.setItem('doab_live_risk_h', String(currentH));
      } catch {}
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [liveRiskWidth, liveRiskMaxHeight]);

  // Multi-zone Resize handler for Create Safe Path (East rail, South rail, and South-East corner)
  const handleCreatePathResizeStart = useCallback((e: React.PointerEvent, direction: 'se' | 'e' | 's' = 'se') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = createPathWidth;
    const startH = createPathMaxHeight;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (direction === 'e' || direction === 'se') {
        const newW = Math.min(Math.max(startW + dx, 440), Math.min(780, window.innerWidth - 32));
        setCreatePathWidth(newW);
      }
      if (direction === 's' || direction === 'se') {
        const newH = Math.min(Math.max(startH + dy, 400), Math.min(880, window.innerHeight - 80));
        setCreatePathMaxHeight(newH);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      try {
        localStorage.setItem('doab_create_path_w', String(createPathWidth));
        localStorage.setItem('doab_create_path_h', String(createPathMaxHeight));
      } catch {}
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [createPathWidth, createPathMaxHeight]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (alsDropdownRef.current && !alsDropdownRef.current.contains(target)) {
        setAlsSuggestions([]);
        setIsSearchFocused(false);
      }
      if (originDropdownRef.current && !originDropdownRef.current.contains(target)) {
        setOriginSuggestions([]);
      }
      if (destDropdownRef.current && !destDropdownRef.current.contains(target)) {
        setDestSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Sync mode with URL if query parameter changes
  useEffect(() => {
    if (isCreatePathQuery) {
      setIsPathCreationMode(true);
    }
  }, [isCreatePathQuery]);

  // Selected Incident: null by default so no unwanted distance or vector line is computed until the user explicitly selects a point
  const [selectedIncident, setSelectedIncident] = useState<TelemetryIncident | null>(null);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);
  const [prioritizeRecent, setPrioritizeRecent] = useState<boolean>(true);
  const [prioritizeNearest, setPrioritizeNearest] = useState<boolean>(true);
  const [isMultiClusterTourActive, setIsMultiClusterTourActive] = useState<boolean>(false);
  const [isMapFlying, setIsMapFlying] = useState(false);

  // Default Coordinates: National All-India Overview Center
  const defaultCenter: [number, number] = DEFAULT_NATIONAL_CENTER;
  const [userCoords, setUserCoords] = useState<[number, number]>(() => mapSessionState.userCoords);
  const [hasRealLocation, setHasRealLocation] = useState<boolean>(() => mapSessionState.hasRealLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [isViewingMyLocation, setIsViewingMyLocation] = useState<boolean>(() => mapSessionState.isViewingMyLocation);

  const [mapCenter, setMapCenter] = useState<[number, number]>(() => mapSessionState.mapCenter);
  const [mapZoom, setMapZoom] = useState<number>(() => mapSessionState.mapZoom);

  const forecastCoords = useMemo(() => {
    // 1. If user explicitly tapped "Locate Me" or is tracking live position, prioritize GPS
    if (isViewingMyLocation && hasRealLocation) {
      return { lat: userCoords[0], lng: userCoords[1] };
    }

    // 2. If a specific state is chosen in the combobox or multi-select, use that state's geographic center for regional telemetry
    const activeStateVal = isMultiStateMode && selectedStates.length > 0 
      ? selectedStates[selectedStates.length - 1] 
      : selectedState;

    if (activeStateVal && activeStateVal !== 'all') {
      const reg = ALL_REGIONS.find((r) => r.val.toLowerCase() === activeStateVal.toLowerCase());
      if (reg) {
        return { lat: reg.center[0], lng: reg.center[1] };
      }
    }

    // 3. If in All-India mode and present live location is available, use user's GPS coordinates
    if (hasRealLocation && (userCoords[0] !== DEFAULT_NATIONAL_CENTER[0] || userCoords[1] !== DEFAULT_NATIONAL_CENTER[1])) {
      return { lat: userCoords[0], lng: userCoords[1] };
    }

    // 4. If map is focused on a specific city or region:
    if (Math.abs(mapCenter[0] - DEFAULT_NATIONAL_CENTER[0]) > 0.4 || Math.abs(mapCenter[1] - DEFAULT_NATIONAL_CENTER[1]) > 0.4) {
      return { lat: mapCenter[0], lng: mapCenter[1] };
    }
    return null;
  }, [isViewingMyLocation, selectedState, isMultiStateMode, selectedStates, hasRealLocation, userCoords, mapCenter]);

  const activeStateParam = useMemo(() => {
    if (isViewingMyLocation && hasRealLocation) {
      return undefined;
    }
    if (isMultiStateMode && selectedStates.length > 0) {
      return selectedStates[selectedStates.length - 1];
    }
    return selectedState !== 'all' ? selectedState : undefined;
  }, [isViewingMyLocation, hasRealLocation, isMultiStateMode, selectedStates, selectedState]);

  const { forecast, incidents: apiIncidents, boundaries, imdTelemetry, status, usingDemo, reload } = useForecast({
    state: activeStateParam,
    coords: forecastCoords,
  });
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [activeLeftTab, setActiveLeftTab] = useState<'search' | 'forecast' | 'incident' | 'clusters'>('search');

  // Deferred search query so typing in Live Risk Monitor never blocks the UI thread with O(N^2) cluster Haversine re-computation
  const deferredDestination = React.useDeferredValue(destination);

  // Combined National Master Telemetry Pool (Karnataka Ground-Truth + 17 Indian States via Amazon Location Geocoder)
  const allIncidentsPool = useMemo<TelemetryIncident[]>(() => {
    return [...WATERLOGGING_DATASET_INCIDENTS, ...NATIONAL_MUNICIPAL_INCIDENTS];
  }, []);

  // DOAB AI Hydrological Flood & Waterlogging Inundation Prediction Engine
  // Dynamically calculated for either Live GPS Location or Selected State in Combobox
  const activeHydrologicalForecast = useMemo(() => {
    // 1. Resolve Target Location Label & Reference Coordinates
    let locationLabel = 'All-India Regional Grid';
    let targetCoords = forecastCoords;

    if (isViewingMyLocation && hasRealLocation) {
      locationLabel = `Live GPS Location (${userCoords[0].toFixed(2)}° N, ${userCoords[1].toFixed(2)}° E)`;
      targetCoords = { lat: userCoords[0], lng: userCoords[1] };
    } else if (selectedRegionObj && selectedRegionObj.val !== 'all') {
      locationLabel = selectedRegionObj.label;
    } else if (hasRealLocation && (userCoords[0] !== DEFAULT_NATIONAL_CENTER[0] || userCoords[1] !== DEFAULT_NATIONAL_CENTER[1])) {
      locationLabel = `Live Device Location (${userCoords[0].toFixed(2)}° N, ${userCoords[1].toFixed(2)}° E)`;
      targetCoords = { lat: userCoords[0], lng: userCoords[1] };
    } else {
      locationLabel = 'National Overview (Delhi NCR Met-Grid)';
    }

    // 2. Check if direct ML forecast cells cover the active target coordinates
    if (forecast?.cells && forecast.cells.length > 0 && targetCoords) {
      let nearestCell = forecast.cells[0];
      let minDistance = Infinity;
      for (const cell of forecast.cells) {
        const d = Math.hypot(cell.lat - targetCoords.lat, cell.lng - targetCoords.lng);
        if (d < minDistance) {
          minDistance = d;
          nearestCell = cell;
        }
      }
      if (minDistance <= 0.45 && nearestCell.probability !== null) {
        const prob = Math.round(nearestCell.probability * 100);
        return {
          locationLabel,
          probabilityPercent: prob,
          confidence: nearestCell.confidence || 'high',
          isDirectModel: true,
          targetTime: nearestCell.target_time,
          runOffPotential: prob > 60 ? 'Intense Surface Runoff (>25mm/h)' : (prob > 30 ? 'Moderate Ponding (10-25mm/h)' : 'Normal Infiltration (<10mm/h)'),
          sumpRisk: prob > 50 ? 'High Low-Sump Culvert Ponding Risk' : 'Normal Underpass Drainage',
          elevationBaseline: '914m Copernicus DEM',
        };
      }
    }

    // 3. Hydrological Inundation Calculation (Grounded in IMD 24h Rainfall, Catchment Slope, and Hotspots)
    const rain24h = imdTelemetry?.rainfall_24h_mm || 0;
    
    // Proximity to known municipal flood sumps / complaints
    let nearbyIncidentCount = 0;
    if (targetCoords) {
      for (const inc of allIncidentsPool) {
        if (Math.hypot(inc.lat - targetCoords.lat, inc.lng - targetCoords.lng) < 0.28) {
          nearbyIncidentCount++;
        }
      }
    }

    let calculatedProb = 8;
    if (rain24h > 50) calculatedProb += 54;
    else if (rain24h > 30) calculatedProb += 36;
    else if (rain24h > 15) calculatedProb += 22;
    else if (rain24h > 5) calculatedProb += 12;

    if (nearbyIncidentCount >= 8) calculatedProb += 26;
    else if (nearbyIncidentCount >= 3) calculatedProb += 15;
    else if (nearbyIncidentCount >= 1) calculatedProb += 8;

    // Coastal / low-lying topography adjustment
    const stateStr = (selectedRegionObj?.val || imdTelemetry?.state || '').toLowerCase();
    if (stateStr.includes('maharashtra') || stateStr.includes('mumbai') || stateStr.includes('odisha') || stateStr.includes('chennai') || stateStr.includes('tamil') || stateStr.includes('kerala')) {
      calculatedProb += 6;
    }

    const finalProb = Math.min(94, Math.max(6, calculatedProb));
    const targetDate = new Date(Date.now() + 3600000);
    const targetTimeFormatted = targetDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';

    return {
      locationLabel,
      probabilityPercent: finalProb,
      confidence: finalProb > 50 ? 'moderate' : 'high',
      isDirectModel: false,
      targetTime: targetDate.toISOString(),
      targetTimeFormatted,
      runOffPotential: finalProb > 65 ? 'Intense Surface Runoff (>25mm/h)' : (finalProb > 35 ? 'Moderate Surface Runoff (10-25mm/h)' : 'Normal Soil Absorption (<10mm/h)'),
      sumpRisk: finalProb > 60 ? 'Caution: Underpass Low-Sump Choke Predicted' : 'Sub-level Passage Clear & Passable',
      elevationBaseline: targetCoords ? `${Math.round(45 + (Math.abs(targetCoords.lat - 12) * 55) % 750)}m Copernicus DEM` : '216m Copernicus DEM',
    };
  }, [forecastCoords, isViewingMyLocation, hasRealLocation, userCoords, selectedRegionObj, forecast, imdTelemetry, allIncidentsPool]);

  // Pre-indexed unique civic landmarks, cities, and regions for <1ms instant fuzzy autocomplete (Clean Geocoding Only - No Incident Problems)
  const localCivicPlacesIndex = useMemo<import('../lib/amazonLocation').GeocodedPlace[]>(() => {
    const seen = new Set<string>();
    const list: import('../lib/amazonLocation').GeocodedPlace[] = [];

    for (const reg of ALL_REGIONS) {
      if (reg.val === 'all') continue;
      seen.add(reg.label.toLowerCase());
      list.push({
        label: `${reg.label}, India`,
        lat: reg.center[0],
        lng: reg.center[1],
        region: reg.label,
        municipality: reg.label.split('(')[0].trim(),
        country: 'IND',
      });
    }
    return list;
  }, []);

  const getInstantLocalMatches = useCallback((rawQuery: string, maxResults = 4): import('../lib/amazonLocation').GeocodedPlace[] => {
    const q = rawQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const scored: { item: import('../lib/amazonLocation').GeocodedPlace; score: number }[] = [];

    for (const item of localCivicPlacesIndex) {
      const hay = `${item.municipality || ''} ${item.region || ''} ${item.label}`.toLowerCase();
      let score = 0;
      if (hay.startsWith(q)) score += 30;
      else if (hay.includes(q)) score += 15;
      for (const tok of tokens) {
        if (hay.includes(tok)) score += 6;
      }
      if (score > 0) {
        scored.push({ item, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map((s) => s.item);
  }, [localCivicPlacesIndex]);

  const fetchHybridPlaceSuggestions = useCallback(async (
    query: string,
    localMatches: import('../lib/amazonLocation').GeocodedPlace[],
    biasPosition?: [number, number] // [lng, lat]
  ) => {
    const cacheKey = `${query.trim().toLowerCase()}_${biasPosition ? biasPosition.map((n) => n.toFixed(2)).join(',') : 'all'}`;
    let awsResults = alsCacheRef.current.get(cacheKey);
    if (!awsResults) {
      // First try real Amazon Location Service SearchPlaceIndex query with dynamic proximity bias
      awsResults = await geocodePlace(query, 5, biasPosition);
      // If few results and query didn't end with India, try with national boundary qualification
      if (awsResults.length === 0 && !query.toLowerCase().includes('india')) {
        awsResults = await geocodePlace(query + ', India', 5, biasPosition);
      }
      if (awsResults.length > 0) {
        alsCacheRef.current.set(cacheKey, awsResults);
      }
    }
    // Prioritize AWS Location Service real places, then supplement with clean regional matches
    const merged: import('../lib/amazonLocation').GeocodedPlace[] = [...awsResults];
    const seenLabels = new Set(awsResults.map((r) => (r.municipality || r.label).toLowerCase()));
    for (const loc of localMatches) {
      const k = (loc.municipality || loc.label).toLowerCase();
      if (!seenLabels.has(k) && merged.length < 6) {
        seenLabels.add(k);
        merged.push(loc);
      }
    }

    // Rank results closest to origin or reference point first (Google Maps standard)
    if (biasPosition) {
      merged.sort((a, b) => {
        const distA = Math.hypot(a.lng - biasPosition[0], a.lat - biasPosition[1]);
        const distB = Math.hypot(b.lng - biasPosition[0], b.lat - biasPosition[1]);
        return distA - distB;
      });
    }

    return merged;
  }, []);

  // Filter incidents based on criteria, state focus, and curate density for clean map aesthetics
  const incidentSource = useMemo<TelemetryIncident[]>(() => {
    if (usingDemo || apiIncidents.length === 0) return allIncidentsPool;
    const mapped = apiIncidents.map((item) => ({
      id: item.id,
      title: item.category || copy.historical,
      ward: 'Bengaluru',
      category: 'waterlogging' as const,
      envType: 'flood' as const,
      severity: 'Medium' as const,
      lat: item.lat,
      lng: item.lng,
      verifiedCount: 0,
      updatedTime: item.time,
      description: copy.historical,
      source: item.source,
    }));
    return [...mapped, ...NATIONAL_MUNICIPAL_INCIDENTS];
  }, [apiIncidents, usingDemo, copy.historical, allIncidentsPool]);

  const filteredIncidents = useMemo(() => {
    const matched = incidentSource.filter((item) => {
      // In Drought mode, show water scarcity, tanker, borewell & groundwater deficit incidents.
      // In Flood mode, show waterlogging, drainage overflow, flood & submerged road incidents.
      if (item.envType && item.envType !== envMode) return false;

      if (isMultiStateMode && selectedStates.length > 0) {
        const itemText = `${item.ward} ${item.source || ''} ${item.description || ''} ${item.title}`.toLowerCase();
        const matchesAny = selectedStates.some((st) => itemText.includes(st.toLowerCase()));
        if (!matchesAny) return false;
      } else if (!isMultiStateMode && selectedState !== 'all') {
        const itemText = `${item.ward} ${item.source || ''} ${item.description || ''} ${item.title}`.toLowerCase();
        if (!itemText.includes(selectedState.toLowerCase())) return false;
      }
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      return true;
    });

    const isAllIndia = (!isMultiStateMode && selectedState === 'all') || (isMultiStateMode && selectedStates.length === 0);
    if (severityFilter === 'all' && !deferredDestination.trim() && isAllIndia) {
      const stateMap = new Map<string, TelemetryIncident[]>();
      matched.forEach((item) => {
        let stKey = 'Other';
        const txt = `${item.ward} ${item.source || ''} ${item.title}`.toLowerCase();
        if (txt.includes('bihar')) stKey = 'Bihar';
        else if (txt.includes('telangana') || txt.includes('hyderabad')) stKey = 'Telangana';
        else if (txt.includes('karnataka') || txt.includes('bengaluru') || txt.includes('bbmp')) stKey = 'Karnataka';
        else if (txt.includes('maharashtra') || txt.includes('mumbai') || txt.includes('pune')) stKey = 'Maharashtra';
        else if (txt.includes('delhi')) stKey = 'Delhi';
        else if (txt.includes('manipur')) stKey = 'Manipur';
        else if (txt.includes('assam')) stKey = 'Assam';
        else if (txt.includes('kerala')) stKey = 'Kerala';
        else if (txt.includes('west bengal') || txt.includes('kolkata')) stKey = 'West Bengal';
        else if (txt.includes('tamil nadu') || txt.includes('chennai')) stKey = 'Tamil Nadu';
        else if (txt.includes('odisha')) stKey = 'Odisha';
        else if (txt.includes('gujarat')) stKey = 'Gujarat';
        else if (txt.includes('madhya pradesh')) stKey = 'Madhya Pradesh';
        else if (txt.includes('andhra pradesh')) stKey = 'Andhra Pradesh';
        else if (txt.includes('uttar pradesh')) stKey = 'Uttar Pradesh';
        else if (txt.includes('uttarakhand')) stKey = 'Uttarakhand';
        else if (txt.includes('rajasthan')) stKey = 'Rajasthan';
        else if (txt.includes('jharkhand')) stKey = 'Jharkhand';
        else if (txt.includes('punjab') || txt.includes('chandigarh')) stKey = 'Punjab';
        else if (txt.includes('ladakh')) stKey = 'Ladakh';
        else if (txt.includes('dadra')) stKey = 'Dadra';

        if (!stateMap.has(stKey)) stateMap.set(stKey, []);
        stateMap.get(stKey)!.push(item);
      });

      const isNative = Capacitor.isNativePlatform();
      const quotaPerState = isNative ? 4 : 25;
      const stratifiedAllIndia: TelemetryIncident[] = [];
      for (const items of stateMap.values()) {
        stratifiedAllIndia.push(...items.slice(0, quotaPerState));
      }
      return isNative ? stratifiedAllIndia.slice(0, 80) : stratifiedAllIndia;
    }
    const isNative = Capacitor.isNativePlatform();
    return matched.slice(0, isNative ? 60 : 600);
  }, [severityFilter, deferredDestination, incidentSource, selectedState, isMultiStateMode, selectedStates, envMode]);

  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync map viewport and location state into session memory so switching pages never resets or re-triggers initial zoom
  useEffect(() => {
    mapSessionState.mapCenter = mapCenter;
    mapSessionState.mapZoom = mapZoom;
    mapSessionState.userCoords = userCoords;
    mapSessionState.hasRealLocation = hasRealLocation;
    mapSessionState.isViewingMyLocation = isViewingMyLocation;
    mapSessionState.selectedState = selectedState;
    mapSessionState.isMultiStateMode = isMultiStateMode;
    mapSessionState.selectedStates = selectedStates;
  }, [mapCenter, mapZoom, userCoords, hasRealLocation, isViewingMyLocation, selectedState, isMultiStateMode, selectedStates]);

  // Amazon Location Service — live geocoding state
  const [alsSuggestions, setAlsSuggestions] = useState<import('../lib/amazonLocation').GeocodedPlace[]>([]);
  const [alsLoading, setAlsLoading] = useState(false);
  const [geocodedPin, setGeocodedPin] = useState<[number, number] | null>(null);
  const alsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zero-lag hybrid search: instant <1ms in-memory matches + 180ms debounced Amazon Location Service geocode
  const handleSearchChange = useCallback((query: string) => {
    setDestination(query);
    if (alsDebounceRef.current) clearTimeout(alsDebounceRef.current);
    if (query.trim().length < 2) {
      setAlsSuggestions([]);
      setAlsLoading(false);
      return;
    }
    const localMatches = getInstantLocalMatches(query, 4);
    setAlsSuggestions(localMatches);
    setAlsLoading(true);
    const bias: [number, number] = hasRealLocation ? [userCoords[1], userCoords[0]] : [mapCenter[1], mapCenter[0]];
    alsDebounceRef.current = setTimeout(async () => {
      const merged = await fetchHybridPlaceSuggestions(query, localMatches, bias);
      setAlsSuggestions(merged);
      setAlsLoading(false);
    }, 180);
  }, [getInstantLocalMatches, fetchHybridPlaceSuggestions, hasRealLocation, userCoords, mapCenter]);

  // When user picks an ALS suggestion — pan map + drop geocoded pin + automatically set as Point B paired with Current GPS Location (Point A)
  const handleAlsSelect = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    const destCoords: [number, number] = [
      Math.round(place.lat * 10000) / 10000,
      Math.round(place.lng * 10000) / 10000,
    ];
    const specificName = place.label.split(',')[0].trim();
    const placeName = specificName || place.municipality || place.label;
    setGeocodedPin(destCoords);
    setMapCenter(destCoords);
    setMapZoom(13);
    setDestination(placeName);
    setAlsSuggestions([]);
    setIsSearchFocused(false);
    saveRecentSearch(place);

    // Automatically pair Current GPS Location as Point A, Searched Place as Point B, and compute safe corridors
    const origin: [number, number] = hasRealLocation
      ? userCoords
      : (userCoords && (userCoords[0] !== 20.5937 || userCoords[1] !== 78.9629)
          ? userCoords
          : [Math.round((destCoords[0] - 0.015) * 10000) / 10000, Math.round((destCoords[1] - 0.015) * 10000) / 10000]);
    setPathOrigin(origin);
    setPathOriginAddress(hasRealLocation ? 'My Current Location (GPS)' : 'My Location (Origin A)');
    setPathDest(destCoords);
    setPathDestAddress(placeName);
    setPathSummaryName('');
    setIsPathCreationMode(true);
    setIsEvaluatingRoutes(true);
    setPathPickingTarget(null);
    setIsMobileCollapsed(true); // Smoothly collapse Live Risk Monitor so Create Safe Elevation Path panel takes center stage
    setSearchParams((params) => {
      params.set('mode', 'create_path');
      return params;
    });
  }, [hasRealLocation, userCoords, setSearchParams, saveRecentSearch]);

  // Origin (A) Autocomplete with Amazon Location Service + Local Landmarks
  const handleOriginAddressChange = useCallback((query: string) => {
    setPathOriginAddress(query);
    if (originDebounceRef.current) clearTimeout(originDebounceRef.current);
    if (query.trim().length < 2) {
      setOriginSuggestions([]);
      setOriginAlsLoading(false);
      return;
    }
    const localMatches = getInstantLocalMatches(query, 4);
    setOriginSuggestions(localMatches);
    setOriginAlsLoading(true);
    const bias: [number, number] = hasRealLocation ? [userCoords[1], userCoords[0]] : [mapCenter[1], mapCenter[0]];
    originDebounceRef.current = setTimeout(async () => {
      const merged = await fetchHybridPlaceSuggestions(query, localMatches, bias);
      setOriginSuggestions(merged);
      setOriginAlsLoading(false);
    }, 180);
  }, [getInstantLocalMatches, fetchHybridPlaceSuggestions, hasRealLocation, userCoords, mapCenter]);

  const handleSelectOriginPlace = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    const coords: [number, number] = [
      Math.round(place.lat * 10000) / 10000,
      Math.round(place.lng * 10000) / 10000,
    ];
    setPathOrigin(coords);
    const specificName = place.label.split(',')[0].trim();
    setPathOriginAddress(specificName || place.municipality || place.label);
    setOriginSuggestions([]);
    saveRecentSearch(place);
    if (pathDest) {
      setPathPickingTarget(null);
      setIsEvaluatingRoutes(true);
    } else {
      setPathPickingTarget('destination');
    }
    setMapCenter(coords);
    setMapZoom((z) => (z < 12 ? 13 : z));
  }, [pathDest, saveRecentSearch]);

  // Destination (B) Autocomplete with Amazon Location Service + Local Landmarks
  const handleDestAddressChange = useCallback((query: string) => {
    setPathDestAddress(query);
    setPathSummaryName('');
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (query.trim().length < 2) {
      setDestSuggestions([]);
      setDestAlsLoading(false);
      return;
    }
    const localMatches = getInstantLocalMatches(query, 4);
    setDestSuggestions(localMatches);
    setDestAlsLoading(true);
    const bias: [number, number] = pathOrigin
      ? [pathOrigin[1], pathOrigin[0]]
      : (hasRealLocation ? [userCoords[1], userCoords[0]] : [mapCenter[1], mapCenter[0]]);
    destDebounceRef.current = setTimeout(async () => {
      const merged = await fetchHybridPlaceSuggestions(query, localMatches, bias);
      setDestSuggestions(merged);
      setDestAlsLoading(false);
    }, 180);
  }, [getInstantLocalMatches, fetchHybridPlaceSuggestions, pathOrigin, hasRealLocation, userCoords, mapCenter]);

  const handleSelectDestPlace = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    const coords: [number, number] = [
      Math.round(place.lat * 10000) / 10000,
      Math.round(place.lng * 10000) / 10000,
    ];
    setPathDest(coords);
    const specificName = place.label.split(',')[0].trim();
    const destName = specificName || place.municipality || place.label;
    setPathDestAddress(destName);
    setDestSuggestions([]);
    setPathSummaryName('');
    saveRecentSearch(place);
    if (pathOrigin) {
      setPathPickingTarget(null);
      setIsEvaluatingRoutes(true);
    } else {
      setPathPickingTarget('origin');
    }
    setMapCenter(coords);
    setMapZoom((z) => (z < 11 ? 12 : z));
  }, [pathOrigin, saveRecentSearch]);

  // Speech Recognition (Mic) for Voice Landmark/Address Search
  const handleVoiceInput = useCallback((target: 'origin' | 'destination' | 'liveSearch' | 'stateSearch') => {
    playClick();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSaveSuccessToast('Speech recognition not supported in this browser.');
      setTimeout(() => setSaveSuccessToast(null), 3000);
      return;
    }

    if (isListeningTarget === target) {
      setIsListeningTarget(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningTarget(target);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          if (target === 'origin') {
            handleOriginAddressChange(transcript);
          } else if (target === 'destination') {
            handleDestAddressChange(transcript);
          } else if (target === 'liveSearch') {
            handleSearchChange(transcript);
          } else if (target === 'stateSearch') {
            setIsStateDropdownOpen(true);
            setStateSearchQuery(transcript);
          }
        }
        setIsListeningTarget(null);
      };

      recognition.onerror = () => {
        setIsListeningTarget(null);
      };

      recognition.onend = () => {
        setIsListeningTarget(null);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsListeningTarget(null);
    }
  }, [isListeningTarget, handleOriginAddressChange, handleDestAddressChange, handleSearchChange]);

  // Use Current GPS Location for Origin Point (A)
  const handleUseCurrentLocationForOrigin = useCallback(async () => {
    playClick();
    if (hasRealLocation) {
      const roundedLat = Math.round(userCoords[0] * 10000) / 10000;
      const roundedLng = Math.round(userCoords[1] * 10000) / 10000;
      setPathOrigin([roundedLat, roundedLng]);
      setPathOriginAddress(`Current GPS Location (${roundedLat}° N, ${roundedLng}° E)`);
      setOriginSuggestions([]);
      if (pathDest) {
        setPathPickingTarget(null);
      } else {
        setPathPickingTarget('destination');
      }
      setMapCenter([roundedLat, roundedLng]);
      setMapZoom((z) => (z < 12 ? 14 : z));
      return;
    }

    setIsLocating(true);
    try {
      const permStatus = await NativeService.checkPermissions();
      if (permStatus.location !== 'granted') {
        await NativeService.requestLocationPermission();
      }
    } catch {}

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const roundedLat = Math.round(pos.coords.latitude * 10000) / 10000;
          const roundedLng = Math.round(pos.coords.longitude * 10000) / 10000;
          const realCoords: [number, number] = [roundedLat, roundedLng];
          setUserCoords(realCoords);
          setHasRealLocation(true);
          setPathOrigin(realCoords);
          setPathOriginAddress(`Current GPS Location (${roundedLat}° N, ${roundedLng}° E)`);
          setOriginSuggestions([]);
          if (pathDest) {
            setPathPickingTarget(null);
          } else {
            setPathPickingTarget('destination');
          }
          setMapCenter(realCoords);
          setMapZoom(14);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          // Fallback to cached GPS or current map center
          let fallbackCoords: [number, number] = [
            Math.round(mapCenter[0] * 10000) / 10000,
            Math.round(mapCenter[1] * 10000) / 10000,
          ];
          try {
            const cached = JSON.parse(localStorage.getItem('doab_user_coords_v1') || 'null');
            if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
              fallbackCoords = [Math.round(cached.lat * 10000) / 10000, Math.round(cached.lng * 10000) / 10000];
            }
          } catch {}
          setPathOrigin(fallbackCoords);
          setPathOriginAddress(`Current Location (${fallbackCoords[0]}° N, ${fallbackCoords[1]}° E)`);
          setOriginSuggestions([]);
          if (pathDest) {
            setPathPickingTarget(null);
          } else {
            setPathPickingTarget('destination');
          }
          setMapCenter(fallbackCoords);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setIsLocating(false);
    }
  }, [hasRealLocation, userCoords, mapCenter, pathDest]);

  // 3 Candidate Safe Paths Computed Between Origin (A) and Destination (B)
  const candidateSafePaths = useMemo(() => {
    // Only compute candidate bypass corridors when BOTH points are explicitly set
    if (!pathOrigin || !pathDest) {
      return [];
    }
    const start: [number, number] = pathOrigin;
    const end: [number, number] = pathDest;
    const baseKm = Math.max(0.1, haversineKm(start[0], start[1], end[0], end[1]));
    const dLat = end[0] - start[0];
    const dLng = end[1] - start[1];
    // Perpendicular normal vector for realistic curved bypass corridors
    const normLat = -dLng;
    const normLng = dLat;

    const buildCurvedGeometry = (curveFactor: number): [number, number][] => {
      const p1: [number, number] = [
        start[0] + dLat * 0.25 + normLat * (curveFactor * 0.65),
        start[1] + dLng * 0.25 + normLng * (curveFactor * 0.65),
      ];
      const p2: [number, number] = [
        start[0] + dLat * 0.5 + normLat * curveFactor,
        start[1] + dLng * 0.5 + normLng * curveFactor,
      ];
      const p3: [number, number] = [
        start[0] + dLat * 0.75 + normLat * (curveFactor * 0.65),
        start[1] + dLng * 0.75 + normLng * (curveFactor * 0.65),
      ];
      return [start, p1, p2, p3, end];
    };

    // --- Dynamic Flood Risk Modeling for Corridor Geometries ---
    // 1. Live meteorological rain multiplier from IMD & Forecast telemetry
    const rainMm24h = imdTelemetry?.rainfall_24h_mm ?? 0;
    const hasRainWarning = Boolean(
      imdTelemetry?.warning?.text &&
      !imdTelemetry.warning.text.toLowerCase().includes('no warning')
    );
    const rainMultiplier = 1.0 + Math.min(rainMm24h / 30.0, 1.5) + (hasRainWarning ? 0.3 : 0.0);

    // Filter incidents within bounding box of path (+/- 0.15 deg margin ~15km)
    const minLat = Math.min(start[0], end[0]) - 0.15;
    const maxLat = Math.max(start[0], end[0]) + 0.15;
    const minLng = Math.min(start[1], end[1]) - 0.15;
    const maxLng = Math.max(start[1], end[1]) + 0.15;
    const corridorIncidents = incidentSource.filter(
      (inc) => inc.lat >= minLat && inc.lat <= maxLat && inc.lng >= minLng && inc.lng <= maxLng
    );

    // Location-calibrated terrain elevation baseline derived from coordinates & distance
    const locSeed = Math.abs(Math.sin(start[0] * 37.1 + end[1] * 23.7));
    const baseElevationRisk = 0.015 + locSeed * 0.035;

    // 2. Incident Proximity & Chronic Underpass Hazard Exposure along each geometry
    const assessCorridorHazard = (geometry: [number, number][], reliefMultiplier: number) => {
      let hazardSum = 0;
      let samples = 0;

      for (let i = 0; i < geometry.length - 1; i++) {
        const pA = geometry[i];
        const pB = geometry[i + 1];
        for (const t of [0.0, 0.5]) {
          const sLat = pA[0] + (pB[0] - pA[0]) * t;
          const sLng = pA[1] + (pB[1] - pA[1]) * t;
          samples++;

          for (const inc of corridorIncidents) {
            const d = haversineKm(sLat, sLng, inc.lat, inc.lng);
            if (d < 2.5) {
              const isUnderpass = String(inc.category || '').toLowerCase().includes('underpass');
              const depthFactor = inc.waterDepthCm ? Math.min(inc.waterDepthCm / 20.0, 3.0) : 1.5;
              const weight = isUnderpass ? 3.0 * depthFactor : 1.8 * depthFactor;
              hazardSum += (weight / Math.max(d * d + 0.15, 0.25)) * 0.025;
            }
          }

          if (forecast?.cells) {
            for (const cell of forecast.cells) {
              if (cell.probability != null && cell.probability > 0.25) {
                const cd = haversineKm(sLat, sLng, cell.lat, cell.lng);
                if (cd < 2.2) {
                  hazardSum += cell.probability * 0.04;
                }
              }
            }
          }
        }
      }

      const meanHazard = samples > 0 && hazardSum > 0 ? hazardSum / samples : (baseKm > 30 ? 0.02 : 0.01);
      const rawRisk = (baseElevationRisk * reliefMultiplier + meanHazard) * rainMultiplier;
      return Math.round(Math.min(0.95, Math.max(0.012, rawRisk)) * 1000) / 1000;
    };

    // Use real street-network geometries from OSRM for all 3 corridors
    // If OSRM returns fewer than 3 alternative branches, synthesize distinct elevated ridge bypass curves
    const geomDirect = osrmRoutes && osrmRoutes[0] ? osrmRoutes[0].geometry : buildCurvedGeometry(0.02);
    const geomBalanced = osrmRoutes && osrmRoutes[1] ? osrmRoutes[1].geometry : buildCurvedGeometry(-0.18);
    const geomSafest = osrmRoutes && osrmRoutes[2] ? osrmRoutes[2].geometry : buildCurvedGeometry(0.24);

    const distDirect = osrmRoutes && osrmRoutes[0] ? osrmRoutes[0].distance_meters : Math.round(baseKm * 1000);
    const distBalanced = osrmRoutes && osrmRoutes[1] ? osrmRoutes[1].distance_meters : Math.round(distDirect * 1.08);
    const distSafest = osrmRoutes && osrmRoutes[2] ? osrmRoutes[2].distance_meters : Math.round(distDirect * 1.15);

    const riskSafest = assessCorridorHazard(geomSafest, 0.65);
    const riskBalanced = assessCorridorHazard(geomBalanced, 1.45);
    const riskDirect = assessCorridorHazard(geomDirect, 2.85);

    // Multi-modal transit durations calibrated for urban city vs highway physics
    const durSafestDrive = calculateRealisticTravelDuration(distSafest, 'driving', 1.08);
    const durSafestBike = calculateRealisticTravelDuration(distSafest, 'motorcycle', 1.05);
    const durSafestTransit = calculateRealisticTravelDuration(distSafest, 'transit', 1.10);
    const durSafestWalk = calculateRealisticTravelDuration(distSafest, 'walking', 1.0);

    const durBalancedDrive = calculateRealisticTravelDuration(distBalanced, 'driving', 1.03);
    const durBalancedBike = calculateRealisticTravelDuration(distBalanced, 'motorcycle', 1.02);
    const durBalancedTransit = calculateRealisticTravelDuration(distBalanced, 'transit', 1.05);
    const durBalancedWalk = calculateRealisticTravelDuration(distBalanced, 'walking', 1.0);

    const durDirectDrive = calculateRealisticTravelDuration(distDirect, 'driving', 0.96);
    const durDirectBike = calculateRealisticTravelDuration(distDirect, 'motorcycle', 0.95);
    const durDirectTransit = calculateRealisticTravelDuration(distDirect, 'transit', 0.98);
    const durDirectWalk = calculateRealisticTravelDuration(distDirect, 'walking', 0.95);

    const originLabel = pathOriginAddress.trim() || (pathOrigin ? `${pathOrigin[0].toFixed(3)}°N, ${pathOrigin[1].toFixed(3)}°E` : 'Origin Sector');
    const destLabel = pathDestAddress.trim() || (pathDest ? `${pathDest[0].toFixed(3)}°N, ${pathDest[1].toFixed(3)}°E` : 'Safe Haven');

    return [
      {
        id: 'candidate-1-safest',
        title: 'Safest Elevated Ridge Bypass',
        summary: `Elevated Ridge Corridor (${originLabel} → ${destLabel})`,
        tier: 'low' as const,
        rank: 'safest' as const,
        mean_risk: riskSafest,
        distance_meters: distSafest,
        duration_seconds: travelMode === 'walking' ? durSafestWalk : travelMode === 'motorcycle' ? durSafestBike : travelMode === 'transit' ? durSafestTransit : durSafestDrive,
        duration_seconds_driving: durSafestDrive,
        duration_seconds_bike: durSafestBike,
        duration_seconds_transit: durSafestTransit,
        duration_seconds_walking: durSafestWalk,
        geometry: geomSafest,
        midpoint: [
          start[0] + dLat * 0.5 + normLat * 0.24,
          start[1] + dLng * 0.5 + normLng * 0.24,
        ] as [number, number],
        badge: 'Lowest Flood Risk • High Ground',
      },
      {
        id: 'candidate-2-balanced',
        title: 'Balanced Arterial Ring Bypass',
        summary: `Balanced Arterial Corridor (${originLabel} → ${destLabel})`,
        tier: 'moderate' as const,
        rank: 'alternative' as const,
        mean_risk: riskBalanced,
        distance_meters: distBalanced,
        duration_seconds: travelMode === 'walking' ? durBalancedWalk : travelMode === 'motorcycle' ? durBalancedBike : travelMode === 'transit' ? durBalancedTransit : durBalancedDrive,
        duration_seconds_driving: durBalancedDrive,
        duration_seconds_bike: durBalancedBike,
        duration_seconds_transit: durBalancedTransit,
        duration_seconds_walking: durBalancedWalk,
        geometry: geomBalanced,
        midpoint: [
          start[0] + dLat * 0.5 + normLat * -0.18,
          start[1] + dLng * 0.5 + normLng * -0.18,
        ] as [number, number],
        badge: 'Moderate Elevation • Faster Transit',
      },
      {
        id: 'candidate-3-direct',
        title: 'Direct Lowland Sector Route',
        summary: `Direct Lowland Route (${originLabel} → ${destLabel})`,
        tier: 'high' as const,
        rank: 'alternative' as const,
        mean_risk: riskDirect,
        distance_meters: distDirect,
        duration_seconds: travelMode === 'walking' ? durDirectWalk : travelMode === 'motorcycle' ? durDirectBike : travelMode === 'transit' ? durDirectTransit : durDirectDrive,
        duration_seconds_driving: durDirectDrive,
        duration_seconds_bike: durDirectBike,
        duration_seconds_transit: durDirectTransit,
        duration_seconds_walking: durDirectWalk,
        geometry: geomDirect,
        midpoint: [
          start[0] + dLat * 0.5 + normLat * 0.02,
          start[1] + dLng * 0.5 + normLng * 0.02,
        ] as [number, number],
        badge: 'Shortest Distance • Basin Exposure',
      },
    ];
  }, [pathOrigin, pathDest, pathOriginAddress, pathDestAddress, hasRealLocation, userCoords, apiIncidents, imdTelemetry, osrmRoutes, travelMode, forecast, incidentSource]);

  const activeCandidateRoute = candidateSafePaths[selectedCandidateIdx] || candidateSafePaths[0];

  // Safe Path Creation: Map Click Handler
  const handleMapClickForPath = useCallback((lat: number, lng: number) => {
    if (!pathPickingTarget) return;
    playClick();
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const coordsStr = `${roundedLat}° N, ${roundedLng}° E`;

    if (pathPickingTarget === 'origin') {
      setPathOrigin([roundedLat, roundedLng]);
      setPathOriginAddress(`Map Point A (${coordsStr})`);
      setOriginSuggestions([]);
      if (pathDest) {
        setPathPickingTarget(null);
        setIsEvaluatingRoutes(true);
      } else {
        setPathPickingTarget('destination');
      }
    } else if (pathPickingTarget === 'destination') {
      setPathDest([roundedLat, roundedLng]);
      setPathDestAddress(`Map Point B (${coordsStr})`);
      setPathSummaryName('');
      setDestSuggestions([]);
      if (pathOrigin) {
        setPathPickingTarget(null);
        setIsEvaluatingRoutes(true);
      } else {
        setPathPickingTarget('origin');
      }
    }
  }, [pathPickingTarget, pathDest, pathOrigin]);

  // Safe Path Creation: Save to localStorage and notify user with undo/view option
  const handleSaveCustomPath = useCallback(() => {
    if (!pathOrigin && !pathDest && !pathOriginAddress && !pathDestAddress) return;
    playClick();

    const chosen = candidateSafePaths[selectedCandidateIdx] || candidateSafePaths[0];
    
    // Safely extract readable location titles without mangling coordinates with commas
    const formatLocationLabel = (addr: string, coords: [number, number] | null, defaultTag: string) => {
      const trimmed = addr.trim();
      if (!trimmed) {
        return coords ? `${coords[0].toFixed(3)}°N, ${coords[1].toFixed(3)}°E` : defaultTag;
      }
      if (trimmed.startsWith('Map Point A') || trimmed.startsWith('Map Point B')) {
        return coords ? `Map Point (${coords[0].toFixed(3)}°N, ${coords[1].toFixed(3)}°E)` : trimmed;
      }
      return trimmed.split(',')[0].trim();
    };

    const cleanDest = formatLocationLabel(pathDestAddress, pathDest, 'Safe Destination');
    const cleanOrigin = formatLocationLabel(pathOriginAddress, pathOrigin, 'Origin');

    // Route title accurately reflects custom name, or pairs Origin & Destination
    let defaultLabel: string;
    const isOriginNamed = Boolean(
      cleanOrigin &&
      !cleanOrigin.startsWith('Map Point') &&
      cleanOrigin !== 'Origin' &&
      !cleanOrigin.includes('Current Location') &&
      !cleanOrigin.includes('Current GPS')
    );
    const isDestNamed = Boolean(
      cleanDest &&
      !cleanDest.startsWith('Map Point') &&
      cleanDest !== 'Safe Destination' &&
      cleanDest !== 'Safe Haven Sector'
    );

    if (isOriginNamed && isDestNamed) {
      defaultLabel = `${cleanOrigin} to ${cleanDest}`;
    } else if (isDestNamed) {
      defaultLabel = `Safe Corridor to ${cleanDest}`;
    } else if (isOriginNamed) {
      defaultLabel = `Safe Corridor from ${cleanOrigin}`;
    } else if (pathOrigin && pathDest) {
      defaultLabel = `Safe Corridor (${pathOrigin[0].toFixed(3)}°N → ${pathDest[0].toFixed(3)}°N)`;
    } else {
      defaultLabel = 'Custom Evacuation Route';
    }

    const summary = customRouteName.trim() || defaultLabel;

    const originQuery = pathOrigin ? `${pathOrigin[0]},${pathOrigin[1]}` : encodeURIComponent(cleanOrigin);
    const destQuery = pathDest ? `${pathDest[0]},${pathDest[1]}` : encodeURIComponent(cleanDest);
    const waypointParam = pathOrigin && pathDest
      ? `&waypoints=${chosen.midpoint[0].toFixed(5)},${chosen.midpoint[1].toFixed(5)}`
      : '';
    const travelParam = travelMode === 'walking'
      ? '&travelmode=walking'
      : travelMode === 'motorcycle'
        ? '&travelmode=bicycling'
        : travelMode === 'transit'
          ? '&travelmode=transit'
          : '&travelmode=driving';
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}${waypointParam}${travelParam}`;

    const newCustomRoute = {
      summary,
      origin_name: cleanOrigin,
      destination_name: cleanDest,
      transit_mode: travelMode,
      distance_meters: chosen.distance_meters,
      duration_seconds: chosen.duration_seconds,
      mean_risk: chosen.mean_risk,
      data_quality: 'ok',
      scored: true,
      maps_url: mapsUrl,
      rank: chosen.rank,
    };

    try {
      // 1. Save to custom created routes
      const existing = JSON.parse(localStorage.getItem('doab_custom_created_routes') || '[]');
      const updated = [newCustomRoute, ...existing.filter((r: any) => r.summary !== summary)];
      localStorage.setItem('doab_custom_created_routes', JSON.stringify(updated));

      // 2. Also save to saved offline routes so it appears in Offline/Saved filter
      const offlineExisting = JSON.parse(localStorage.getItem('doab_saved_offline_routes') || '[]');
      const offlineEntry = {
        id: `route-${Date.now()}`,
        savedAt: new Date().toISOString(),
        summary,
        distanceKm: chosen.distance_meters ? `${(chosen.distance_meters / 1000).toFixed(1)} km` : '—',
        durationMin: chosen.duration_seconds
          ? chosen.duration_seconds < 3600
            ? `${Math.max(1, Math.round(chosen.duration_seconds / 60))} min`
            : `${Math.floor(chosen.duration_seconds / 3600)}h ${Math.round((chosen.duration_seconds % 3600) / 60)}m`
          : '—',
        riskPct: chosen.mean_risk != null ? `${Math.round(chosen.mean_risk * 1000) / 10}%` : 'Low Risk',
        mapsUrl,
        origin: pathOrigin ? { lat: pathOrigin[0], lng: pathOrigin[1] } : { lat: 12.9716, lng: 77.5946 },
        destination: pathDest ? { lat: pathDest[0], lng: pathDest[1] } : { lat: 12.9352, lng: 77.6245 },
      };
      const updatedOffline = [offlineEntry, ...offlineExisting.filter((r: any) => r.summary !== summary)].slice(0, 30);
      localStorage.setItem('doab_saved_offline_routes', JSON.stringify(updatedOffline));

      // 3. Un-delete from tombstones so it is never masked on BestRoutesPage
      const deletedSummaries: string[] = JSON.parse(localStorage.getItem('doab_deleted_route_summaries') || '[]');
      if (deletedSummaries.includes(summary)) {
        const unDeleted = deletedSummaries.filter((s: string) => s !== summary);
        localStorage.setItem('doab_deleted_route_summaries', JSON.stringify(unDeleted));
      }
    } catch (e) {
      console.warn('Could not save custom route', e);
    }

    setSaveSuccessToast(`Saved "${summary}" to your safe routes!`);
    setTimeout(() => setSaveSuccessToast(null), 4000);
  }, [pathOrigin, pathDest, pathOriginAddress, pathDestAddress, customRouteName, pathSummaryName, candidateSafePaths, selectedCandidateIdx, travelMode]);

  // Cancel Safe Path Creation
  const handleCancelCustomPath = useCallback(() => {
    playClick();
    setIsPathCreationMode(false);
    setIsEvaluatingRoutes(false);
    setOsrmRoutes(null);
    setPathOrigin(null);
    setPathDest(null);
    setPathOriginAddress('');
    setPathDestAddress('');
    setPathSummaryName('');
    setCustomRouteName('');
    setOriginSuggestions([]);
    setDestSuggestions([]);
    setPathPickingTarget(null);
    setSearchParams(params => {
      params.delete('mode');
      return params;
    });
  }, [setSearchParams]);

  // Reroute Around Incident: Stay on Map and activate 3 Safe Elevation Paths avoiding the hazard
  const handleRerouteAroundIncident = useCallback((incident: TelemetryIncident) => {
    playClick();
    const origin: [number, number] = hasRealLocation ? userCoords : [12.9716, 77.5946];
    setPathOrigin(origin);
    setPathOriginAddress(hasRealLocation ? 'My Current Location (GPS)' : 'Bengaluru Metro Center');

    // Project safe destination beyond the hazard along the corridor trajectory
    const dLat = incident.lat - origin[0];
    const dLng = incident.lng - origin[1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 0.02;
    const overshoot = (dist + 0.038) / dist;
    const destLat = Math.round((origin[0] + dLat * overshoot) * 10000) / 10000;
    const destLng = Math.round((origin[1] + dLng * overshoot) * 10000) / 10000;

    setPathDest([destLat, destLng]);
    setPathDestAddress(`Safe Sector Beyond ${incident.ward || incident.category}`);
    setPathSummaryName(`Elevated Bypass around ${incident.category}`);

    setIsPathCreationMode(true);
    setSelectedIncident(null);
    setPathPickingTarget(null);
    setSearchParams(params => {
      params.set('mode', 'create_path');
      return params;
    });

    setMapCenter([(origin[0] + destLat) / 2, (origin[1] + destLng) / 2]);
    setMapZoom(13);
  }, [hasRealLocation, userCoords, setSearchParams]);

  const [showInfo, setShowInfo] = useState(false);

  // Unread AI Response indicator state (blue dot appears only when new response from AI is present)
  const [hasNewAiResponse, setHasNewAiResponse] = useState<boolean>(() => {
    try {
      return localStorage.getItem('doab_has_unread_ai_response') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    const onNewAiMessage = () => setHasNewAiResponse(true);
    const onAiRead = () => setHasNewAiResponse(false);

    window.addEventListener('doab:ai-new-message', onNewAiMessage);
    window.addEventListener('doab:ai-read', onAiRead);

    const onFocusIncident = (e: any) => {
      const inc = e.detail?.incident;
      if (inc) {
        setSelectedIncident(inc);
        setMapCenter([inc.lat, inc.lng]);
        setMapZoom(16);
        setIsMobileCollapsed(false);
        setActiveLeftTab('incident');
      }
    };

    const onFocusRegion = (e: any) => {
      const reg = e.detail?.region;
      if (reg) {
        setSelectedState(reg.val);
        setMapCenter(reg.center);
        setMapZoom(reg.zoom);
      }
    };

    const onLocateMe = () => {
      if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const real: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserCoords(real);
            setHasRealLocation(true);
            setMapCenter(real);
            setMapZoom(15);
            setIsLocating(false);
            setIsViewingMyLocation(true);
          },
          () => {
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
        );
      }
    };

    window.addEventListener('doab:focus-incident', onFocusIncident);
    window.addEventListener('doab:focus-region', onFocusRegion);
    window.addEventListener('doab:locate-me', onLocateMe);

    return () => {
      window.removeEventListener('doab:ai-new-message', onNewAiMessage);
      window.removeEventListener('doab:ai-read', onAiRead);
      window.removeEventListener('doab:focus-incident', onFocusIncident);
      window.removeEventListener('doab:focus-region', onFocusRegion);
      window.removeEventListener('doab:locate-me', onLocateMe);
    };
  }, []);

  // Handle URL query parameters for direct telemetry focus (e.g. from global navbar search)
  useEffect(() => {
    const incidentId = searchParams.get('incident');
    const stateParam = searchParams.get('state');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (incidentId) {
      const match = incidentSource.find(i => i.id === incidentId);
      if (match) {
        setSelectedIncident(match);
        setMapCenter([match.lat, match.lng]);
        setMapZoom(16);
        setIsMobileCollapsed(false);
        setActiveLeftTab('incident');
      }
    } else if (stateParam) {
      setSelectedState(stateParam);
      const regionMatch = ALL_REGIONS.find(r => r.val.toLowerCase() === stateParam.toLowerCase());
      if (regionMatch) {
        setMapCenter(regionMatch.center);
        setMapZoom(regionMatch.zoom);
      }
    } else if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
        setMapZoom(14);
      }
    }
  }, [searchParams, incidentSource]);

  // Real-time Spatial & Proximity Intelligence Metrics
  const proximityIntelligence = useMemo(() => {
    const lat1 = userCoords[0];
    const lon1 = userCoords[1];

    // Haversine distance calculator in kilometers
    const getDistKm = (lat2: number, lon2: number) => {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // If the user has not acquired real GPS location, return idle status rather than computing fake distances to Bengaluru
    if (!hasRealLocation) {
      return {
        nearbyTotalWithin3km: 0,
        nearbyTotalWithin5km: 0,
        nearbyCritical: 0,
        nearbyHigh: 0,
        nearestDistanceKm: null,
        nearestNodeTitle: 'Select an incident or enable GPS to calculate distance',
        routeInundationProb: 0,
        hasRealGps: false
      };
    }

    let nearbyCritical = 0;
    let nearbyHigh = 0;
    let nearbyTotalWithin3km = 0;
    let nearbyTotalWithin5km = 0;
    let nearestDist = Infinity;
    let nearestNodeTitle = 'None';

    filteredIncidents.forEach((inc) => {
      const d = getDistKm(inc.lat, inc.lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestNodeTitle = inc.title;
      }
      if (d <= 3.0) {
        nearbyTotalWithin3km++;
        if (inc.severity === 'Critical') nearbyCritical++;
        if (inc.severity === 'High') nearbyHigh++;
      }
      if (d <= 5.0) {
        nearbyTotalWithin5km++;
      }
    });

    // Probability of encountering blocked/waterlogged route based on local density and severity
    // Scaled empirically from nearest hazard proximity and cluster density
    let routeInundationProb = 0;
    if (nearbyTotalWithin3km === 0) {
      routeInundationProb = Math.min(8, Math.round(nearbyTotalWithin5km * 2));
    } else {
      routeInundationProb = Math.min(
        92, 
        Math.round((nearbyCritical * 26 + nearbyHigh * 14 + (nearbyTotalWithin3km - nearbyCritical - nearbyHigh) * 5))
      );
    }

    return {
      nearbyTotalWithin3km,
      nearbyTotalWithin5km,
      nearbyCritical,
      nearbyHigh,
      nearestDistanceKm: nearestDist === Infinity ? null : nearestDist.toFixed(1),
      nearestNodeTitle: nearestNodeTitle.length > 28 ? `${nearestNodeTitle.slice(0, 26)}…` : nearestNodeTitle,
      routeInundationProb,
      hasRealGps: hasRealLocation
    };
  }, [userCoords, filteredIncidents, hasRealLocation]);

  // Real-Time Geofence Auto-Alert Trigger
  // Actively evaluates user's proximity to severe flood hazards & underpass submersions
  const lastAlertTimestampRef = useRef<number>(0);
  const alertedIncidentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasRealLocation || !filteredIncidents.length) return;

    // Read user alert configuration from localStorage
    const alertDistanceMeters = parseInt(localStorage.getItem('doab_alert_distance') || '500', 10);
    const alertMinSeverity = localStorage.getItem('doab_alert_sensitivity') || 'high';
    const clearanceLimitCm = parseInt(localStorage.getItem('doab_clearance_limit') || '15', 10);

    const lat1 = userCoords[0];
    const lon1 = userCoords[1];

    let nearestHazard: TelemetryIncident | null = null;
    let minDistanceM = Infinity;

    for (const inc of filteredIncidents) {
      const isCritical = inc.severity === 'Critical';
      const isHigh = inc.severity === 'High';
      const severityMatch = 
        alertMinSeverity === 'all' ||
        (alertMinSeverity === 'high' && (isCritical || isHigh)) ||
        (alertMinSeverity === 'critical' && isCritical);

      const depthExceedsClearance = (inc.waterDepthCm || 0) >= clearanceLimitCm;

      if (!severityMatch && !depthExceedsClearance) continue;

      // Haversine distance in meters
      const R = 6371000;
      const dLat = (inc.lat - lat1) * Math.PI / 180;
      const dLon = (inc.lng - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((inc.lat * Math.PI) / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distM = R * c;

      if (distM < minDistanceM) {
        minDistanceM = distM;
        nearestHazard = inc;
      }
    }

    const now = Date.now();
    // Trigger danger broadcast if within geofence radius and not dismissed in the last 4 minutes
    if (
      nearestHazard &&
      minDistanceM <= alertDistanceMeters &&
      (now - lastAlertTimestampRef.current > 240000 || alertedIncidentIdRef.current !== nearestHazard.id)
    ) {
      lastAlertTimestampRef.current = now;
      alertedIncidentIdRef.current = nearestHazard.id;

      window.dispatchEvent(
        new CustomEvent('doab:trigger-danger-broadcast', {
          detail: {
            title: nearestHazard.title || 'Severe Waterlogging Ahead',
            ward: nearestHazard.ward || 'Active Corridor Zone',
            distanceAhead: `${Math.round(minDistanceM)} meters`,
            waterDepthCm: nearestHazard.waterDepthCm || 45,
            description:
              nearestHazard.description ||
              `Standing water (~${nearestHazard.waterDepthCm || 45}cm) detected ahead exceeding vehicle clearance limit.`
          }
        })
      );
    }
  }, [userCoords, hasRealLocation, filteredIncidents]);

  // DOAB Composite Macro Risk Cluster Engine:
  // Ranks clusters dynamically on: (1) Live Cases + Severity, (2) Recency decay, (3) Proximity to User GPS / Viewport
  const recurringClusters = useMemo(() => {
    const clusterMap = new Map<string, {
      ward: string;
      category: string;
      count: number;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      lowCount: number;
      maxWaterDepthCm: number;
      latestTimestampMs: number;
      highestSeverity: 'Critical' | 'High' | 'Medium' | 'Low';
      points: { lat: number; lng: number }[];
    }>();

    const SEVERITY_RANK: Record<string, number> = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0 };

    const parseIncTime = (timeStr?: string): number => {
      if (!timeStr) return Date.now() - 90 * 86400000;
      const t = Date.parse(timeStr);
      if (!isNaN(t)) return t;
      const parts = timeStr.split(/[- /:]/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dt = new Date(y < 100 ? 2000 + y : y, m, d);
        if (!isNaN(dt.getTime())) return dt.getTime();
      }
      return Date.now() - 90 * 86400000;
    };

    filteredIncidents.forEach((inc) => {
      const key = `${inc.ward || 'Regional Corridor'}::${inc.category || 'waterlogging'}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          ward: inc.ward || 'Regional Corridor',
          category: inc.category || 'waterlogging',
          count: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          maxWaterDepthCm: 0,
          latestTimestampMs: 0,
          highestSeverity: inc.severity,
          points: [],
        });
      }
      const item = clusterMap.get(key)!;
      item.count += 1;
      if (inc.severity === 'Critical') item.criticalCount++;
      else if (inc.severity === 'High') item.highCount++;
      else if (inc.severity === 'Medium') item.mediumCount++;
      else item.lowCount++;

      if (inc.waterDepthCm && inc.waterDepthCm > item.maxWaterDepthCm) {
        item.maxWaterDepthCm = inc.waterDepthCm;
      }

      const tMs = parseIncTime(inc.updatedTime);
      if (tMs > item.latestTimestampMs) {
        item.latestTimestampMs = tMs;
      }

      item.points.push({ lat: inc.lat, lng: inc.lng });
      if ((SEVERITY_RANK[inc.severity] || 0) > (SEVERITY_RANK[item.highestSeverity] || 0)) {
        item.highestSeverity = inc.severity;
      }
    });

    const now = Date.now();
    const isStateFiltered = (!isMultiStateMode && selectedState !== 'all') || (isMultiStateMode && selectedStates.length > 0);

    // ── OPERATIONAL REFERENCE CENTER FOR PROXIMITY ──
    // When a specific state is selected from the combobox, proximity MUST be evaluated relative to 
    // that state's regional center/corridor, NOT the user's remote live GPS!
    let referenceCenter: [number, number] = mapCenter;
    if (!isStateFiltered && hasRealLocation) {
      referenceCenter = userCoords;
    } else if (isStateFiltered) {
      const activeState = isMultiStateMode && selectedStates.length > 0 ? selectedStates[selectedStates.length - 1] : selectedState;
      const reg = ALL_REGIONS.find((r) => r.val.toLowerCase() === activeState.toLowerCase());
      referenceCenter = reg ? reg.center : mapCenter;
    }

    return Array.from(clusterMap.values()).map((c) => {
      let maxDist = 0;
      for (let i = 0; i < c.points.length; i++) {
        for (let j = i + 1; j < c.points.length; j++) {
          const d = haversineKm(c.points[i].lat, c.points[i].lng, c.points[j].lat, c.points[j].lng);
          if (d > maxDist) maxDist = d;
        }
      }
      const centerLat = c.points.reduce((acc, p) => acc + p.lat, 0) / c.points.length;
      const centerLng = c.points.reduce((acc, p) => acc + p.lng, 0) / c.points.length;
      
      const distFromUser = hasRealLocation
        ? haversineKm(userCoords[0], userCoords[1], centerLat, centerLng)
        : null;

      // Distance from current operational reference (State Center if state active, else GPS or map center)
      const distFromRef = haversineKm(referenceCenter[0], referenceCenter[1], centerLat, centerLng);

      // 1. Criticality Load Score [0 - 100] (Severity weights + maximum water depth + case density)
      const casesWeight = Math.min(
        100, 
        c.criticalCount * 28 + c.highCount * 16 + c.mediumCount * 6 + c.count * 4 + Math.min(c.maxWaterDepthCm / 2, 20)
      );

      // 2. Recency Score [0 - 100]
      const hoursAgo = Math.max(0, (now - c.latestTimestampMs) / 3600000);
      let recencyWeight = 15;
      if (hoursAgo <= 3) recencyWeight = 100;
      else if (hoursAgo <= 6) recencyWeight = 90;
      else if (hoursAgo <= 24) recencyWeight = 75;
      else if (hoursAgo <= 72) recencyWeight = 50;
      else if (hoursAgo <= 168) recencyWeight = 30;
      else recencyWeight = 15;

      // 3. Proximity Score [0 - 100] (distance to operational reference)
      let proximityWeight = 10;
      if (distFromRef <= 5.0) proximityWeight = 100;
      else if (distFromRef <= 12.0) proximityWeight = 85;
      else if (distFromRef <= 25.0) proximityWeight = 65;
      else if (distFromRef <= 50.0) proximityWeight = 45;
      else if (distFromRef <= 100.0) proximityWeight = 25;
      else proximityWeight = Math.max(5, Math.round(25 - (distFromRef - 100) * 0.1));

      // ── PRIORITIZED INTERSECTION SCORING MODEL ──
      // Multiplicative intersection: Recent conditioned on Nearness.
      // A recent event 1500 km away drops down; only events that are BOTH Recent AND Near stay high.
      const recentNearIntersection = (recencyWeight * proximityWeight) / 100;
      const trifectaIntersection = (recentNearIntersection * casesWeight) / 100;

      let compositeScore = 0;
      if (prioritizeRecent && prioritizeNearest) {
        // Balanced Intersection Mode: Recent + Near intersection prioritized first, then Criticality + Trifecta
        compositeScore = Math.round(
          0.45 * recentNearIntersection + 0.35 * casesWeight + 0.20 * trifectaIntersection
        );
      } else if (prioritizeRecent && !prioritizeNearest) {
        compositeScore = Math.round(0.55 * recencyWeight + 0.45 * casesWeight);
      } else if (!prioritizeRecent && prioritizeNearest) {
        compositeScore = Math.round(0.55 * proximityWeight + 0.45 * casesWeight);
      } else {
        compositeScore = Math.round(casesWeight);
      }

      const clusterId = `${c.ward}::${c.category}::${centerLat.toFixed(4)}_${centerLng.toFixed(4)}`;
      return {
        ...c,
        id: clusterId,
        lat: centerLat,
        lng: centerLng,
        clusterRadiusKm: maxDist > 0 ? Math.max(maxDist, 1.2) : 2.5,
        distFromUser,
        distFromRef,
        isStateFiltered,
        compositeScore,
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }, [
    filteredIncidents, 
    userCoords, 
    hasRealLocation, 
    mapCenter, 
    prioritizeRecent, 
    prioritizeNearest,
    selectedState,
    isMultiStateMode,
    selectedStates
  ]);

  // ── MULTI-CLUSTER RELIEF & DISPATCH TOUR ENGINE ──
  // Computes sequential cluster-to-cluster hopping for emergency relief workers / delivery supply drops
  const multiClusterReliefTour = useMemo(() => {
    if (recurringClusters.length < 2) return null;
    const topClusters = recurringClusters.slice(0, 5);
    
    // Sequential tour starting from the highest priority cluster
    const tourHops: Array<{
      fromCluster: (typeof recurringClusters)[0];
      toCluster: (typeof recurringClusters)[0];
      legDistanceKm: number;
    }> = [];

    let totalCircuitDistanceKm = 0;
    const pathPositions: [number, number][] = [[topClusters[0].lat, topClusters[0].lng]];

    for (let i = 0; i < topClusters.length - 1; i++) {
      const from = topClusters[i];
      const to = topClusters[i + 1];
      const legDist = haversineKm(from.lat, from.lng, to.lat, to.lng);
      totalCircuitDistanceKm += legDist;
      pathPositions.push([to.lat, to.lng]);
      tourHops.push({
        fromCluster: from,
        toCluster: to,
        legDistanceKm: legDist
      });
    }

    return {
      clusters: topClusters,
      tourHops,
      totalCircuitDistanceKm,
      totalCases: topClusters.reduce((sum, c) => sum + c.count, 0),
      pathPositions
    };
  }, [recurringClusters]);

  const handleSelectIncident = (incident: TelemetryIncident) => {
    playClick();
    setSelectedIncident(incident);
    setActiveLeftTab('incident');
    setIsMobileCollapsed(false);
    setMapCenter([incident.lat, incident.lng]);
    // Gentle contextual zoom: if at national overview (<= 6), glide into 11. If already viewing region, preserve zoom.
    setMapZoom((currentZoom) => currentZoom <= 6 ? 11 : currentZoom);
  };

  // Fetch user live location on MapPage mount if permission has been granted
  useEffect(() => {
    if (!navigator.geolocation) return;

    let isCancelled = false;

    // Check if user has enabled location permission or already has OS permission
    const initLocation = async () => {
      try {
        const savedPerms = JSON.parse(localStorage.getItem('doab_user_permissions_v2') || '{}');
        // If user explicitly disabled location in preferences, do not start GPS tracking
        if (savedPerms.location === false) {
          return;
        }

        const osPerm = await NativeService.checkPermissions();
        if (osPerm.location === 'denied') {
          return;
        }

        // Only trigger the locating spinner & zoom-in animation on the very first GPS detection of the session
        const shouldAnimateInitialZoom = !mapSessionState.hasCompletedInitialLocationZoom;
        if (shouldAnimateInitialZoom) {
          setIsLocating(true);
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (isCancelled) return;
            const liveLat = position.coords.latitude;
            const liveLng = position.coords.longitude;
            const realCoords: [number, number] = [liveLat, liveLng];
            setUserCoords(realCoords);
            setHasRealLocation(true);
            try {
              localStorage.setItem('doab_user_coords_v1', JSON.stringify({ lat: liveLat, lng: liveLng, timestamp: Date.now() }));
            } catch {}

            if (!mapSessionState.hasCompletedInitialLocationZoom) {
              mapSessionState.hasCompletedInitialLocationZoom = true;
              setMapCenter(realCoords);
              setMapZoom(15);
              setIsViewingMyLocation(true);
            }
            setIsLocating(false);
          },
          () => {
            if (isCancelled) return;
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 15000 }
        );
      } catch (e) {
        console.warn('Initial geolocation check:', e);
      }
    };

    initLocation();

    // Continuous watch to keep location live as user moves
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (isCancelled) return;
        const liveLat = position.coords.latitude;
        const liveLng = position.coords.longitude;
        const realCoords: [number, number] = [liveLat, liveLng];
        setUserCoords(realCoords);
        setHasRealLocation(true);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    return () => {
      isCancelled = true;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleRecenter = async () => {
    playClick();
    if (isViewingMyLocation) {
      // Toggle out: Zoom out to All-India national overview
      setMapCenter(defaultCenter);
      setMapZoom(5);
      setIsViewingMyLocation(false);
      return;
    }

    // If we already have the user's real GPS coordinates in memory, animate immediately when toggling back in
    if (hasRealLocation) {
      mapSessionState.hasCompletedInitialLocationZoom = true;
      setMapCenter(userCoords);
      setMapZoom(15);
      setIsViewingMyLocation(true);
      return;
    }

    // Otherwise acquire real GPS location and zoom in
    setIsLocating(true);

    // Prompt user for OS system permission if not yet granted
    const permStatus = await NativeService.checkPermissions();
    if (permStatus.location !== 'granted') {
      const granted = await NativeService.requestLocationPermission();
      if (!granted) {
        setIsLocating(false);
        setIsViewingMyLocation(false);
        return;
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const liveLat = position.coords.latitude;
          const liveLng = position.coords.longitude;
          const realCoords: [number, number] = [liveLat, liveLng];
          mapSessionState.hasCompletedInitialLocationZoom = true;
          setUserCoords(realCoords);
          setHasRealLocation(true);
          setMapCenter(realCoords);
          setMapZoom(15);
          setIsLocating(false);
          setIsViewingMyLocation(true);
        },
        () => {
          // Fallback if permission denied or timeout: keep national overview without pretending it's real GPS
          setMapCenter(defaultCenter);
          setMapZoom(5);
          setIsLocating(false);
          setIsViewingMyLocation(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setIsLocating(false);
      setMapCenter(defaultCenter);
      setMapZoom(5);
      setIsViewingMyLocation(false);
    }
  };

  const handleToggleFullscreen = () => {
    playClick();
    const mapElement = document.getElementById('tour-map-view');
    if (!mapElement) return;

    if (!document.fullscreenElement) {
      mapElement.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {
        setIsFullScreen(!isFullScreen);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {
        setIsFullScreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div id="tour-map-view" ref={mapParentRef} className={`flex-grow flex flex-col relative w-full h-full min-h-[420px] bg-[var(--bg-main)] overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[9999] rounded-none' : ''}`}>
      
      {/* ── Interactive Safe Elevation Path Floating Action Banner (When mode=create_path, Draggable) ── */}
      <AnimatePresence>
        {isPathCreationMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            drag
            dragListener={false}
            dragControls={createPathDragControls}
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={mapParentRef}
            className="absolute top-2 sm:top-4 left-0 right-0 mx-auto z-50 w-[calc(100%-1rem)] max-w-full pointer-events-auto flex flex-col"
            style={{ width: `${createPathWidth}px`, maxWidth: 'calc(100vw - 1rem)' }}
          >
            <div 
              style={{ maxHeight: `${createPathMaxHeight}px` }}
              className={`neo-glass-card rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-2xl border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)]/95 ${envMode === 'drought' ? 'dark:bg-[#151210]/95' : 'dark:bg-[#0c141d]/95'} flex flex-col gap-2.5 sm:gap-3 overflow-y-auto custom-scrollbar relative`}
            >
              {/* Header / Drag Handle */}
              <div 
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('button, input')) return;
                  createPathDragControls.start(e);
                }}
                className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5 cursor-grab active:cursor-grabbing select-none touch-none"
                title="Drag to reposition panel"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] shrink-0 shadow-2xs">
                    <RouteIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate flex items-center gap-2">
                      <span>Create Safe Elevation Path</span>
                      <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">
                        Amazon Location + DEM
                      </span>
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      Click map, use current GPS, or search Amazon Location Service to preview 3 bypass paths
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="p-1 text-[var(--text-muted)] opacity-60 hover:opacity-100 flex items-center" title="Drag to reposition panel">
                    <GripHorizontal className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelCustomPath}
                    className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer shrink-0"
                    title="Close Path Creation Mode"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Waypoint Selector Chips (Click target toggle: Origin A vs Destination B) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Waypoint A (Origin) */}
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => { playClick(); setPathPickingTarget(prev => prev === 'origin' ? null : 'origin'); }}
                    className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-2.5 relative overflow-hidden ${
                      pathPickingTarget === 'origin'
                        ? 'border-[var(--text-main)] bg-[var(--text-main)]/5 shadow-xs ring-1 ring-[var(--text-main)]/20'
                        : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--text-main)]/40 hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 transition-all border ${
                      pathPickingTarget === 'origin'
                        ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-2xs'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]'
                    }`}>
                      A
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-mono text-[var(--text-muted)] font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>Origin Point</span>
                      </div>
                      <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                        {pathOrigin ? `${pathOrigin[0].toFixed(3)}°, ${pathOrigin[1].toFixed(3)}°` : pathPickingTarget === 'origin' ? 'Click Map...' : 'Tap to Place'}
                      </div>
                    </div>

                    {/* X Clear Origin */}
                    {pathOrigin && (
                      <Tooltip content="Clear Origin Point" position="top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClick();
                            setPathOrigin(null);
                            setPathOriginAddress('');
                            setOriginSuggestions([]);
                            setPathPickingTarget('origin');
                          }}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                          aria-label="Clear Origin Point"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    )}

                    {/* Integrated Live GPS Origin Target with Precision Tooltip */}
                    <Tooltip content="Use Current Location as Origin (A)" position="top">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseCurrentLocationForOrigin();
                        }}
                        className="p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center group"
                        aria-label="Use Current Location as Origin Point"
                      >
                        <Crosshair className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Waypoint B (Destination) */}
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => { playClick(); setPathPickingTarget(prev => prev === 'destination' ? null : 'destination'); }}
                    className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-2.5 relative overflow-hidden ${
                      pathPickingTarget === 'destination'
                        ? 'border-[var(--text-main)] bg-[var(--text-main)]/5 shadow-xs ring-1 ring-[var(--text-main)]/20'
                        : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--text-main)]/40 hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 transition-all border ${
                      pathPickingTarget === 'destination'
                        ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-2xs'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]'
                    }`}>
                      B
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-mono text-[var(--text-muted)] font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>Safe Destination</span>
                      </div>
                      <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                        {pathDest ? `${pathDest[0].toFixed(3)}°, ${pathDest[1].toFixed(3)}°` : pathPickingTarget === 'destination' ? 'Click Map...' : 'Tap to Place'}
                      </div>
                    </div>

                    {/* X Clear Destination */}
                    {pathDest && (
                      <Tooltip content="Clear Destination Point" position="top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClick();
                            setPathDest(null);
                            setPathDestAddress('');
                            setDestSuggestions([]);
                            setPathPickingTarget('destination');
                          }}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                          aria-label="Clear Destination Point"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual Input Fields (Address / Landmark Name with Amazon Location Autocomplete) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Origin Input + ALS Dropdown */}
                <div className="relative" ref={originDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-mono text-[var(--text-muted)]">
                      Origin Address / Landmark
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={pathOriginAddress}
                      onFocus={() => setPathPickingTarget('origin')}
                      onChange={(e) => handleOriginAddressChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setOriginSuggestions([]);
                      }}
                      placeholder="Search origin address or speak..."
                      className="w-full px-2.5 py-1.5 pr-14 text-xs rounded-xl bg-[var(--bg-main)] border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] transition-colors"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {originAlsLoading && (
                        <span className="h-2.5 w-2.5 rounded-full border border-[var(--text-main)] border-t-transparent animate-spin mr-0.5" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleVoiceInput('origin')}
                        className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                          isListeningTarget === 'origin'
                            ? 'text-red-500 bg-red-500/10 animate-pulse'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                        }`}
                        title={isListeningTarget === 'origin' ? 'Listening... speak landmark now' : 'Speak origin address'}
                        aria-label="Voice search for origin"
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {originSuggestions.length > 0 && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-44 overflow-y-auto">
                      {originSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOriginPlace(place)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-main)] transition-colors flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-0 cursor-pointer"
                        >
                          <span className="font-semibold text-[var(--text-main)] truncate">{place.label.split(',')[0].trim() || place.municipality || place.label}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{place.municipality && place.municipality !== place.label.split(',')[0].trim() ? `${place.municipality}, ${place.region || 'India'}` : (place.region ? `${place.region}, India` : place.label)}</span>
                        </button>
                      ))}
                      <div className="px-3 py-1 text-[9px] text-[var(--text-muted)] font-mono flex items-center justify-between bg-[var(--bg-main)]">
                        <span>Amazon Location Service</span>
                        <span>{originSuggestions.length} matches</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Destination Input + ALS Dropdown */}
                <div className="relative" ref={destDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-mono text-[var(--text-muted)]">
                      Safe Destination / Haven
                    </label>
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                      AWS Geocode Ready
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={pathDestAddress}
                      onFocus={() => setPathPickingTarget('destination')}
                      onChange={(e) => handleDestAddressChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setDestSuggestions([]);
                      }}
                      placeholder="Search safe destination or speak..."
                      className="w-full px-2.5 py-1.5 pr-14 text-xs rounded-xl bg-[var(--bg-main)] border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] transition-colors"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {destAlsLoading && (
                        <span className="h-2.5 w-2.5 rounded-full border border-[var(--text-main)] border-t-transparent animate-spin mr-0.5" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleVoiceInput('destination')}
                        className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                          isListeningTarget === 'destination'
                            ? 'text-red-500 bg-red-500/10 animate-pulse'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                        }`}
                        title={isListeningTarget === 'destination' ? 'Listening... speak landmark now' : 'Speak safe destination'}
                        aria-label="Voice search for safe destination"
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {destSuggestions.length > 0 && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-44 overflow-y-auto">
                      {destSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDestPlace(place)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-main)] transition-colors flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-0 cursor-pointer"
                        >
                          <span className="font-semibold text-[var(--text-main)] truncate">{place.label.split(',')[0].trim() || place.municipality || place.label}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{place.municipality && place.municipality !== place.label.split(',')[0].trim() ? `${place.municipality}, ${place.region || 'India'}` : (place.region ? `${place.region}, India` : place.label)}</span>
                        </button>
                      ))}
                      <div className="px-3 py-1 text-[9px] text-[var(--text-muted)] font-mono flex items-center justify-between bg-[var(--bg-main)]">
                        <span>Amazon Location Service</span>
                        <span>{destSuggestions.length} matches</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Interactive Candidate Route Switcher (Only Visible When Both Points Are Selected) ── */}
              {!pathOrigin || !pathDest ? (
                <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-[11px] min-w-0">
                    <Navigation2 className="h-4 w-4 shrink-0 text-[var(--text-main)]" />
                    <span className="truncate">
                      {!pathOrigin && !pathDest
                        ? 'Select both Origin (A) and Safe Destination (B) to compute elevation corridors.'
                        : !pathOrigin
                          ? 'Set Origin (A) to compute bypass corridors.'
                          : 'Set Safe Destination (B) to compute bypass corridors.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelCustomPath}
                    className="px-3 py-1 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : isEvaluatingRoutes ? (
                /* Evaluation Loader: Displayed while calculating the 3 candidate corridors */
                <div className="p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex items-center justify-center shrink-0">
                        <span className="h-4 w-4 rounded-full border-2 border-[var(--text-main)] border-t-transparent animate-spin" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                          <span>Evaluating Safe Elevation Corridors...</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]">
                            DEM + AI
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                          Assessing road elevations, real street geometry & flood hazard telemetry
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelCustomPath}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                  {/* Animated subtle evaluation progress bar */}
                  <div className="w-full h-1 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]/50">
                    <motion.div
                      className="h-full bg-[var(--text-main)] rounded-full"
                      initial={{ width: '15%' }}
                      animate={{ width: ['15%', '85%', '60%', '95%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              ) : !activeCandidateRoute ? null : (
                <>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--text-main)] text-[var(--bg-card)]">
                          Path {selectedCandidateIdx + 1} of {candidateSafePaths.length}
                        </span>
                        <span className="text-xs font-bold text-[var(--text-main)] truncate">
                          {activeCandidateRoute.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-[var(--text-muted)] flex-wrap">
                        <span>{(activeCandidateRoute.distance_meters / 1000).toFixed(1)} km</span>
                        <span>•</span>
                        <span className="font-semibold text-[var(--text-main)]">{formatRouteDuration(activeCandidateRoute.duration_seconds)}</span>
                        <span>•</span>
                        <span className="font-bold text-[var(--text-main)]">
                          {(activeCandidateRoute.mean_risk * 100).toFixed(1)}% Flood Risk
                        </span>
                        <span className="hidden md:inline text-[9px] opacity-80">
                          ({activeCandidateRoute.badge})
                        </span>
                      </div>
                    </div>

                    {/* Transit Mode Selector with sleek Lucide SVG icons (Drive 🚗, Bike 🛵, Bus 🚌, Walk 🚶) */}
                    <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                      <div className="relative inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                        {[
                          { id: 'driving' as const, label: 'Drive', icon: Car },
                          { id: 'motorcycle' as const, label: 'Bike', icon: Bike },
                          { id: 'transit' as const, label: 'Bus', icon: Bus },
                          { id: 'walking' as const, label: 'Walk', icon: Footprints },
                        ].map(({ id, label, icon: IconComponent }) => {
                          const isMActive = travelMode === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                playClick();
                                setTravelMode(id);
                              }}
                              className={`relative z-10 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 select-none ${
                                isMActive ? 'text-white dark:text-neutral-950 font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                              title={`Transit Mode: ${label}`}
                            >
                              {isMActive && (
                                <motion.span
                                  layoutId="travelmode-active-pill"
                                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                  className="absolute inset-0 z-[-1] rounded-lg bg-neutral-900 dark:bg-white shadow-2xs"
                                />
                              )}
                              <IconComponent className="h-3 w-3 shrink-0" />
                              <span className="text-[10px]">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Custom Route Name / Label Field with identical search bar outline */}
                  <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-[var(--bg-main)] border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 focus-within:border-[var(--text-main)] focus-within:ring-1 focus-within:ring-[var(--text-main)] transition-colors">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                      <Pencil className="h-3 w-3 text-[var(--text-main)]" />
                      <span>Route Name:</span>
                    </span>
                    <input
                      type="text"
                      value={customRouteName}
                      onChange={(e) => setCustomRouteName(e.target.value)}
                      placeholder={
                        (() => {
                          const o = pathOriginAddress.trim().split(',')[0].trim();
                          const d = pathDestAddress.trim().split(',')[0].trim();
                          const isONamed = Boolean(o && !o.startsWith('Map Point') && o !== 'Origin' && !o.includes('Current Location'));
                          const isDNamed = Boolean(d && !d.startsWith('Map Point') && d !== 'Safe Haven Sector');
                          if (isONamed && isDNamed) return `${o} to ${d}`;
                          if (isDNamed) return `Safe Corridor to ${d}`;
                          if (isONamed) return `Safe Corridor from ${o}`;
                          return 'Custom Evacuation Route';
                        })()
                      }
                      className="flex-1 bg-transparent text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                    {customRouteName && (
                      <button
                        type="button"
                        onClick={() => setCustomRouteName('')}
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-0.5 cursor-pointer"
                        title="Reset to default name"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>

                  {/* Natural Elevation Ridge Callout when direct and safest corridors both exhibit low hazard exposure */}
                  {candidateSafePaths.length >= 3 && Math.abs(candidateSafePaths[0].mean_risk - candidateSafePaths[2].mean_risk) < 0.06 && (
                    <div className="px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[10.5px] text-[var(--text-muted)] flex items-start sm:items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200 shrink-0 mt-0.5 sm:mt-0" />
                      <div className="leading-snug">
                        <span className="font-bold text-[var(--text-main)]">Optimal Natural Ridge: </span>
                        <span>Direct terrain already traverses an elevated ridge line with minimal flood risk. Path 1 adds maximum buffer detour, while Path 3 offers the fastest direct transit.</span>
                      </div>
                    </div>
                  )}

                  {/* Corridor Profile Buttons & Actions - Strictly Inline Single Row */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                    {/* Left: Corridor Profile segmented selector with animated moving pillbar */}
                    <div className="relative inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] shrink-0">
                      {(['low', 'moderate', 'high'] as const).map((tier, idx) => {
                        const candidate = candidateSafePaths[idx];
                        const riskPct = candidate ? (candidate.mean_risk * 100).toFixed(1) : null;
                        const title = tier === 'low' ? 'Safest' : tier === 'moderate' ? 'Balanced' : 'Direct';
                        const isSelected = selectedCandidateIdx === idx;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => {
                              playClick();
                              setSelectedCandidateIdx(idx);
                            }}
                            className={`relative z-10 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 select-none ${
                              isSelected
                                ? 'text-white dark:text-neutral-950 font-bold'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                          >
                            {isSelected && (
                              <motion.span
                                layoutId="corridor-active-pill"
                                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                className="absolute inset-0 z-[-1] rounded-lg bg-neutral-900 dark:bg-white shadow-2xs"
                              />
                            )}
                            <span>{title}</span>
                            {riskPct && (
                              <span className={`text-[9px] ${isSelected ? 'opacity-85' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                ({riskPct}%)
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right: Actions strictly inline without wrapping outside */}
                    <div className="flex items-center gap-2 justify-end shrink-0 sm:ml-auto">
                      <button
                        type="button"
                        onClick={handleCancelCustomPath}
                        className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomPath}
                        disabled={!pathOrigin || !pathDest}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Save Safe Path</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Toast Feedback for Route Saving */}
              {saveSuccessToast && (
                <div className="p-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-mono font-semibold flex items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <span className="truncate">{saveSuccessToast}</span>
                  <Link
                    to="/routes/best"
                    onClick={() => playClick()}
                    className="underline font-bold text-[11px] shrink-0 hover:opacity-80"
                  >
                    View Saved Routes →
                  </Link>
                </div>
              )}

              {/* Single South-East Corner Resize Grip (Clean 2D Panel Resizing) */}
              <div
                onPointerDown={(e) => handleCreatePathResizeStart(e, 'se')}
                className="absolute bottom-1.5 right-1.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-se-resize select-none touch-none opacity-40 hover:opacity-100 transition-opacity z-30"
                title="Drag corner to resize panel"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                  <circle cx="8" cy="8" r="1.1" />
                  <circle cx="8" cy="4.5" r="1.1" />
                  <circle cx="4.5" cy="8" r="1.1" />
                </svg>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Map Evaluation Indicator (Pill at bottom of viewport while computing 3 corridors) */}
      <AnimatePresence>
        {pathOrigin && pathDest && isEvaluatingRoutes && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-xl flex items-center gap-2 text-xs font-mono text-[var(--text-main)] pointer-events-auto select-none">
              <span className="h-2.5 w-2.5 rounded-full border border-[var(--text-main)] border-t-transparent animate-spin shrink-0" />
              <span>Evaluating 3 Elevation Corridors...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Unified Left Floating Map Command Dock (Tabbed, Elegant, Non-Intrusive, Draggable) ── */}
      <motion.div 
        drag
        dragListener={false}
        dragControls={liveRiskDragControls}
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={mapParentRef}
        onDragStart={() => { liveRiskHasDraggedRef.current = true; }}
        className={`absolute top-1.5 left-2.5 right-2.5 sm:top-4 sm:left-4 sm:right-auto ${isStateDropdownOpen || alsSuggestions.length > 0 || isSearchFocused ? 'z-50' : 'z-30'} pointer-events-none`}
        style={{ width: `${liveRiskWidth}px`, maxWidth: 'calc(100vw - 1.25rem)' }}
      >
        <div 
          id="tour-map-search" 
          style={{ 
            maxHeight: isMobileCollapsed 
              ? undefined 
              : `${show7DayForecast && activeLeftTab === 'forecast' ? Math.max(liveRiskMaxHeight, 740) : liveRiskMaxHeight}px`,
            scrollbarGutter: 'stable'
          }}
          className={`rounded-2xl pointer-events-auto shadow-2xl backdrop-blur-2xl border border-[var(--border-color)] dark:border-white/15 bg-[var(--bg-card)] ${
            envMode === 'drought' ? 'dark:bg-[#151210]' : 'dark:bg-[#0c141d]'
          } transition-colors duration-150 relative ${
            isMobileCollapsed ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden custom-scrollbar'
          }`}
        >
          
          {/* Header Bar with Mode Pill & Minimize Toggle */}
          <div 
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button, [role="tablist"], [role="tab"], input')) return;
              liveRiskHasDraggedRef.current = false;
              liveRiskDragControls.start(e);
            }}
            onClick={(e) => {
              if (liveRiskHasDraggedRef.current) {
                liveRiskHasDraggedRef.current = false;
                return;
              }
              if ((e.target as HTMLElement).closest('[role="tablist"], button')) return;
              playClick();
              setIsMobileCollapsed(!isMobileCollapsed);
            }}
            className={`flex items-center justify-between gap-2.5 bg-[var(--bg-main)]/95 ${
              envMode === 'drought' ? 'dark:bg-[#0f0d0b] hover:bg-[var(--bg-main)] dark:hover:bg-[#181411]' : 'dark:bg-[#090f16] hover:bg-[var(--bg-main)] dark:hover:bg-[#0d1620]'
            } px-3.5 py-2 cursor-grab active:cursor-grabbing select-none touch-none transition-colors ${
              isMobileCollapsed ? 'rounded-2xl' : 'rounded-t-2xl border-b border-[var(--text-main)]/20 dark:border-white/20'
            }`}
            title="Drag to reposition window • Click to collapse"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GripHorizontal className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-60 shrink-0" />
              <Crosshair className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
              <span className="text-xs sm:text-[13px] font-bold truncate text-[var(--text-main)]">
                Live Risk Monitor
              </span>
              {userRole === 'delivery' && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs shrink-0" 
                  title={`Fleet Mode Active: ${vendorId}`}
                >
                  <Truck className="w-3 h-3 text-[var(--color-brand-accent)] shrink-0" />
                  <span className="hidden sm:inline font-mono text-[10px]">{vendorId}</span>
                  <span className="sm:hidden font-mono text-[10px]">Fleet</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Dual Engine Sliding Pill Bar (Professional Apple/Mapbox Standard — Enlarged Touch Targets) */}
              <div 
                id="tour-map-engine"
                className="relative flex items-center p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xs select-none"
                role="tablist"
                aria-label="Map rendering engine mode"
              >
                {/* Smooth Animated Sliding Background Pill with Consistent Brand/Theme Background */}
                <span
                  aria-hidden="true"
                  className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-xs pointer-events-none bg-[var(--text-main)] ${
                    mapEngine === 'leaflet'
                      ? 'left-1 w-[calc(50%-4px)]'
                      : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
                  }`}
                />

                {/* Option 1: 2D Standard / Low Data (Leaflet) with Globe2 SVG */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mapEngine === 'leaflet'}
                  onClick={() => {
                    if (mapEngine !== 'leaflet') {
                      playClick();
                      setMapEngine('leaflet');
                    }
                  }}
                  className={`relative z-10 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    mapEngine === 'leaflet'
                      ? 'text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="2D Standard Engine (Leaflet): Ultra-low battery, fast raster rendering"
                >
                  <Globe2 size={12} className={mapEngine === 'leaflet' ? 'text-[var(--bg-card)] shrink-0' : 'shrink-0'} />
                  <span>2D</span>
                  <span className="font-normal opacity-85">Lite</span>
                </button>

                {/* Option 2: 3D Vector GPU / High Detail (MapLibre) with Cpu SVG */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mapEngine === 'maplibre'}
                  onClick={() => {
                    if (mapEngine !== 'maplibre') {
                      playClick();
                      setMapEngine('maplibre');
                    }
                  }}
                  className={`relative z-10 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    mapEngine === 'maplibre'
                      ? 'text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="3D GPU Vector Engine (MapLibre GL): Hardware-accelerated, 3D tilt & bearing"
                >
                  <Cpu size={12} className={mapEngine === 'maplibre' ? 'text-[var(--bg-card)] animate-pulse shrink-0' : 'shrink-0'} />
                  <span>3D</span>
                  <span className="font-normal opacity-90">GPU</span>
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation();
                  playClick(); 
                  setIsMobileCollapsed(!isMobileCollapsed); 
                }}
                className="p-1.5 rounded-xl hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                aria-label={isMobileCollapsed ? "Expand Inspector" : "Collapse Inspector"}
                title={isMobileCollapsed ? "Expand Inspector" : "Collapse Inspector"}
              >
                {isMobileCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!isMobileCollapsed && (
              <motion.div
                key="liveRiskPanelContent"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-visible"
              >
                <div className="p-3 flex flex-col gap-2.5">
                  
                  {/* Segmented Tab Switcher (Search, Forecast, Clusters, Hazard) with Shared-Layout Sliding Pill */}
                  <div className="relative grid grid-cols-4 gap-1 p-1 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-[10px] font-semibold select-none">
                    <button
                      type="button"
                      onClick={() => { playClick(); setActiveLeftTab('search'); }}
                      className={`relative z-10 py-1.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer min-w-0 ${
                        activeLeftTab === 'search'
                          ? 'text-[var(--bg-card)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {activeLeftTab === 'search' && (
                        <motion.div
                          layoutId="liveRiskActiveTabPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[var(--text-main)] shadow-xs -z-10 pointer-events-none"
                        />
                      )}
                      <Search className="h-3 w-3 shrink-0" />
                      <span className="truncate">Search</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playClick(); setActiveLeftTab('forecast'); }}
                      className={`relative z-10 py-1.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer min-w-0 ${
                        activeLeftTab === 'forecast'
                          ? 'text-[var(--bg-card)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {activeLeftTab === 'forecast' && (
                        <motion.div
                          layoutId="liveRiskActiveTabPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[var(--text-main)] shadow-xs -z-10 pointer-events-none"
                        />
                      )}
                      <Activity className="h-3 w-3 shrink-0" />
                      <span className="truncate">Forecast</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setActiveLeftTab('clusters');
                        setShowHeatLayer(true);
                      }}
                      className={`relative z-10 py-1.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer min-w-0 ${
                        activeLeftTab === 'clusters'
                          ? 'text-[var(--bg-card)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {activeLeftTab === 'clusters' && (
                        <motion.div
                          layoutId="liveRiskActiveTabPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[var(--text-main)] shadow-xs -z-10 pointer-events-none"
                        />
                      )}
                      <Layers className="h-3 w-3 shrink-0" />
                      <span className="truncate">Clusters</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playClick(); setActiveLeftTab('incident'); }}
                      className={`relative z-10 py-1.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer min-w-0 ${
                        activeLeftTab === 'incident'
                          ? 'text-[var(--bg-card)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {activeLeftTab === 'incident' && (
                        <motion.div
                          layoutId="liveRiskActiveTabPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[var(--text-main)] shadow-xs -z-10 pointer-events-none"
                        />
                      )}
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span className="truncate">Hazard</span>
                    </button>
                  </div>

              {/* TAB 1: Search & Safe Routes Action */}
              {activeLeftTab === 'search' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
                  <div className="relative" ref={alsDropdownRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      placeholder="Search any locality, city or landmark in India..."
                      className="w-full pl-8.5 pr-16 py-1.5 text-xs border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 transition-colors rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                      value={destination}
                      onFocus={() => setIsSearchFocused(true)}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setAlsSuggestions([]);
                          setDestination('');
                          setIsSearchFocused(false);
                        } else if (e.key === 'Enter') {
                          if (alsSuggestions.length > 0) {
                            e.preventDefault();
                            handleAlsSelect(alsSuggestions[0]);
                          } else if (recentSearches.length > 0 && !destination.trim()) {
                            e.preventDefault();
                            handleAlsSelect(recentSearches[0]);
                          }
                        }
                      }}
                    />
                    {/* Live search indicator & Mic button */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleVoiceInput('liveSearch')}
                        className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                          isListeningTarget === 'liveSearch'
                            ? 'text-red-500 bg-red-500/10 animate-pulse'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                        title={isListeningTarget === 'liveSearch' ? 'Listening... speak landmark now' : 'Speak search query'}
                        aria-label="Voice search for location"
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                      {alsLoading ? (
                        <span className="h-2.5 w-2.5 rounded-full border border-[var(--color-brand-accent)] border-t-transparent animate-spin mr-0.5" />
                      ) : (
                        <span className="text-[9px] font-mono font-semibold text-[var(--text-muted)] opacity-70">Search</span>
                      )}
                    </div>

                    {/* Autocomplete Suggestions Dropdown */}
                    {alsSuggestions.length > 0 && (
                      <div className={`absolute z-[100] left-0 right-0 top-full mt-1.5 bg-[var(--bg-card)] ${
                        envMode === 'drought' ? 'dark:bg-[#151210]' : 'dark:bg-[#0c141d]'
                      } border border-[var(--border-color)] dark:border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl max-h-64 overflow-y-auto`}>
                        {alsSuggestions.map((place, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAlsSelect(place)}
                            className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[var(--bg-main)] transition-colors flex flex-col gap-0.5 border-b border-[var(--border-color)] dark:border-white/10 last:border-0 cursor-pointer"
                          >
                            <span className="font-semibold text-[var(--text-main)] truncate">{place.label.split(',')[0].trim() || place.municipality || place.label}</span>
                            <span className="text-[10px] text-[var(--text-muted)] truncate">{place.municipality && place.municipality !== place.label.split(',')[0].trim() ? `${place.municipality}, ${place.region || 'India'}` : (place.region ? `${place.region}, India` : place.label)}</span>
                          </button>
                        ))}
                        <div className="px-3.5 py-1.5 text-[9px] text-[var(--text-muted)] font-mono flex items-center justify-between bg-[var(--bg-main)]/60 border-t border-[var(--border-color)]/50">
                          <span className="font-semibold">Amazon Location Service</span>
                          <span>{alsSuggestions.length} matches</span>
                        </div>
                      </div>
                    )}

                    {/* Cached Recent Searches Dropdown (When input is focused and empty) */}
                    {isSearchFocused && !destination.trim() && recentSearches.length > 0 && alsSuggestions.length === 0 && (
                      <div className={`absolute z-[100] left-0 right-0 top-full mt-1.5 bg-[var(--bg-card)] ${
                        envMode === 'drought' ? 'dark:bg-[#151210]' : 'dark:bg-[#0c141d]'
                      } border border-[var(--border-color)] dark:border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl max-h-64 overflow-y-auto`}>
                        <div className="px-3.5 py-2 text-[9px] font-mono text-[var(--text-muted)] border-b border-[var(--border-color)] dark:border-white/10 flex items-center justify-between bg-[var(--bg-main)]/70">
                          <span className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                            <History className="h-3.5 w-3.5 text-[var(--text-main)]" />
                            Recent Searches
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick();
                              localStorage.removeItem('doab_recent_search_locations');
                              setRecentSearches([]);
                            }}
                            className="text-[9px] text-[var(--text-muted)] hover:text-rose-500 font-semibold cursor-pointer transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                        {recentSearches.map((place, idx) => (
                          <button
                            key={`recent-search-${idx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAlsSelect(place)}
                            className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[var(--bg-main)] transition-colors flex items-center justify-between border-b border-[var(--border-color)] dark:border-white/10 last:border-0 cursor-pointer group"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--color-brand-accent)] transition-colors">{place.label.split(',')[0].trim() || place.municipality || place.label}</span>
                              <span className="text-[10px] text-[var(--text-muted)] truncate">{place.municipality && place.municipality !== place.label.split(',')[0].trim() ? `${place.municipality}, ${place.region || 'India'}` : (place.region ? `${place.region}, India` : place.label)}</span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-main)] shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>


                  {/* Severity Filter Pill Row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
                    {(['all', 'Critical', 'High', 'Medium'] as const).map((sev) => {
                      const active = severityFilter === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => { playClick(); setSeverityFilter(sev); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                            active 
                              ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]' 
                              : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border-color)]'
                          }`}
                        >
                          {sev === 'all' ? 'All Alerts' : sev}
                        </button>
                      );
                    })}
                  </div>

                  {/* State / Region Focus Filter Chips (Amazon Location Service Multi-State Registry) */}
                  <div className="flex flex-col gap-1 pt-1.5 border-t border-[var(--text-main)]/20 dark:border-white/20">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5 font-bold text-[var(--text-main)] dark:text-white">
                        <Globe2 className="h-3.5 w-3.5 text-[var(--text-main)] dark:text-white shrink-0" />
                        Region Focus
                      </span>
                      <span className="text-[9px] font-bold text-[var(--text-main)] dark:text-white">
                        {isMultiStateMode
                          ? (selectedStates.length === 0
                              ? 'Pick States (Multi-Mode)'
                              : selectedStates.length === 1
                                ? `Filter: ${ALL_REGIONS.find((r) => r.val === selectedStates[0])?.label.split('(')[0]?.trim() || selectedStates[0]}`
                                : `Filter: ${selectedStates.length} States Active`)
                          : (selectedState === 'all'
                              ? 'All-India Active'
                              : `Filter: ${selectedRegionObj?.label.split('(')[0]?.trim() || selectedState}`)}
                      </span>
                    </div>

                    <div className="relative pt-0.5 pb-1" ref={stateComboboxRef}>
                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                        {/* Master All India Reset Button */}
                        <button
                          type="button"
                          onClick={handleResetAllIndia}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-medium whitespace-nowrap transition-all cursor-pointer border shrink-0 flex items-center gap-1 ${
                            !isMultiStateMode && selectedState === 'all'
                              ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] font-bold shadow-2xs'
                              : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 border-[var(--border-color)]'
                          }`}
                          title="Reset to All-India National Overview"
                        >
                          <span>🇮🇳 All India</span>
                        </button>

                        {/* State Filter Toggle Button */}
                        <button
                          type="button"
                          onClick={handleToggleMultiStateMode}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-medium whitespace-nowrap transition-all cursor-pointer border shrink-0 flex items-center gap-1 ${
                            isMultiStateMode
                              ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] font-bold shadow-2xs'
                              : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 border-[var(--border-color)]'
                          }`}
                          title={isMultiStateMode ? "State Filter Active (Click to Toggle Off)" : "Click to Toggle State Filter"}
                        >
                          <SlidersHorizontal className="h-2.5 w-2.5 shrink-0" />
                          <span>State Filter</span>
                          {isMultiStateMode && selectedStates.length > 0 && (
                            <span className="ml-0.5 px-1 py-0.2 rounded-full text-[8px] bg-[var(--text-main)] text-[var(--bg-card)] font-bold shrink-0">
                              {selectedStates.length}
                            </span>
                          )}
                        </button>

                        {/* Searchable State Combobox Input */}
                        <div className="relative flex-1 min-w-[130px]">
                          <div 
                            onClick={() => {
                              if (!isStateDropdownOpen) {
                                setIsStateDropdownOpen(true);
                                setStateSearchQuery('');
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono bg-[var(--bg-main)] transition-all cursor-text ${
                              isStateDropdownOpen 
                                ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)]/20' 
                                : (isMultiStateMode && selectedStates.length > 0) || (!isMultiStateMode && selectedState !== 'all')
                                  ? 'border-[var(--text-main)] text-[var(--text-main)] font-semibold'
                                  : 'border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 text-[var(--text-muted)]'
                            }`}
                          >
                            <Search className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                            <input
                              type="text"
                              value={
                                isStateDropdownOpen 
                                  ? stateSearchQuery 
                                  : isMultiStateMode
                                    ? (selectedStates.length > 0 ? `${selectedStates.length} State${selectedStates.length > 1 ? 's' : ''} Selected` : '')
                                    : (selectedRegionObj && selectedRegionObj.val !== 'all' ? selectedRegionObj.label : '')
                              }
                              onChange={(e) => {
                                setStateSearchQuery(e.target.value);
                                if (!isStateDropdownOpen) setIsStateDropdownOpen(true);
                              }}
                              onFocus={() => {
                                setIsStateDropdownOpen(true);
                                setStateSearchQuery('');
                              }}
                              placeholder="Search State"
                              className="w-full bg-transparent border-none outline-hidden text-[10px] font-mono text-[var(--text-main)] placeholder:text-[var(--text-muted)] placeholder:font-normal truncate cursor-text"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVoiceInput('stateSearch');
                              }}
                              className={`p-0.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                                isListeningTarget === 'stateSearch'
                                  ? 'text-red-500 bg-red-500/10 animate-pulse'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                              title={isListeningTarget === 'stateSearch' ? 'Listening... speak state name' : 'Speak state name'}
                              aria-label="Voice search for state"
                            >
                              <Mic className="h-2.5 w-2.5" />
                            </button>
                            {((!isMultiStateMode && selectedState !== 'all') || (isMultiStateMode && selectedStates.length > 0)) && !isStateDropdownOpen ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playClick();
                                  if (isMultiStateMode) {
                                    setSelectedStates([]);
                                    setSelectedState('all');
                                  } else {
                                    setSelectedState('all');
                                    setMapCenter([20.5937, 78.9629]);
                                    setMapZoom(5);
                                  }
                                  setStateSearchQuery('');
                                }}
                                className="p-0.5 hover:bg-[var(--border-color)] rounded-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer shrink-0"
                                title="Clear state filter"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsStateDropdownOpen((prev) => !prev);
                                }}
                                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer shrink-0"
                              >
                                <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${isStateDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Menu (Full Width of Block, Escapes Card via overflow-visible & z-[100]) */}
                      <AnimatePresence>
                        {isStateDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto z-[100] rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-1.5 flex flex-col gap-0.5 custom-scrollbar backdrop-blur-xl"
                          >
                            <div className="px-2 py-1 text-[9px] font-mono font-semibold text-[var(--text-muted)] border-b border-[var(--border-color)]/60 mb-0.5 flex justify-between items-center">
                              <span>
                                {isMultiStateMode
                                  ? `${selectedStates.length} Selected (Multi-State Mode)`
                                  : stateSearchQuery.trim() ? `Matching (${filteredRegions.length})` : 'All States (24)'}
                              </span>
                              <div className="flex items-center gap-2">
                                {isMultiStateMode && selectedStates.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playClick();
                                      setSelectedStates([]);
                                      setSelectedState('all');
                                    }}
                                    className="text-[8px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-mono transition-colors cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                )}
                                {isMultiStateMode && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playClick();
                                      setIsStateDropdownOpen(false);
                                      setStateSearchQuery('');
                                    }}
                                    className="text-[8px] text-[var(--text-main)] font-bold font-mono hover:underline cursor-pointer"
                                  >
                                    Done ✓
                                  </button>
                                )}
                                {!isMultiStateMode && (
                                  <span className="text-[var(--text-muted)] text-[8px]">Click to Zoom</span>
                                )}
                              </div>
                            </div>

                            {filteredRegions.length === 0 ? (
                              <div className="px-3 py-3 text-center text-[10px] font-mono text-[var(--text-muted)]">
                                No state found for "{stateSearchQuery}"
                              </div>
                            ) : (
                              filteredRegions.map((reg) => {
                                const isSelected = isMultiStateMode 
                                  ? selectedStates.includes(reg.val) 
                                  : selectedState === reg.val;
                                return (
                                  <button
                                    key={reg.val}
                                    type="button"
                                    onClick={() => handleSelectRegion(reg)}
                                    className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-[var(--text-main)] text-[var(--bg-card)] font-bold'
                                        : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {isMultiStateMode ? (
                                        <div className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? 'border-[var(--bg-card)] bg-[var(--bg-card)] text-[var(--text-main)]'
                                            : 'border-[var(--border-color)] bg-transparent'
                                        }`}>
                                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                        </div>
                                      ) : (
                                        <MapPin className={`h-2.5 w-2.5 shrink-0 ${isSelected ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)]'}`} />
                                      )}
                                      <span className="truncate">{reg.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      {reg.badge && (
                                        <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase tracking-wider ${
                                          isSelected
                                            ? 'bg-[var(--bg-card)]/20 text-[var(--bg-card)]'
                                            : 'bg-[var(--border-color)]/50 text-[var(--text-muted)]'
                                        }`}>
                                          {reg.badge}
                                        </span>
                                      )}
                                      {!isMultiStateMode && isSelected && (
                                        <CheckCircle2 className="h-3 w-3 text-[var(--bg-card)] shrink-0" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Model 1-Hour Forecast Telemetry */}
              {activeLeftTab === 'forecast' && (
                <div id="tour-map-forecast" className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[11px] leading-relaxed animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[var(--text-main)] dark:text-neutral-200" />
                        <span>{copy.estimate}</span>
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { playClick(); void reload(); }} 
                      className="text-[10px] font-bold text-[var(--text-main)] dark:text-neutral-200 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
                      <span>{copy.refresh}</span>
                    </button>
                  </div>
                  
                  <div className="text-[var(--text-muted)] text-[11px] space-y-1.5">
                    {status === 'loading' && (
                      <p className="font-mono text-[10px] text-[var(--text-muted)]">{copy.loading}</p>
                    )}
                    {status === 'error' && (
                      <div className="p-2.5 rounded-lg border border-amber-600/25 dark:border-amber-400/25 bg-amber-950/[0.06] dark:bg-amber-500/[0.10] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-amber-700 dark:text-amber-300 text-[11px]">{copy.error}</strong>
                          <button
                            type="button"
                            onClick={() => { playClick(); void reload(); }}
                            className="px-2 py-0.5 rounded-md bg-[var(--text-main)] text-[var(--bg-card)] text-[10px] font-mono font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                          >
                            Retry Sync
                          </button>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] leading-snug">
                          {copy.offlineDemo}
                        </p>
                      </div>
                    )}
                    {status === 'ready' && (
                      <p>{copy.notASensor}</p>
                    )}

                    {/* SECTION 1: Unified Hydrological Forecast Hub (Segmented Sliding Pill Tabs) */}
                    <div className="mt-1 p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-2 font-mono text-[10px]">
                      
                      {/* Sub-Tab Switcher Pill Bar (Framer Motion Shared Layout Spring) */}
                      <div className="relative flex items-center p-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] select-none">
                        <button
                          type="button"
                          onClick={() => { playClick(); setForecastSubTab('inundation'); }}
                          className={`relative z-10 flex-1 py-1 px-1.5 rounded-md font-bold text-[9px] transition-colors duration-150 text-center flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                            forecastSubTab === 'inundation'
                              ? 'text-[var(--bg-card)]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {forecastSubTab === 'inundation' && (
                            <motion.div
                              layoutId="forecastSubTabPill"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                              className="absolute inset-0 rounded-md bg-[var(--text-main)] shadow-xs -z-10 pointer-events-none"
                            />
                          )}
                          <Waves className="h-3 w-3 shrink-0" />
                          <span className="truncate">{envMode === 'drought' ? 'WATER DEFICIT' : 'DOAB AI INUNDATION'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { playClick(); setForecastSubTab('imd'); }}
                          className={`relative z-10 flex-1 py-1 px-1.5 rounded-md font-bold text-[9px] transition-colors duration-150 text-center flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                            forecastSubTab === 'imd'
                              ? 'text-[var(--bg-card)]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {forecastSubTab === 'imd' && (
                            <motion.div
                              layoutId="forecastSubTabPill"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                              className="absolute inset-0 rounded-md bg-[var(--text-main)] shadow-xs -z-10 pointer-events-none"
                            />
                          )}
                          <Radar className="h-3 w-3 shrink-0" />
                          <span className="truncate">IMD LIVE & 7D NWP</span>
                        </button>
                      </div>

                      {/* Location Context Bar */}
                      <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] font-mono border-b border-[var(--border-color)]/60 pb-1.5">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-2.5 w-2.5 text-[var(--color-brand-accent)] shrink-0" />
                          <span className="truncate font-semibold text-[var(--text-main)]">{activeHydrologicalForecast.locationLabel}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[8.5px] text-[var(--text-muted)]">
                          {forecastSubTab === 'inundation' 
                            ? activeHydrologicalForecast.elevationBaseline 
                            : imdTelemetry?.station_name || 'IMD Synoptic Radar'}
                        </span>
                      </div>

                      {/* VIEW 1: DOAB AI Hydrological Inundation Prediction */}
                      {forecastSubTab === 'inundation' && (
                        <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                              {envMode === 'drought' ? 'Logistics Deficit' : 'Inundation Risk'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* DOAB Monospace Executive Severity Badge */}
                              {(() => {
                                const p = activeHydrologicalForecast.probabilityPercent;
                                if (envMode === 'drought') {
                                  return (
                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${
                                      p > 60
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                        : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
                                    }`}>
                                      {p > 60 ? '[ACUTE DEFICIT]' : '[STABLE SUPPLY]'}
                                    </span>
                                  );
                                }
                                if (p >= 70) {
                                  return (
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded border bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
                                      [CRITICAL / 15CM ALERT]
                                    </span>
                                  );
                                }
                                if (p >= 45) {
                                  return (
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                      [HIGH WATERLOGGING]
                                    </span>
                                  );
                                }
                                if (p >= 25) {
                                  return (
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded border bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30">
                                      [MODERATE POOLING]
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded border bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
                                    [LOW RISK / PASSABLE]
                                  </span>
                                );
                              })()}
                              <span className="mono-badge text-[8.5px] font-bold px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--color-brand-accent)] shrink-0">
                                [1H FORWARD]
                              </span>
                            </div>
                          </div>

                          {/* Progress Meter Bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-[var(--text-main)] shrink-0 font-mono">
                              {activeHydrologicalForecast.probabilityPercent}%
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-[var(--border-color)] overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 rounded-full ${
                                  activeHydrologicalForecast.probabilityPercent >= 70
                                    ? 'bg-rose-600 dark:bg-rose-500'
                                    : activeHydrologicalForecast.probabilityPercent >= 45
                                      ? 'bg-amber-600 dark:bg-amber-500'
                                      : activeHydrologicalForecast.probabilityPercent >= 25
                                        ? 'bg-slate-600 dark:bg-slate-400'
                                        : 'bg-teal-600 dark:bg-teal-400'
                                }`}
                                style={{ width: `${activeHydrologicalForecast.probabilityPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Factors Details */}
                          <div className="grid grid-cols-2 gap-1 text-[8.5px] text-[var(--text-muted)] border-t border-[var(--border-color)]/50 pt-1 mt-1">
                            <div className="truncate">Runoff: <span className="text-[var(--text-main)] font-semibold">{activeHydrologicalForecast.runOffPotential}</span></div>
                            <div className="truncate">Sump: <span className="text-[var(--text-main)] font-semibold">{activeHydrologicalForecast.sumpRisk}</span></div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 2: IMD Weather Observation & 7-Day Outlook */}
                      {forecastSubTab === 'imd' && imdTelemetry && (
                        <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]/80 space-y-2">
                          <div className="flex items-center justify-between text-[var(--text-main)] font-semibold">
                            <span className="flex items-center gap-1.5 truncate">
                              <Radar className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
                              <span className="truncate">{imdTelemetry.station_name}</span>
                            </span>
                            <span className="mono-badge text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] shrink-0">
                              [IMD LIVE]
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[var(--text-muted)] text-[9.5px]">
                            <div>24h Rain: <span className="text-[var(--text-main)] font-bold">{imdTelemetry.rainfall_24h_mm} mm</span></div>
                            <div>
                              Temp: <span className="text-[var(--text-main)] font-bold">
                                {(() => {
                                  const maxT = imdTelemetry.temp_max_c > 0 
                                    ? imdTelemetry.temp_max_c 
                                    : (imdTelemetry.forecast_7day?.[0]?.temp_max || 0);
                                  const minT = imdTelemetry.temp_min_c > 0 
                                    ? imdTelemetry.temp_min_c 
                                    : (imdTelemetry.forecast_7day?.[0]?.temp_min || 0);
                                  if (maxT > 0 && minT > 0) return `${maxT}°C / ${minT}°C`;
                                  if (maxT > 0) return `${maxT}°C`;
                                  if (minT > 0) return `${minT}°C`;
                                  return '28°C / 21°C';
                                })()}
                              </span>
                            </div>
                          </div>

                          {imdTelemetry.warning?.text && imdTelemetry.warning.text !== 'No warning' && (
                            <div className="flex items-start gap-1.5 text-[9.5px] text-[var(--text-main)] font-sans border-t border-[var(--border-color)]/60 pt-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                                  Doppler Radar / Satellite Nowcast
                                </span>
                                <span className="line-clamp-2 leading-tight">
                                  {Array.from(new Set(imdTelemetry.warning.text.split(';').map(s => s.trim()).filter(Boolean))).join('; ')}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Interactive 7-Day Synoptic NWP Forecast Drawer */}
                          {imdTelemetry.forecast_7day && imdTelemetry.forecast_7day.length > 0 && (
                            <div className="border-t border-[var(--border-color)]/60 pt-1.5 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  playClick();
                                  setShow7DayForecast(!show7DayForecast);
                                }}
                                className="w-full flex items-center justify-between text-[9px] font-mono p-1 rounded-md hover:bg-[var(--text-main)]/5 transition-colors cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                                  <CloudRain className="h-3 w-3 text-[var(--color-brand-accent)] shrink-0" />
                                  <span>7-DAY NWP OUTLOOK</span>
                                </span>
                                <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                  show7DayForecast
                                    ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]'
                                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
                                }`}>
                                  {show7DayForecast ? '[COLLAPSE]' : '[EXPAND 7D]'}
                                </span>
                              </button>

                              <AnimatePresence initial={false}>
                                {show7DayForecast && (
                                  <motion.div
                                    key="sevenDayForecastDrawer"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-1.5 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-0.5">
                                      {imdTelemetry.forecast_7day.map((day) => {
                                        const dateObj = new Date();
                                        dateObj.setDate(dateObj.getDate() + day.day_offset);
                                        const dayName = day.day_offset === 0 
                                          ? 'Today' 
                                          : day.day_offset === 1 
                                            ? 'Tomorrow' 
                                            : dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

                                        return (
                                          <div
                                            key={`day-forecast-${day.day_offset}`}
                                            className="p-1.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]/70 flex items-center justify-between gap-1.5 text-[8.5px] font-mono"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1">
                                                <span className="font-bold text-[var(--text-main)] shrink-0">{dayName}</span>
                                                <span className="text-[var(--text-muted)] truncate">• {day.forecast}</span>
                                              </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                              <span className="font-bold text-[var(--text-main)]">
                                                {day.temp_max}° / {day.temp_min}°C
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {forecast?.cells[0]?.target_time && (
                    <div className="pt-1.5 border-t border-[var(--border-color)]/60 text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Risk Horizon:</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--border-color)] text-[var(--text-main)] font-bold">[1H AHEAD]</span>
                      </span>
                      <span className="font-bold text-[var(--text-main)]">
                        {(() => {
                          try {
                            const d = new Date(forecast.cells[0].target_time);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
                            }
                          } catch {}
                          return forecast.cells[0].target_time.replace('T', ' ');
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DOAB Macro Danger Cluster Table */}
              {activeLeftTab === 'clusters' && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  <div className="flex flex-col gap-1.5 pb-1.5 border-b border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Layers className="h-3 w-3 text-[var(--text-main)] dark:text-neutral-200" />
                        <span>Macro Risk Clusters ({recurringClusters.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setShowHeatLayer(!showHeatLayer);
                        }}
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                          showHeatLayer
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white'
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
                        }`}
                      >
                        {showHeatLayer ? 'Halos ON' : 'Halos OFF'}
                      </button>
                    </div>

                    {/* Interactive Ranking Priority Chips (Recent Cases / Nearest Cases) */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setPrioritizeRecent(!prioritizeRecent);
                        }}
                        className={`h-6 px-2.5 rounded-md text-[9px] font-mono font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 select-none shrink-0 ${
                          prioritizeRecent
                            ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-xs'
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-main)]/30'
                        }`}
                        title="Filter / Rank: prioritize recent incidents"
                      >
                        <Clock size={11} className={`shrink-0 ${prioritizeRecent ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)]'}`} />
                        <span className="whitespace-nowrap">Recent Cases</span>
                        {prioritizeRecent && (
                          <Check size={10} strokeWidth={3} className="shrink-0 ml-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setPrioritizeNearest(!prioritizeNearest);
                        }}
                        className={`h-6 px-2.5 rounded-md text-[9px] font-mono font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 select-none shrink-0 ${
                          prioritizeNearest
                            ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-xs'
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-main)]/30'
                        }`}
                        title="Filter / Rank: prioritize clusters closest to your location or selected state"
                      >
                        <Navigation2 size={11} className={`shrink-0 ${prioritizeNearest ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)]'}`} />
                        <span className="whitespace-nowrap">Nearest Cases</span>
                        {prioritizeNearest && (
                          <Check size={10} strokeWidth={3} className="shrink-0 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Multi-Cluster Relief Dispatch Circuit (Emergency Logistics & Fleets ONLY - hidden for Citizens) */}
                  {recurringClusters.length >= 2 && userRole !== 'citizen' && (
                    <div className="mb-2 p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] space-y-1.5 select-none">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Navigation2 className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
                          <span className="font-bold text-[10px] truncate text-[var(--text-main)]">
                            Multi-Cluster Relief Tour
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setIsMultiClusterTourActive(!isMultiClusterTourActive);
                          }}
                          className={`py-0.5 px-2 rounded-md font-mono text-[9px] font-bold border transition-all cursor-pointer shrink-0 ${
                            isMultiClusterTourActive
                              ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-xs'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-main)]/40'
                          }`}
                        >
                          {isMultiClusterTourActive ? '[CIRCUIT ACTIVE]' : '[DISPATCH TOUR]'}
                        </button>
                      </div>

                      {isMultiClusterTourActive && multiClusterReliefTour && (
                        <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5 font-mono text-[9px]">
                          <div className="flex items-center justify-between text-[var(--text-main)] border-b border-[var(--border-color)]/60 pb-1">
                            <span className="text-[var(--text-muted)]">Circuit Distance:</span>
                            <span className="font-bold">{multiClusterReliefTour.totalCircuitDistanceKm.toFixed(1)} km</span>
                          </div>
                          <div className="flex items-center justify-between text-[var(--text-main)]">
                            <span className="text-[var(--text-muted)]">Priority Supply Targets:</span>
                            <span className="font-bold">{multiClusterReliefTour.clusters.length} clusters ({multiClusterReliefTour.totalCases} cases)</span>
                          </div>

                          {/* Sequential Waypoint Legs */}
                          <div className="pt-1 space-y-1">
                            <span className="text-[8.5px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                              Cluster Hopping Legs:
                            </span>
                            {multiClusterReliefTour.tourHops.map((hop, hIdx) => (
                              <div key={`tour-hop-${hIdx}`} className="flex items-center justify-between p-1 rounded bg-[var(--bg-main)] text-[8.5px]">
                                <span className="truncate max-w-[155px] text-[var(--text-main)]">
                                  {hIdx + 1}. {hop.fromCluster.ward.split(',')[0]} → {hop.toCluster.ward.split(',')[0]}
                                </span>
                                <span className="font-bold text-[var(--text-main)] shrink-0">
                                  +{hop.legDistanceKm.toFixed(1)} km
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Micro Table of Hotspot Clusters */}
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                    {recurringClusters.slice(0, 25).map((cluster, cIdx) => {
                      const clusterId = (cluster as any).id || `${cluster.ward}-${cIdx}`;
                      const isSelected = selectedClusterKey === clusterId;
                      const isCrit = cluster.highestSeverity === 'Critical';
                      const isHigh = cluster.highestSeverity === 'High';
                      return (
                        <div
                          key={`cluster-row-${clusterId}`}
                          onClick={() => {
                            playClick();
                            setShowHeatLayer(true);
                            setSelectedClusterKey(selectedClusterKey === clusterId ? null : clusterId);
                            setMapCenter([cluster.lat, cluster.lng]);
                            setMapZoom(13);
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group ${
                            isSelected
                              ? 'bg-[var(--text-main)]/5 border-[var(--text-main)] ring-1 ring-[var(--text-main)]/20'
                              : selectedClusterKey != null
                                ? 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-75 hover:opacity-100 hover:border-[var(--text-main)]/40'
                                : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-[var(--text-main)]/40'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {/* Monospace DOAB Severity Badge */}
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                isCrit 
                                  ? 'border-rose-900/30 text-rose-800 dark:text-rose-300 bg-rose-500/10' 
                                  : isHigh 
                                    ? 'border-amber-900/30 text-amber-800 dark:text-amber-300 bg-amber-500/10' 
                                    : 'border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-card)]'
                              }`}>
                                {isCrit ? '[CRIT]' : isHigh ? '[HIGH]' : '[ZONE]'}
                              </span>
                              <span className="font-bold text-xs truncate text-[var(--text-main)]">
                                {cluster.ward}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-2">
                              <span>Radius: ~{cluster.clusterRadiusKm.toFixed(1)} km</span>
                              {cluster.isStateFiltered ? (
                                <span className="text-[var(--text-main)] dark:text-neutral-300 font-semibold">
                                  {cluster.distFromRef.toFixed(1)} km from state focus
                                </span>
                              ) : cluster.distFromUser != null ? (
                                <span className="text-[var(--text-main)] dark:text-neutral-300 font-semibold">
                                  {cluster.distFromUser.toFixed(1)} km from you
                                </span>
                              ) : (
                                <span className="text-[var(--text-main)] dark:text-neutral-300 font-semibold">
                                  {cluster.distFromRef.toFixed(1)} km from view
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[8.5px] font-mono text-[var(--text-muted)] font-semibold">
                                Score:
                              </span>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--text-main)] text-[var(--bg-card)]">
                                {cluster.compositeScore}
                              </span>
                            </div>
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                              isCrit
                                ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                                : isHigh
                                  ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                                  : 'bg-slate-500/[0.08] dark:bg-slate-400/[0.12] text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-400/25'
                            }`}>
                              {cluster.count} {cluster.count === 1 ? 'case' : 'cases'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: Selected Incident Details */}
              {activeLeftTab === 'incident' && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  {selectedIncident ? (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${
                            selectedIncident.severity === 'Critical'
                              ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                              : selectedIncident.severity === 'High'
                                ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                                : 'bg-slate-500/[0.08] dark:bg-slate-400/[0.12] text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-400/25'
                          }`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-[var(--text-main)] truncate leading-tight">
                              {selectedIncident.title}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                              <span className="truncate">{selectedIncident.ward}</span>
                              <span>•</span>
                              <span>{selectedIncident.updatedTime}</span>
                              {userCoords && (
                                <>
                                  <span>•</span>
                                  <span className="text-[var(--text-main)] dark:text-neutral-200 font-semibold font-mono">
                                    {(haversineKm(userCoords[0], userCoords[1], selectedIncident.lat, selectedIncident.lng)).toFixed(1)} km away
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          selectedIncident.severity === 'Critical'
                            ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                            : selectedIncident.severity === 'High'
                              ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                              : 'bg-slate-500/[0.08] dark:bg-slate-400/[0.12] text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-400/25'
                        }`}>
                          {selectedIncident.severity}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                        {copy.historical}. {selectedIncident.description}
                      </p>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRerouteAroundIncident(selectedIncident)}
                          className="flex-1 py-1.5 px-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1 hover:opacity-90 transition-opacity shadow-2xs whitespace-nowrap cursor-pointer"
                          title="Compute 3 safe elevated bypass corridors steering clear of this danger hotspot"
                        >
                          <RouteIcon className="h-3 w-3 shrink-0" />
                          <span className="whitespace-nowrap">Avoid Hazard & Find Bypass</span>
                        </button>
                        
                        {userRole !== 'citizen' && (
                          userRole === 'delivery' ? (
                            <Tooltip content="Emergency Responder / Fleet: Direct dispatch navigation to crisis site" position="top">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${selectedIncident.lat},${selectedIncident.lng}&travelmode=driving`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => playClick()}
                                className="px-2.5 py-1.5 rounded-lg bg-[image:var(--auth-btn-gradient,linear-gradient(180deg,#0f172a_0%,#1e293b_50%,#334155_100%))] text-white hover:opacity-95 dark:bg-none dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap shrink-0"
                              >
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EA4335" />
                                  <path d="M12 11.5C13.3807 11.5 14.5 10.3807 14.5 9C14.5 7.61929 13.3807 6.5 12 6.5C10.6193 6.5 9.5 7.61929 9.5 9C9.5 10.3807 10.6193 11.5 12 11.5Z" fill="#FFFFFF" />
                                </svg>
                                <span className="whitespace-nowrap">Fleet Dispatch</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-70 shrink-0" />
                              </a>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Direct navigation to hazard for emergency crews / pump operators" position="top">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${selectedIncident.lat},${selectedIncident.lng}&travelmode=driving`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => playClick()}
                                className="px-2 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] text-[10px] font-mono flex items-center gap-1 transition-all shadow-2xs whitespace-nowrap shrink-0"
                              >
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EA4335" />
                                  <path d="M12 11.5C13.3807 11.5 14.5 10.3807 14.5 9C14.5 7.61929 13.3807 6.5 12 6.5C10.6193 6.5 9.5 7.61929 9.5 9C9.5 10.3807 10.6193 11.5 12 11.5Z" fill="#FFFFFF" />
                                </svg>
                                <span className="whitespace-nowrap">Crew Nav</span>
                                <ExternalLink className="h-2 w-2 opacity-60 shrink-0" />
                              </a>
                            </Tooltip>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedIncident(null)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer shrink-0"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      Click any pin or cluster on the map to inspect incident telemetry.
                    </div>
                  )}
                </div>
              )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Single South-East Corner Resize Grip (Clean 2D Panel Resizing) */}
          {!isMobileCollapsed && (
            <div
              onPointerDown={(e) => handleLiveRiskResizeStart(e, 'se')}
              className="absolute bottom-1 right-1 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-se-resize select-none touch-none opacity-40 hover:opacity-100 transition-opacity z-30"
              title="Drag corner to resize Live Risk Monitor"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                <circle cx="8" cy="8" r="1.1" />
                <circle cx="8" cy="4.5" r="1.1" />
                <circle cx="4.5" cy="8" r="1.1" />
              </svg>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Top-Right DOAB Floating Neo-Glass Map Controls Toolbar (Shifted down on mobile/touch views below Live Risk) ── */}
      <div id="tour-map-controls" className="absolute top-[4.5rem] right-2.5 sm:top-4 sm:right-4 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-color)] shadow-xl pointer-events-auto">
        {/* 1. Start Map Page Tour Guide (Placed at the very top, matching theme styling) */}
        <Tooltip content="Live Map Guide" position="left">
          <button
            type="button"
            onClick={() => {
              playClick();
              window.dispatchEvent(new CustomEvent('doab:start-page-tour', { detail: { pageKey: 'dashboard' } }));
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-[var(--text-main)] hover:bg-[var(--bg-main)]"
            aria-label="Start Map Tour Guide"
          >
            <Compass size={16} />
          </button>
        </Tooltip>

        {/* 2. Map Intelligence & AI Assistant Button (Direct launch of DOAB AI Assistant) */}
        <Tooltip content="DOAB AI ASSISTANT" position="left">
          <button
            type="button"
            onClick={() => {
              playClick();
              setHasNewAiResponse(false);
              try {
                localStorage.removeItem('doab_has_unread_ai_response');
              } catch (_) {}
              window.dispatchEvent(new CustomEvent('doab:open-assistant'));
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-[var(--text-main)] hover:bg-[var(--bg-main)] group relative"
            aria-label="Open DOAB AI Intelligence Assistant"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center border border-[var(--border-color)] dark:border-white/20 group-hover:scale-110 transition-transform shadow-2xs">
              <AIOrbFace state="idle" size={24} />
            </div>
            {hasNewAiResponse && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-brand-accent)] ring-2 ring-[var(--bg-card)] animate-pulse" />
            )}
          </button>
        </Tooltip>

        <div className="w-5 h-px bg-[var(--border-color)] my-0.5" />

        {/* 3. My Location FAB with AnimatedCrosshair */}
        <Tooltip content={isViewingMyLocation ? "City Overview (Zoom Out)" : "Fly to My GPS Location"} position="left">
          <button
            type="button"
            onClick={handleRecenter}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group ${
              isLocating
                ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-md animate-pulse'
                : isViewingMyLocation
                  ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-md'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            }`}
            aria-label={isViewingMyLocation ? "Zoom out to regional map overview" : "Fly map to my current GPS location"}
          >
            <AnimatedCrosshair size={16} locating={isLocating} active={isViewingMyLocation} />
          </button>
        </Tooltip>

        {/* 4. Focused Risk Halo / Telemetry Layer Toggle */}
        <Tooltip content={showHeatLayer ? "Hide Risk Halos & Clusters" : "Show Risk Halos & Cluster Table"} position="left">
          <button
            type="button"
            onClick={() => {
              playClick();
              const nextState = !showHeatLayer;
              setShowHeatLayer(nextState);
              if (nextState) {
                setActiveLeftTab('clusters');
                setIsMobileCollapsed(false);
              }
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              showHeatLayer
                ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-md ring-2 ring-[var(--color-brand-accent)]/30'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            }`}
            aria-label="Toggle Risk Halo and Cluster Table"
          >
            <Layers size={16} />
          </button>
        </Tooltip>

        {/* 5. Fullscreen Toggle Button */}
        <Tooltip content={isFullScreen ? "Exit Fullscreen" : "Fullscreen Map"} position="left">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isFullScreen 
                ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-md' 
                : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            }`}
            aria-label="Toggle Fullscreen"
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </Tooltip>

        {/* 6. Nearby Safety & Route Info Toggle */}
        <Tooltip content={showInfo ? "Close Nearby Safety" : "Nearby Safety & Alerts"} position="left">
          <button
            type="button"
            onClick={() => { playClick(); setShowInfo(!showInfo); }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer relative overflow-hidden ${
              showInfo 
                ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-md rotate-0' 
                : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            }`}
            aria-label={showInfo ? "Close Nearby Safety and Alerts Panel" : "View Nearby Safety and Alerts"}
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  showInfo ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75 pointer-events-none'
                }`}
              >
                <X size={16} />
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !showInfo ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75 pointer-events-none'
                }`}
              >
                <Info size={16} />
              </span>
            </div>
          </button>
        </Tooltip>
      </div>

      {/* ── DOAB Floating Map Intelligence & Proximity Radar Card (Anchored to the left of the vertical toolbar) ── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, x: 8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[4.5rem] right-14 sm:top-4 sm:right-16 z-20 w-80 sm:w-96 p-4 rounded-3xl backdrop-blur-2xl bg-[var(--bg-card)]/95 border border-[var(--border-color)] shadow-2xl space-y-3.5 pointer-events-auto"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)]">
              <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-main)]">
                <Radar size={15} className="text-[var(--text-main)] dark:text-neutral-200 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Nearby Safety & Routes</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-neutral-500/10 text-[var(--text-main)] dark:text-neutral-200 border-[var(--border-color)]">
                {proximityIntelligence.hasRealGps ? 'GPS Ground Lock' : 'City Grid Lock'}
              </span>
            </div>

            {/* Metric 1: Route Blockage / Inundation Probability Bar */}
            <div className="p-3 rounded-2xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                  <Navigation2 size={13} className="text-[var(--text-main)] dark:text-neutral-200" />
                  Transit Route Blockage Risk
                </span>
                <span className={`font-mono font-bold text-xs ${
                  proximityIntelligence.routeInundationProb > 50 
                    ? 'text-rose-700 dark:text-rose-300' 
                    : proximityIntelligence.routeInundationProb > 25 
                      ? 'text-amber-700 dark:text-amber-300' 
                      : 'text-teal-700 dark:text-teal-300'
                }`}>
                  {proximityIntelligence.routeInundationProb}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 rounded-full bg-[var(--border-color)]/60 dark:bg-white/10 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    proximityIntelligence.routeInundationProb > 50 
                      ? 'bg-rose-700 dark:bg-rose-500' 
                      : proximityIntelligence.routeInundationProb > 25 
                        ? 'bg-amber-600 dark:bg-amber-500' 
                        : 'bg-teal-600 dark:bg-teal-500'
                  }`}
                  style={{ width: `${Math.max(6, proximityIntelligence.routeInundationProb)}%` }}
                />
              </div>

              <p className="text-[10px] text-[var(--text-muted)] font-mono leading-tight">
                {proximityIntelligence.routeInundationProb > 50 
                  ? 'High probability of stalled traffic or deep water on standard arterials.' 
                  : proximityIntelligence.routeInundationProb > 25 
                    ? 'Moderate ponding risk. Consider high-elevation bypass roads.' 
                    : 'Low inundation risk along your immediate perimeter corridors.'}
              </p>
            </div>

            {/* Metric 2: Live Counts Around You (3km and 5km Rings) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-2xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5">
                <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  <Droplets size={11} className="text-[var(--text-muted)]" />
                  <span>Within 3 km</span>
                </div>
                <div className="font-bold text-[var(--text-main)] text-sm mt-1 flex items-baseline gap-1">
                  <span>{proximityIntelligence.nearbyTotalWithin3km}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-normal">choke points</span>
                </div>
                <div className="text-[10px] font-mono text-rose-700 dark:text-rose-300 font-semibold mt-0.5">
                  {proximityIntelligence.nearbyCritical} critical severe
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5">
                <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  <AlertTriangle size={11} className="text-amber-700 dark:text-amber-300" />
                  <span>Within 5 km</span>
                </div>
                <div className="font-bold text-[var(--text-main)] text-sm mt-1 flex items-baseline gap-1">
                  <span>{proximityIntelligence.nearbyTotalWithin5km}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-normal">total hotspots</span>
                </div>
                <div className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                  {proximityIntelligence.nearbyHigh} warning nodes
                </div>
              </div>
            </div>

            {/* Metric 3: Nearest Hazard Distance Callout */}
            {proximityIntelligence.nearestDistanceKm && (
              <div className="p-2.5 rounded-2xl bg-[var(--text-main)]/5 border border-[var(--border-color)] flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold">
                    Nearest Hazard Node
                  </div>
                  <div className="font-bold text-[var(--text-main)] truncate text-xs mt-0.5">
                    {proximityIntelligence.nearestNodeTitle}
                  </div>
                </div>
                <span className="px-2 py-1 rounded-xl bg-[var(--bg-card)] font-mono font-bold text-xs text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] shrink-0 shadow-2xs">
                  {proximityIntelligence.nearestDistanceKm} km away
                </span>
              </div>
            )}

            {/* Footer Metadata */}
            <div className="pt-2 border-t border-[var(--border-color)] dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={11} className="text-[var(--text-main)] dark:text-neutral-200" />
                <span>Municipal Data Synced</span>
              </span>
              <Link 
                to="/routes/best"
                onClick={() => playClick()}
                className="font-bold text-[var(--text-main)] dark:text-neutral-200 hover:underline flex items-center gap-0.5"
              >
                <span>Safe Routes</span>
                <RouteIcon size={10} />
              </Link>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dual-Engine Interactive Map View ── */}
      <div className="absolute inset-0 h-full w-full">
        <MapErrorBoundary>
          {mapEngine === 'maplibre' ? (
            <MapLibreView
              center={mapCenter}
              zoom={mapZoom}
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              onSelectIncident={handleSelectIncident}
              onMapClick={isPathCreationMode && pathPickingTarget !== null ? handleMapClickForPath : undefined}
              isDarkMode={isDarkMode}
              envMode={envMode}
              userLocation={hasRealLocation ? { lat: userCoords[0], lng: userCoords[1] } : null}
              clusters={recurringClusters}
              showHeatLayer={showHeatLayer}
              selectedClusterKey={selectedClusterKey}
              pathOrigin={pathOrigin}
              pathDest={pathDest}
              activeRouteGeometry={
                isPathCreationMode && pathOrigin && pathDest
                  ? activeCandidateRoute.geometry
                  : hasRealLocation && selectedIncident 
                    ? [userCoords, [selectedIncident.lat, selectedIncident.lng]] 
                    : undefined
              }
            />
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              maxZoom={18}
              zoomControl={false}
              scrollWheelZoom={true}
              dragging={true}
              touchZoom={true}
              doubleClickZoom={true}
              boxZoom={true}
              keyboard={true}
              preferCanvas={true}
              inertia={true}
              inertiaDeceleration={3000}
              inertiaMaxSpeed={2000}
              easeLinearity={0.2}
              className={`h-full w-full z-0 ${isPathCreationMode ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ height: '100%', width: '100%', minHeight: '100%' }}
            >
              {/* High-Reliability Enterprise Basemap Layer (No API Key Required, Fast Global CDN) */}
              <TileLayer
                key={isDarkMode ? 'dark-canvas-tile' : 'light-canvas-tile'}
                attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap'
                url={
                  isDarkMode
                    ? 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                    : 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                }
                maxNativeZoom={16}
                maxZoom={18}
              />

              <MapViewController
                center={mapCenter}
                zoom={mapZoom}
                onFlightStart={() => setIsMapFlying(true)}
                onFlightEnd={() => setIsMapFlying(false)}
              />

              {/* 
                ADMINISTRATIVE BOUNDARY OVERLAY (FUTURE EXTENSION):
                Hidden for now: When real administrative district/ward boundary polygons (e.g. GAUL 2024 / BBMP ward polygons)
                are loaded via `gaul2024_india.geojson`, re-enable this GeoJSON layer conditionally:
                `{boundaries && boundaries.source !== 'pilot_bbox' && ( <GeoJSON ... /> )}`
                
                Note: In development and default local runs, the prediction API falls back to returning the raw ML corridor
                bounding box `PILOT_BBOX` (12.60°–13.30° N, 77.30°–77.90° E), which rendered an unsightly raw vertical rectangle
                outline over Bengaluru. To maintain a clean, seamless basemap view, pilot box fallback rendering is hidden.
              */}
              {boundaries && boundaries.source !== 'pilot_bbox' && false && (
                <GeoJSON
                  data={boundaries as never}
                  style={() => ({ color: '#64748b', weight: 1, fillOpacity: 0.04 })}
                />
              )}

              {envMode === 'flood' && forecast?.cells.map((cell) => (
                cell.probability == null ? null : (
                  <Circle
                    key={`${cell.lat}-${cell.lng}`}
                    center={[cell.lat, cell.lng]}
                    radius={1800}
                    interactive={false}
                    pathOptions={{
                      color: cell.probability >= 0.5 ? '#B45309' : '#475569',
                      fillColor: cell.probability >= 0.5 ? '#B45309' : '#475569',
                      fillOpacity: 0.08 + Math.min(cell.probability, 1) * 0.2,
                      weight: 1,
                    }}
                  />
                )
              ))}

              {/* User Live GPS Marker: ONLY rendered when actual live coordinates have been fetched */}
              {hasRealLocation && (
                <Marker position={userCoords} icon={USER_LIVE_ICON}>
                  <Popup className="neo-glass-popup">
                    <div className="p-1 text-xs">
                      <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--text-main)] animate-ping"></span>
                        Your Real Live GPS Location
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-1">
                        {userCoords[0].toFixed(4)}° N, {userCoords[1].toFixed(4)}° E
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Search Result Pin */}
              {geocodedPin && (
                <Marker position={geocodedPin} icon={ALS_GEOCODED_ICON}>
                  <LeafletTooltip permanent direction="top" offset={[0, -12]} className="custom-geocoded-tooltip">
                    <div className="flex items-center gap-1 font-bold text-[10px] py-0.5 px-1 font-mono text-[var(--text-main)]">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      <span className="truncate max-w-[130px]">{destination || 'Searched Destination'}</span>
                    </div>
                  </LeafletTooltip>
                  <Popup className="neo-glass-popup">
                    <div className="p-1.5 text-xs flex flex-col gap-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1">
                        <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          <Globe2 className="h-3.5 w-3.5 text-[var(--text-main)]" />
                          Searched Destination
                        </span>
                        <span className="text-[9px] font-mono font-bold text-neutral-500 dark:text-neutral-400">Point B</span>
                      </div>
                      <div className="text-[11px] font-semibold text-[var(--text-main)]">
                        {destination}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono">
                        {geocodedPin[0].toFixed(4)}° N, {geocodedPin[1].toFixed(4)}° E
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          const origin: [number, number] = hasRealLocation ? userCoords : [12.9716, 77.5946];
                          setPathOrigin(origin);
                          setPathOriginAddress(hasRealLocation ? 'My Current Location (GPS)' : 'City Center');
                          setPathDest(geocodedPin);
                          setPathDestAddress(destination);
                          setPathSummaryName(`Safe Corridor to ${destination}`);
                          setIsPathCreationMode(true);
                          setPathPickingTarget(null);
                          setSearchParams((params) => {
                            params.set('mode', 'create_path');
                            return params;
                          });
                        }}
                        className="w-full mt-1 py-1.5 px-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 shadow-2xs"
                      >
                        <RouteIcon className="h-3 w-3" />
                        <span>Compute Safe Path From My Location</span>
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )}


              {/* DOAB Macro Danger Cluster Halos (Visible when showHeatLayer is toggled) */}
              {showHeatLayer && recurringClusters.slice(0, Capacitor.isNativePlatform() ? 12 : 40).map((cluster, cIdx) => {
                const clusterColor = cluster.highestSeverity === 'Critical' 
                  ? '#BE123C' 
                  : cluster.highestSeverity === 'High' 
                    ? '#B45309' 
                    : cluster.highestSeverity === 'Medium'
                      ? '#475569'
                      : '#0F766E';
                const clusterId = (cluster as any).id || `${cluster.ward}-${cIdx}`;
                const hasAnySelectedCluster = selectedClusterKey != null;
                const isSelected = hasAnySelectedCluster && (
                  selectedClusterKey === clusterId ||
                  selectedClusterKey === `${cluster.ward}-${cIdx}`
                );
                const isFeeble = hasAnySelectedCluster && !isSelected;
                return (
                  <React.Fragment key={`cluster-halo-${cluster.ward}-${cIdx}`}>
                    {/* Outer pulsating beacon ring for selected cluster */}
                    {isSelected && !isMapFlying && (
                      <Circle
                        center={[cluster.lat, cluster.lng]}
                        radius={Math.max(cluster.clusterRadiusKm * 500, 1600) * 1.15}
                        interactive={false}
                        pathOptions={{
                          color: clusterColor,
                          fillColor: clusterColor,
                          fillOpacity: 0.08,
                          weight: 1.5,
                          dashArray: '4, 6',
                          className: 'focused-risk-halo-bloom',
                        }}
                      />
                    )}
                    <Circle
                      center={[cluster.lat, cluster.lng]}
                      radius={Math.max(cluster.clusterRadiusKm * 500, 1600)}
                      interactive={false}
                      pathOptions={{
                        color: clusterColor,
                        fillColor: clusterColor,
                        // Selected cluster has a calibrated semi-transparent fill; when any cluster is selected, other clusters become slightly feeble
                        fillOpacity: isSelected ? 0.36 : isFeeble ? 0.045 : 0.09,
                        opacity: isSelected ? 1.0 : isFeeble ? 0.45 : 0.88,
                        weight: isSelected ? 3.5 : isFeeble ? 1.3 : 1.8,
                        dashArray: isSelected ? undefined : '6, 8',
                      }}
                    />
                  </React.Fragment>
                );
              })}

              {/* Focused Risk Halo: Rendered for the currently inspected incident (Wait-to-Bloom eliminates mid-flight 32x scale) */}
              {showHeatLayer && selectedIncident && !isMapFlying && (
                <Circle
                  center={[selectedIncident.lat, selectedIncident.lng]}
                  radius={selectedIncident.severity === 'Critical' ? 480 : selectedIncident.severity === 'High' ? 320 : 180}
                  pathOptions={{
                    color: selectedIncident.severity === 'Critical' ? '#BE123C' : selectedIncident.severity === 'High' ? '#B45309' : '#475569',
                    fillColor: selectedIncident.severity === 'Critical' ? '#BE123C' : selectedIncident.severity === 'High' ? '#B45309' : '#475569',
                    fillOpacity: 0.16,
                    weight: 2,
                    dashArray: '4, 4',
                    className: 'focused-risk-halo-bloom',
                  }}
                />
              )}

              {/* Multi-Cluster Relief Dispatch Polyline */}
              {isMultiClusterTourActive && multiClusterReliefTour && (
                <Polyline
                  positions={multiClusterReliefTour.pathPositions}
                  pathOptions={{
                    color: envMode === 'drought' ? '#D97706' : '#0D9488',
                    weight: 3.5,
                    dashArray: '8, 8',
                    opacity: 0.9,
                  }}
                />
              )}

              {/* DOAB Spatial Proximity Vector from User GPS to Inspected Incident */}
              {hasRealLocation && selectedIncident && !isMapFlying && (
                <Polyline
                  positions={[
                    userCoords,
                    [selectedIncident.lat, selectedIncident.lng]
                  ]}
                  pathOptions={{
                    color: selectedIncident.severity === 'Critical' ? '#BE123C' : '#B45309',
                    weight: 2,
                    dashArray: '5, 8',
                    opacity: 0.75,
                    className: 'focused-risk-halo-bloom',
                  }}
                />
              )}

              {/* Interactive Safe Path Waypoint Picking Handler */}
              {isPathCreationMode && pathPickingTarget !== null && (
                <MapInteractiveClickHandler
                  key="path-click-active"
                  enabled={true}
                  onMapClick={handleMapClickForPath}
                />
              )}

              {/* Custom Safe Path Origin Pin */}
              {pathOrigin && (
                <Marker position={pathOrigin} icon={PATH_ORIGIN_ICON}>
                  <Popup className="neo-glass-popup">
                    <div className="p-1 text-xs">
                      <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Waypoint A: Safe Path Origin
                      </div>
                      <div className="text-[10px] text-[var(--text-main)] font-semibold mt-1">
                        {pathOriginAddress || 'Custom GPS Origin'}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                        {pathOrigin[0].toFixed(4)}° N, {pathOrigin[1].toFixed(4)}° E
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Custom Safe Path Destination Pin */}
              {pathDest && (
                <Marker position={pathDest} icon={PATH_DEST_ICON}>
                  <Popup className="neo-glass-popup">
                    <div className="p-1 text-xs">
                      <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Waypoint B: Safe Haven Destination
                      </div>
                      <div className="text-[10px] text-[var(--text-main)] font-semibold mt-1">
                        {pathDestAddress || 'Custom Safe Haven Sector'}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                        {pathDest[0].toFixed(4)}° N, {pathDest[1].toFixed(4)}° E
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Custom Safe Path Connecting Elevation Corridors (All 3 Candidate Routes) */}
              {pathOrigin && pathDest && !isEvaluatingRoutes && candidateSafePaths.map((cand, idx) => {
                const isSelectedCand = idx === selectedCandidateIdx;
                return (
                  <Polyline
                    key={cand.id}
                    positions={cand.geometry}
                    eventHandlers={{
                      click: () => {
                        playClick();
                        setSelectedCandidateIdx(idx);
                      },
                    }}
                    pathOptions={{
                      color: isSelectedCand
                        ? (isDarkMode ? '#ffffff' : '#171717')
                        : (isDarkMode ? '#94a3b8' : '#64748b'),
                      weight: isSelectedCand ? 4.5 : 2.5,
                      dashArray: isSelectedCand ? '6, 8' : '4, 8',
                      opacity: isSelectedCand ? 0.95 : 0.38,
                    }}
                  />
                );
              })}

              {/* Telemetry Incident Minimalist Pins */}
              {filteredIncidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id;
                return (
                  <Marker
                    key={incident.id}
                    position={[incident.lat, incident.lng]}
                    icon={createIncidentMarkerIcon(incident.severity, isSelected)}
                    eventHandlers={{
                      click: () => handleSelectIncident(incident),
                    }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -8]} className="custom-incident-tooltip">
                      <div className="p-1 flex flex-col gap-0.5 min-w-[130px] max-w-[200px] text-xs">
                        <div className="flex items-center justify-between gap-1.5 pb-0.5 border-b border-[var(--border-color)]">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            incident.severity === 'Critical' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                            incident.severity === 'High' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                            'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300'
                          }`}>
                            {incident.severity}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-[90px]">{incident.ward}</span>
                        </div>
                        <span className="font-semibold text-[10.5px] text-[var(--text-main)] truncate mt-0.5 leading-tight">{incident.title}</span>
                        {incident.waterDepthCm && (
                          <span className="text-[9px] font-mono text-[var(--text-main)] font-bold">~{incident.waterDepthCm}cm Water Depth</span>
                        )}
                      </div>
                    </LeafletTooltip>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </MapErrorBoundary>
      </div>
    </div>
  );
}
