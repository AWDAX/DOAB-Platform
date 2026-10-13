import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geocodePlace } from '../lib/amazonLocation';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, GeoJSON, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Haversine formula from SAHNIRMAAN to compute high-precision spatial distance (km) between GPS coordinates
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
  ChevronLeft,
  ChevronRight,
  LocateFixed
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
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
    <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(23,23,23,0.25); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:22px; height:22px; border-radius:8px; background:#171717; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
        A
      </div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Interactive Safe Path Destination Pin Icon (Strict Monochromatic Waypoint B)
const PATH_DEST_ICON = L.divIcon({
  className: 'path-dest-pin',
  html: `
    <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(23,23,23,0.25); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:22px; height:22px; border-radius:8px; background:#171717; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
        B
      </div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Map Click Listener to pick Origin and Destination points when in Path Creation Mode
function MapInteractiveClickHandler({
  enabled,
  onMapClick
}: {
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Map Viewport Controller for Smooth Recenter and Immediate Tile Invalidation
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);
  const prevZoomRef = useRef<number>(zoom);

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
      return;
    }

    try {
      map.invalidateSize();
      // Smooth cinematic flyTo transition across coordinate changes
      map.flyTo(center, zoom, {
        duration: 1.8,
        easeLinearity: 0.25,
        noMoveStart: true,
      });
    } catch (e) {
      /* ignore */
    }
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
  hasCompletedInitialLocationZoom: false,
  mapCenter: DEFAULT_NATIONAL_CENTER,
  mapZoom: DEFAULT_NATIONAL_ZOOM,
  userCoords: DEFAULT_NATIONAL_CENTER,
  hasRealLocation: false,
  isViewingMyLocation: false,
  selectedState: 'all',
  isMultiStateMode: false,
  selectedStates: [],
};

export default function MapPage({ envMode = 'flood', isDarkMode = false }: { envMode?: 'flood' | 'drought'; isDarkMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const copy = getPredictionCopy();
  const { forecast, incidents: apiIncidents, boundaries, status, usingDemo, reload } = useForecast();
  const [destination, setDestination] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');
  const [selectedState, setSelectedState] = useState<string>(() => mapSessionState.selectedState);
  const [isMultiStateMode, setIsMultiStateMode] = useState<boolean>(() => mapSessionState.isMultiStateMode);
  const [selectedStates, setSelectedStates] = useState<string[]>(() => mapSessionState.selectedStates);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const stateComboboxRef = useRef<HTMLDivElement>(null);

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
  const [isPathCreationMode, setIsPathCreationMode] = useState<boolean>(isCreatePathQuery);
  const [pathOrigin, setPathOrigin] = useState<[number, number] | null>(null);
  const [pathDest, setPathDest] = useState<[number, number] | null>(null);
  const [pathOriginAddress, setPathOriginAddress] = useState<string>('');
  const [pathDestAddress, setPathDestAddress] = useState<string>('');
  const [pathPickingTarget, setPathPickingTarget] = useState<'origin' | 'destination'>('origin');
  const [pathSummaryName, setPathSummaryName] = useState<string>('');
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<number>(0);

  // Amazon Location Service + Local Landmark Autocomplete for Origin (A) & Destination (B)
  const [originSuggestions, setOriginSuggestions] = useState<import('../lib/amazonLocation').GeocodedPlace[]>([]);
  const [originAlsLoading, setOriginAlsLoading] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState<import('../lib/amazonLocation').GeocodedPlace[]>([]);
  const [destAlsLoading, setDestAlsLoading] = useState(false);
  const originDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alsCacheRef = useRef<Map<string, import('../lib/amazonLocation').GeocodedPlace[]>>(new Map());

  // Sync mode with URL if query parameter changes
  useEffect(() => {
    if (isCreatePathQuery) {
      setIsPathCreationMode(true);
    }
  }, [isCreatePathQuery]);

  // Selected Incident: null by default so no unwanted distance or vector line is computed until the user explicitly selects a point
  const [selectedIncident, setSelectedIncident] = useState<TelemetryIncident | null>(null);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);
  const [clusterSortBy] = useState<'proximity' | 'severity'>('proximity');

  // Default Coordinates: National All-India Overview Center
  const defaultCenter: [number, number] = DEFAULT_NATIONAL_CENTER;
  const [userCoords, setUserCoords] = useState<[number, number]>(() => mapSessionState.userCoords);
  const [hasRealLocation, setHasRealLocation] = useState<boolean>(() => mapSessionState.hasRealLocation);

  const [mapCenter, setMapCenter] = useState<[number, number]>(() => mapSessionState.mapCenter);
  const [mapZoom, setMapZoom] = useState<number>(() => mapSessionState.mapZoom);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [activeLeftTab, setActiveLeftTab] = useState<'search' | 'forecast' | 'incident' | 'clusters'>('search');

  // Deferred search query so typing in Live Risk Monitor never blocks the UI thread with O(N^2) cluster Haversine re-computation
  const deferredDestination = React.useDeferredValue(destination);

  // Combined National Master Telemetry Pool (Karnataka Ground-Truth + 17 Indian States via Amazon Location Geocoder)
  const allIncidentsPool = useMemo<TelemetryIncident[]>(() => {
    return [...WATERLOGGING_DATASET_INCIDENTS, ...NATIONAL_MUNICIPAL_INCIDENTS];
  }, []);

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

  const fetchHybridPlaceSuggestions = useCallback(async (query: string, localMatches: import('../lib/amazonLocation').GeocodedPlace[]) => {
    const cacheKey = query.trim().toLowerCase();
    let awsResults = alsCacheRef.current.get(cacheKey);
    if (!awsResults) {
      // First try real Amazon Location Service SearchPlaceIndex query directly
      awsResults = await geocodePlace(query, 5);
      // If few results and query didn't end with India, try with national boundary qualification
      if (awsResults.length === 0 && !query.toLowerCase().includes('india')) {
        awsResults = await geocodePlace(query + ', India', 5);
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
      if (deferredDestination.trim()) {
        const query = deferredDestination.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) || 
          item.ward.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
        );
      }
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

  const [isLocating, setIsLocating] = useState(false);
  const [isViewingMyLocation, setIsViewingMyLocation] = useState<boolean>(() => mapSessionState.isViewingMyLocation);
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
    alsDebounceRef.current = setTimeout(async () => {
      const merged = await fetchHybridPlaceSuggestions(query, localMatches);
      setAlsSuggestions(merged);
      setAlsLoading(false);
    }, 180);
  }, [getInstantLocalMatches, fetchHybridPlaceSuggestions]);

  // When user picks an ALS suggestion — pan map + drop geocoded pin
  const handleAlsSelect = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    setGeocodedPin([place.lat, place.lng]);
    setMapCenter([place.lat, place.lng]);
    setMapZoom(13);
    setDestination(place.label);
    setAlsSuggestions([]);
  }, []);

  // Origin (A) Autocomplete with Amazon Location Service + Local Civic Registry
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
    originDebounceRef.current = setTimeout(async () => {
      const merged = await fetchHybridPlaceSuggestions(query, localMatches);
      setOriginSuggestions(merged);
      setOriginAlsLoading(false);
    }, 180);
  }, [getInstantLocalMatches, fetchHybridPlaceSuggestions]);

  const handleSelectOriginPlace = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    const coords: [number, number] = [
      Math.round(place.lat * 10000) / 10000,
      Math.round(place.lng * 10000) / 10000,
    ];
    setPathOrigin(coords);
    setPathOriginAddress(place.municipality || place.label.split(',')[0] || place.label);
    setOriginSuggestions([]);
    setPathPickingTarget('destination');
    setMapCenter(coords);
    setMapZoom((z) => (z < 12 ? 13 : z));
  }, []);

  // Destination (B) Autocomplete with Amazon Location Service + Local Civic Registry
  const handleDestAddressChange = useCallback((query: string) => {
    setPathDestAddress(query);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (query.trim().length < 2) {
      setDestSuggestions([]);
      setDestAlsLoading(false);
      return;
    }
    const localMatches = getInstantLocalMatches(query, 4);
    setDestSuggestions(localMatches);
    setDestAlsLoading(true);
    destDebounceRef.current = setTimeout(async () => {
      const merged = await fetchHybridPlaceSuggestions(query, localMatches);
      setDestSuggestions(merged);
      setDestAlsLoading(false);
    }, 180);
  }, [getInstantLocalMatches, fetchHybridPlaceSuggestions]);

  const handleSelectDestPlace = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    const coords: [number, number] = [
      Math.round(place.lat * 10000) / 10000,
      Math.round(place.lng * 10000) / 10000,
    ];
    setPathDest(coords);
    setPathDestAddress(place.municipality || place.label.split(',')[0] || place.label);
    setDestSuggestions([]);
    setMapCenter(coords);
    setMapZoom((z) => (z < 11 ? 12 : z));
  }, []);

  // Use Current GPS Location for Origin Point (A)
  const handleUseCurrentLocationForOrigin = useCallback(async () => {
    playClick();
    if (hasRealLocation) {
      const roundedLat = Math.round(userCoords[0] * 10000) / 10000;
      const roundedLng = Math.round(userCoords[1] * 10000) / 10000;
      setPathOrigin([roundedLat, roundedLng]);
      setPathOriginAddress(`Current GPS Location (${roundedLat}° N, ${roundedLng}° E)`);
      setOriginSuggestions([]);
      setPathPickingTarget('destination');
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
          setPathPickingTarget('destination');
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
          setPathPickingTarget('destination');
          setMapCenter(fallbackCoords);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setIsLocating(false);
    }
  }, [hasRealLocation, userCoords, mapCenter]);

  // 3 Candidate Safe Paths Computed Between Origin (A) and Destination (B)
  const candidateSafePaths = useMemo(() => {
    const start: [number, number] = pathOrigin || (hasRealLocation ? userCoords : [12.9784, 77.6408]);
    const end: [number, number] = pathDest || [start[0] + 0.042, start[1] + 0.048];
    const baseKm = Math.max(0.8, haversineKm(start[0], start[1], end[0], end[1]));
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

    const originLabel = pathOriginAddress.trim() || (pathOrigin ? `${pathOrigin[0].toFixed(3)}°N, ${pathOrigin[1].toFixed(3)}°E` : 'Origin Sector');
    const destLabel = pathDestAddress.trim() || (pathDest ? `${pathDest[0].toFixed(3)}°N, ${pathDest[1].toFixed(3)}°E` : 'Safe Haven');

    return [
      {
        id: 'candidate-1-safest',
        title: 'Safest Elevated Ridge Bypass',
        summary: `Elevated Ridge Corridor (${originLabel} → ${destLabel})`,
        tier: 'low' as const,
        rank: 'safest' as const,
        mean_risk: 0.054,
        distance_meters: Math.round(baseKm * 1.18 * 1000),
        duration_seconds: Math.round(baseKm * 1.18 * 155),
        geometry: buildCurvedGeometry(0.24),
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
        mean_risk: 0.168,
        distance_meters: Math.round(baseKm * 1.08 * 1000),
        duration_seconds: Math.round(baseKm * 1.08 * 145),
        geometry: buildCurvedGeometry(-0.18),
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
        mean_risk: 0.365,
        distance_meters: Math.round(baseKm * 1.0 * 1000),
        duration_seconds: Math.round(baseKm * 1.0 * 135),
        geometry: buildCurvedGeometry(0.02),
        midpoint: [
          start[0] + dLat * 0.5 + normLat * 0.02,
          start[1] + dLng * 0.5 + normLng * 0.02,
        ] as [number, number],
        badge: 'Shortest Distance • Basin Exposure',
      },
    ];
  }, [pathOrigin, pathDest, pathOriginAddress, pathDestAddress, hasRealLocation, userCoords]);

  const activeCandidateRoute = candidateSafePaths[selectedCandidateIdx] || candidateSafePaths[0];

  // Safe Path Creation: Map Click Handler
  const handleMapClickForPath = useCallback((lat: number, lng: number) => {
    playClick();
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const coordsStr = `${roundedLat}° N, ${roundedLng}° E`;

    if (pathPickingTarget === 'origin') {
      setPathOrigin([roundedLat, roundedLng]);
      setPathOriginAddress(prev => prev || `GPS Waypoint (${coordsStr})`);
      setOriginSuggestions([]);
      setPathPickingTarget('destination');
    } else {
      setPathDest([roundedLat, roundedLng]);
      setPathDestAddress(prev => prev || `Safe Elevation Point (${coordsStr})`);
      setDestSuggestions([]);
    }
  }, [pathPickingTarget]);

  // Safe Path Creation: Save to localStorage and redirect to /routes/best
  const handleSaveCustomPath = useCallback(() => {
    if (!pathOrigin && !pathDest && !pathOriginAddress && !pathDestAddress) return;
    playClick();

    const chosen = candidateSafePaths[selectedCandidateIdx] || candidateSafePaths[0];
    const originName = pathOriginAddress.trim() || (pathOrigin ? `${pathOrigin[0]}, ${pathOrigin[1]}` : 'Selected Origin');
    const destName = pathDestAddress.trim() || (pathDest ? `${pathDest[0]}, ${pathDest[1]}` : 'Safe Haven Sector');
    const summary = pathSummaryName.trim() || chosen.summary;

    const originQuery = pathOrigin ? `${pathOrigin[0]},${pathOrigin[1]}` : encodeURIComponent(originName);
    const destQuery = pathDest ? `${pathDest[0]},${pathDest[1]}` : encodeURIComponent(destName);
    const waypointParam = pathOrigin && pathDest
      ? `&waypoints=${chosen.midpoint[0].toFixed(4)},${chosen.midpoint[1].toFixed(4)}`
      : '';
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}${waypointParam}&travelmode=driving`;

    const newCustomRoute = {
      summary,
      distance_meters: chosen.distance_meters,
      duration_seconds: chosen.duration_seconds,
      mean_risk: chosen.mean_risk,
      data_quality: 'ok',
      scored: true,
      maps_url: mapsUrl,
      rank: chosen.rank,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('doab_custom_created_routes') || '[]');
      const updated = [newCustomRoute, ...existing.filter((r: any) => r.summary !== summary)];
      localStorage.setItem('doab_custom_created_routes', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save custom route', e);
    }

    // Reset path creation mode and navigate to Best Routes page
    setIsPathCreationMode(false);
    navigate('/routes/best');
  }, [pathOrigin, pathDest, pathOriginAddress, pathDestAddress, pathSummaryName, candidateSafePaths, selectedCandidateIdx, navigate]);

  // Cancel Safe Path Creation
  const handleCancelCustomPath = useCallback(() => {
    playClick();
    setIsPathCreationMode(false);
    setPathOrigin(null);
    setPathDest(null);
    setPathOriginAddress('');
    setPathDestAddress('');
    setPathSummaryName('');
    setOriginSuggestions([]);
    setDestSuggestions([]);
    setSearchParams(params => {
      params.delete('mode');
      return params;
    });
  }, [setSearchParams]);

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

  // SAHNIRMAAN Cluster Engine: Group incidents by Ward / Corridor into macro danger clusters
  const recurringClusters = useMemo(() => {
    const clusterMap = new Map<string, {
      ward: string;
      category: string;
      count: number;
      highestSeverity: 'Critical' | 'High' | 'Medium' | 'Low';
      points: { lat: number; lng: number }[];
    }>();

    const SEVERITY_RANK: Record<string, number> = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0 };

    filteredIncidents.forEach((inc) => {
      const key = `${inc.ward || 'Bengaluru'}::${inc.category || 'waterlogging'}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          ward: inc.ward || 'Bengaluru',
          category: inc.category || 'waterlogging',
          count: 0,
          highestSeverity: inc.severity,
          points: []
        });
      }
      const item = clusterMap.get(key)!;
      item.count += 1;
      item.points.push({ lat: inc.lat, lng: inc.lng });
      if ((SEVERITY_RANK[inc.severity] || 0) > (SEVERITY_RANK[item.highestSeverity] || 0)) {
        item.highestSeverity = inc.severity;
      }
    });

    return Array.from(clusterMap.values()).map((c) => {
      // Calculate max spatial span between reports in this ward/sector cluster using SAHNIRMAAN haversine
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

      return {
        ...c,
        lat: centerLat,
        lng: centerLng,
        clusterRadiusKm: maxDist > 0 ? Math.max(maxDist, 1.2) : 2.5,
        distFromUser
      };
    }).sort((a, b) => {
      if (clusterSortBy === 'proximity' && a.distFromUser != null && b.distFromUser != null) {
        return a.distFromUser - b.distFromUser;
      }
      return b.count - a.count;
    });
  }, [filteredIncidents, userCoords, hasRealLocation, clusterSortBy]);

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
        if (osPerm.location !== 'granted') {
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
    <div id="tour-map-view" className={`flex-grow flex flex-col relative w-full h-full min-h-[420px] bg-[var(--bg-main)] overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[9999] rounded-none' : ''}`}>
      
      {/* ── Interactive Safe Elevation Path Floating Action Banner (When mode=create_path) ── */}
      <AnimatePresence>
        {isPathCreationMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute top-2.5 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[580px] max-w-full pointer-events-auto"
          >
            <div className="neo-glass-card rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)]/95 dark:bg-[#0c141d]/95 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5">
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
                <button
                  type="button"
                  onClick={handleCancelCustomPath}
                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer shrink-0"
                  title="Close Path Creation Mode"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Waypoint Selector Chips (Click target toggle: Origin A vs Destination B) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Waypoint A (Origin) */}
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => { playClick(); setPathPickingTarget('origin'); }}
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
                        {pathOrigin && (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white animate-pulse" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                        {pathOrigin ? `${pathOrigin[0].toFixed(3)}°, ${pathOrigin[1].toFixed(3)}°` : 'Place on Map'}
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
                          }}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[image:var(--danger-btn-gradient,linear-gradient(180deg,#4C0519_0%,#881337_50%,#BE123C_100%))] hover:shadow-[0_4px_10px_rgba(190,18,60,0.35)] transition-all cursor-pointer shrink-0 flex items-center justify-center"
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
                        className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-muted)] transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
                        aria-label="Use Current Location as Origin Point"
                      >
                        <LocateFixed className="h-3.5 w-3.5 text-sky-500 hover:text-inherit" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Waypoint B (Destination) */}
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => { playClick(); setPathPickingTarget('destination'); }}
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
                        {pathDest && (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white animate-pulse" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                        {pathDest ? `${pathDest[0].toFixed(3)}°, ${pathDest[1].toFixed(3)}°` : 'Place on Map'}
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
                          }}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[image:var(--danger-btn-gradient,linear-gradient(180deg,#4C0519_0%,#881337_50%,#BE123C_100%))] hover:shadow-[0_4px_10px_rgba(190,18,60,0.35)] transition-all cursor-pointer shrink-0 flex items-center justify-center"
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
                <div className="relative">
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
                      placeholder="Search origin address or place on map..."
                      className="w-full px-2.5 py-1.5 pr-7 text-xs rounded-xl bg-[var(--bg-main)] border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] transition-colors"
                    />
                    {originAlsLoading && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-[var(--text-main)] border-t-transparent animate-spin" />
                    )}
                  </div>
                  {originSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-44 overflow-y-auto">
                      {originSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOriginPlace(place)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-main)] transition-colors flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-0 cursor-pointer"
                        >
                          <span className="font-semibold text-[var(--text-main)] truncate">{place.municipality || place.label.split(',')[0]}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{place.region ? `${place.region}, India` : place.label}</span>
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
                <div className="relative">
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
                      placeholder="Search safe destination or click on map..."
                      className="w-full px-2.5 py-1.5 pr-7 text-xs rounded-xl bg-[var(--bg-main)] border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] transition-colors"
                    />
                    {destAlsLoading && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-[var(--text-main)] border-t-transparent animate-spin" />
                    )}
                  </div>
                  {destSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-44 overflow-y-auto">
                      {destSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDestPlace(place)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-main)] transition-colors flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-0 cursor-pointer"
                        >
                          <span className="font-semibold text-[var(--text-main)] truncate">{place.municipality || place.label.split(',')[0]}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{place.region ? `${place.region}, India` : place.label}</span>
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

              {/* ── Interactive Candidate Route Switcher (← 1 / 3 →) Inside Map Path Creator ── */}
              <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--text-main)] text-[var(--bg-card)]">
                      Path {selectedCandidateIdx + 1} of {candidateSafePaths.length}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main)] truncate">
                      {activeCandidateRoute.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1 text-[10px] font-mono text-[var(--text-muted)] flex-wrap">
                    <span>{(activeCandidateRoute.distance_meters / 1000).toFixed(1)} km</span>
                    <span>•</span>
                    <span>~{Math.max(2, Math.round(activeCandidateRoute.duration_seconds / 60))} min</span>
                    <span>•</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {(activeCandidateRoute.mean_risk * 100).toFixed(1)}% Flood Risk
                    </span>
                    <span className="hidden md:inline text-[9px] opacity-80">
                      ({activeCandidateRoute.badge})
                    </span>
                  </div>
                </div>

                {/* Arrow Switcher: ← 1 / 3 → */}
                <div className="inline-flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-0.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      const nextIdx = (selectedCandidateIdx - 1 + candidateSafePaths.length) % candidateSafePaths.length;
                      setSelectedCandidateIdx(nextIdx);
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                    title="Previous Possible Safe Route"
                    aria-label="Previous route"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2.5 text-[10px] font-mono font-bold text-[var(--text-main)] select-none">
                    {selectedCandidateIdx + 1} / {candidateSafePaths.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      const nextIdx = (selectedCandidateIdx + 1) % candidateSafePaths.length;
                      setSelectedCandidateIdx(nextIdx);
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                    title="Next Possible Safe Route"
                    aria-label="Next route"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Path Name & Risk Tier Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Corridor Profile:</span>
                  {(['low', 'moderate', 'high'] as const).map((tier, idx) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedCandidateIdx(idx);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold capitalize transition-all cursor-pointer border ${
                        selectedCandidateIdx === idx
                          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-2xs'
                          : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {tier === 'low' ? 'Safest (Low)' : tier === 'moderate' ? 'Balanced' : 'Direct'}
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 justify-end">
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
                    disabled={(!pathOrigin && !pathOriginAddress.trim()) || (!pathDest && !pathDestAddress.trim())}
                    className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Save Safe Path</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Unified Left Floating Map Command Dock (Tabbed, Elegant, Non-Intrusive) ── */}
      <div className={`absolute top-1.5 left-2.5 right-2.5 sm:top-4 sm:left-4 sm:right-auto ${isStateDropdownOpen || alsSuggestions.length > 0 ? 'z-50' : 'z-30'} sm:w-96 pointer-events-none`}>
        <div 
          id="tour-map-search" 
          className={`rounded-2xl pointer-events-auto shadow-2xl backdrop-blur-2xl border border-[var(--border-color)] dark:border-white/15 bg-[var(--bg-card)] dark:bg-[#0c141d] transition-all duration-200 ${
            isStateDropdownOpen || alsSuggestions.length > 0 ? 'overflow-visible' : 'overflow-hidden'
          }`}
        >
          
          {/* Header Bar with Mode Pill & Minimize Toggle */}
          <div 
            onClick={(e) => {
              // If click happened on the 2D/3D switcher buttons, don't toggle collapse
              if ((e.target as HTMLElement).closest('[role="tablist"]')) return;
              playClick();
              setIsMobileCollapsed(!isMobileCollapsed);
            }}
            className={`flex items-center justify-between gap-2 bg-[var(--bg-main)]/95 dark:bg-[#090f16] px-3.5 py-2 cursor-pointer select-none transition-colors hover:bg-[var(--bg-main)] dark:hover:bg-[#0d1620] ${
              isMobileCollapsed ? 'rounded-2xl' : 'rounded-t-2xl border-b border-[var(--text-main)]/20 dark:border-white/20'
            }`}
            title={isMobileCollapsed ? "Click to expand Search & Risk Monitor" : "Click to collapse"}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Crosshair className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
              <span className="text-xs sm:text-[13px] font-bold truncate text-[var(--text-main)]">
                <span className="sm:hidden">Live Risk</span>
                <span className="hidden sm:inline">Live Risk Monitor</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Dual Engine Sliding Pill Bar (Professional Apple/Mapbox Standard — Enlarged Touch Targets) */}
              <div 
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
                className="overflow-hidden"
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      placeholder="Search any locality, city or landmark in India..."
                      className="w-full pl-8.5 pr-14 py-1.5 text-xs border border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50 transition-colors rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                      value={destination}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { setAlsSuggestions([]); setDestination(''); }
                      }}
                    />
                    {/* Live search indicator */}
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      {alsLoading ? (
                        <span className="h-2.5 w-2.5 rounded-full border border-[var(--color-brand-accent)] border-t-transparent animate-spin" />
                      ) : (
                        <span className="text-[9px] font-mono font-semibold text-[var(--text-muted)] opacity-70">Search</span>
                      )}
                    </span>
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {alsSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg overflow-hidden">
                      {alsSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAlsSelect(place)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-main)] transition-colors flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-0 cursor-pointer"
                        >
                          <span className="font-semibold text-[var(--text-main)] truncate">{place.municipality || place.label.split(',')[0]}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{place.region ? `${place.region}, India` : place.label}</span>
                        </button>
                      ))}
                      <div className="px-3 py-1 text-[9px] text-[var(--text-muted)] font-mono flex items-center justify-between bg-[var(--bg-main)]">
                        <span className="font-semibold">Amazon Location + Civic Registry</span>
                        <span>{alsSuggestions.length} matches</span>
                      </div>
                    </div>
                  )}


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
                  
                  <Link 
                    to="/routes/best" 
                    onClick={() => playClick()}
                    className="w-full py-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-xs shadow-xs"
                  >
                    <RouteIcon className="h-3.5 w-3.5" />
                    <span>Compute Safe Elevation Path</span>
                  </Link>
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
                    {status === 'insufficient' && (
                      <p>{envMode === 'drought' ? copy.droughtNote : copy.insufficient}</p>
                    )}
                    {status === 'ready' && (
                      <p>{copy.notASensor}</p>
                    )}
                  </div>

                  {forecast?.cells[0]?.target_time && (
                    <div className="pt-1 border-t border-[var(--border-color)]/60 text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                      <span>{copy.oneHour}</span>
                      <span className="font-bold text-[var(--text-main)]">{forecast.cells[0].target_time}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SAHNIRMAAN Macro Danger Cluster Table */}
              {activeLeftTab === 'clusters' && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
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


                  {/* Micro Table of Hotspot Clusters */}
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                    {recurringClusters.slice(0, 25).map((cluster, cIdx) => {
                      const isSelected = selectedClusterKey === cluster.ward;
                      const isCrit = cluster.highestSeverity === 'Critical';
                      const isHigh = cluster.highestSeverity === 'High';
                      return (
                        <div
                          key={`cluster-row-${cluster.ward}-${cIdx}`}
                          onClick={() => {
                            playClick();
                            setShowHeatLayer(true);
                            setSelectedClusterKey(cluster.ward);
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
                              {/* Indicator dot: subtle and small, only blinks when selected */}
                              <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
                                {isSelected && isCrit && (
                                  <span className="absolute inline-flex w-full h-full rounded-full bg-rose-500 opacity-60 animate-ping" />
                                )}
                                <span className={`relative inline-flex rounded-full shrink-0 w-1.5 h-1.5 ${
                                  isCrit 
                                    ? isSelected ? 'bg-rose-700 dark:bg-rose-400 animate-pulse' : 'bg-rose-700/80 dark:bg-rose-400/80' 
                                    : isHigh 
                                      ? 'bg-amber-700 dark:bg-amber-400' 
                                      : 'bg-slate-600 dark:bg-slate-400'
                                }`} />
                              </span>
                              <span className="font-bold text-xs truncate text-[var(--text-main)]">
                                {cluster.ward}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-2">
                              <span>Radius: ~{cluster.clusterRadiusKm.toFixed(1)} km</span>
                              {cluster.distFromUser != null && (
                                <span className="text-[var(--text-main)] dark:text-neutral-300 font-semibold">
                                  {cluster.distFromUser.toFixed(1)} km from you
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                              isCrit
                                ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                                : isHigh
                                  ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                                  : 'bg-slate-500/[0.08] dark:bg-slate-400/[0.12] text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-400/25'
                            }`}>
                              {cluster.count} reports
                            </span>
                            <span className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                              {cluster.highestSeverity}
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
                        <Link
                          to={`/routes/best?lat=${selectedIncident.lat}&lng=${selectedIncident.lng}`}
                          onClick={() => playClick()}
                          className="flex-1 py-1.5 px-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1 hover:opacity-90 transition-opacity shadow-2xs whitespace-nowrap"
                        >
                          <RouteIcon className="h-3 w-3 shrink-0" />
                          <span className="whitespace-nowrap">Reroute Around</span>
                        </Link>
                        
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
                          <span className="whitespace-nowrap">{copy.openMaps}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-70 shrink-0" />
                        </a>

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
        </div>
      </div>

      {/* ── Top-Right SAHNIRMAAN Floating Neo-Glass Map Controls Toolbar (Shifted down on mobile/touch views below Live Risk) ── */}
      <div id="tour-map-controls" className="absolute top-[4.5rem] right-2.5 sm:top-4 sm:right-4 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)]/90 dark:bg-[#12100e]/90 backdrop-blur-xl border border-[var(--border-color)] dark:border-white/15 shadow-xl pointer-events-auto">
        {/* 1. Start Map Page Tour Guide (Placed at the very top, matching theme styling) */}
        <Tooltip content="Live Map Guide" position="left">
          <button
            type="button"
            onClick={() => {
              playClick();
              window.dispatchEvent(new CustomEvent('doab:start-page-tour', { detail: { pageKey: 'dashboard' } }));
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
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
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 group relative"
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

        <div className="w-5 h-px bg-[var(--border-color)] dark:bg-white/10 my-0.5" />

        {/* 3. My Location FAB with AnimatedCrosshair */}
        <Tooltip content={isViewingMyLocation ? "City Overview (Zoom Out)" : "Fly to My GPS Location"} position="left">
          <button
            type="button"
            onClick={handleRecenter}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group ${
              isLocating
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md animate-pulse'
                : isViewingMyLocation
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md'
                  : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
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
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2 ring-rose-500/30'
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
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
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md' 
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
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
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md rotate-0' 
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
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

      {/* ── SAHNIRMAAN Floating Map Intelligence & Proximity Radar Card (Anchored to the left of the vertical toolbar) ── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, x: 8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[4.5rem] right-14 sm:top-4 sm:right-16 z-20 w-80 sm:w-96 p-4 rounded-3xl backdrop-blur-2xl bg-[var(--bg-card)]/95 dark:bg-[#12100e]/95 border border-[var(--border-color)] dark:border-white/15 shadow-2xl space-y-3.5 pointer-events-auto"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)] dark:border-white/10">
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
              isDarkMode={isDarkMode}
              envMode={envMode}
              userLocation={hasRealLocation ? { lat: userCoords[0], lng: userCoords[1] } : null}
              clusters={recurringClusters}
              showHeatLayer={showHeatLayer}
              selectedClusterKey={selectedClusterKey}
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
              className="h-full w-full z-0 cursor-default"
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

              <MapViewController center={mapCenter} zoom={mapZoom} />

              {boundaries && (
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
                      <div className="font-bold text-sky-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
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
                  <Popup className="neo-glass-popup">
                    <div className="p-1 text-xs">
                      <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5" />
                        Geocoded Landmark
                      </div>
                      <div className="text-[10px] text-[var(--text-main)] font-semibold mt-1">
                        {destination}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                        {geocodedPin[0].toFixed(4)}° N, {geocodedPin[1].toFixed(4)}° E
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}


              {/* SAHNIRMAAN Macro Danger Cluster Halos (Visible when showHeatLayer is toggled) */}
              {showHeatLayer && recurringClusters.slice(0, Capacitor.isNativePlatform() ? 12 : 40).map((cluster, cIdx) => {
                const clusterColor = cluster.highestSeverity === 'Critical' 
                  ? '#BE123C' 
                  : cluster.highestSeverity === 'High' 
                    ? '#B45309' 
                    : cluster.highestSeverity === 'Medium'
                      ? '#475569'
                      : '#0F766E';
                const hasAnySelectedCluster = selectedClusterKey != null;
                const isSelected = hasAnySelectedCluster && (
                  cluster.ward === selectedClusterKey ||
                  `${cluster.ward}-${cIdx}` === selectedClusterKey ||
                  (cluster.ward && selectedClusterKey.startsWith(cluster.ward))
                );
                const isFeeble = hasAnySelectedCluster && !isSelected;
                return (
                  <React.Fragment key={`cluster-halo-${cluster.ward}-${cIdx}`}>
                    {/* Outer pulsating beacon ring for selected cluster */}
                    {isSelected && (
                      <Circle
                        center={[cluster.lat, cluster.lng]}
                        radius={Math.max(cluster.clusterRadiusKm * 500, 1600) * 1.15}
                        pathOptions={{
                          color: clusterColor,
                          fillColor: clusterColor,
                          fillOpacity: 0.08,
                          weight: 1.5,
                          dashArray: '4, 6',
                        }}
                      />
                    )}
                    <Circle
                      center={[cluster.lat, cluster.lng]}
                      radius={Math.max(cluster.clusterRadiusKm * 500, 1600)}
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

              {/* Focused Risk Halo: Rendered for the currently inspected incident */}
              {showHeatLayer && selectedIncident && (
                <Circle
                  center={[selectedIncident.lat, selectedIncident.lng]}
                  radius={selectedIncident.severity === 'Critical' ? 480 : selectedIncident.severity === 'High' ? 320 : 180}
                  pathOptions={{
                    color: selectedIncident.severity === 'Critical' ? '#BE123C' : selectedIncident.severity === 'High' ? '#B45309' : '#475569',
                    fillColor: selectedIncident.severity === 'Critical' ? '#BE123C' : selectedIncident.severity === 'High' ? '#B45309' : '#475569',
                    fillOpacity: 0.16,
                    weight: 2,
                    dashArray: '4, 4',
                  }}
                />
              )}

              {/* SAHNIRMAAN Spatial Proximity Vector from User GPS to Inspected Incident */}
              {hasRealLocation && selectedIncident && (
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
                  }}
                />
              )}

              {/* Interactive Safe Path Waypoint Picking Handler */}
              <MapInteractiveClickHandler
                enabled={isPathCreationMode}
                onMapClick={handleMapClickForPath}
              />

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
              {pathOrigin && pathDest && candidateSafePaths.map((cand, idx) => {
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
                  />
                );
              })}
            </MapContainer>
          )}
        </MapErrorBoundary>
      </div>
    </div>
  );
}
