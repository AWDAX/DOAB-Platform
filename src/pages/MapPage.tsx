import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  ShieldAlert,
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
  Check
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

// Re-export TelemetryIncident type for backward-compatibility
export type { TelemetryIncident };

// Leaflet default icon asset fix to prevent missing asset 404s
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Civic incidents export for global navbar search & landing page
export const CIVIC_INCIDENTS: TelemetryIncident[] = WATERLOGGING_DATASET_INCIDENTS;

// Helper: Custom Clean Minimalist Marker Icons (Apple & Mapbox Civic Standard)
function createIncidentMarkerIcon(severity: string, isSelected: boolean) {
  let ringColor = 'rgba(225, 29, 72, 0.85)';
  let haloColor = 'rgba(225, 29, 72, 0.15)';
  let dotColor = '#E11D48';

  if (severity === 'High') {
    ringColor = 'rgba(217, 119, 6, 0.85)';
    haloColor = 'rgba(217, 119, 6, 0.15)';
    dotColor = '#D97706';
  } else if (severity === 'Medium') {
    ringColor = 'rgba(2, 132, 199, 0.80)';
    haloColor = 'rgba(2, 132, 199, 0.12)';
    dotColor = '#0284C7';
  } else if (severity === 'Low') {
    ringColor = 'rgba(100, 116, 139, 0.75)';
    haloColor = 'rgba(100, 116, 139, 0.10)';
    dotColor = '#64748B';
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

// User Live GPS Pin
const USER_LIVE_ICON = L.divIcon({
  className: 'user-live-pin',
  html: `
    <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(2,132,199,0.30); animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:16px; height:16px; border-radius:50%; background:#0284C7; border:3px solid #ffffff; box-shadow:0 3px 8px rgba(0,0,0,0.40); display:flex; align-items:center; justify-content:center;">
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
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(217,119,6,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:20px; height:20px; border-radius:50%; background:#d97706; border:3px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center;">
        <div style="width:6px; height:6px; border-radius:50%; background:#ffffff;"></div>
      </div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Interactive Safe Path Origin Pin Icon (Theme-aligned Waypoint A)
const PATH_ORIGIN_ICON = L.divIcon({
  className: 'path-origin-pin',
  html: `
    <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(30,27,75,0.25); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:22px; height:22px; border-radius:8px; background:#18181b; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
        A
      </div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Interactive Safe Path Destination Pin Icon (Theme-aligned Waypoint B)
const PATH_DEST_ICON = L.divIcon({
  className: 'path-dest-pin',
  html: `
    <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(217,119,6,0.30); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:22px; height:22px; border-radius:8px; background:#0284c7; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:11px; font-weight:800; font-family:monospace;">
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

  useEffect(() => {
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

export default function MapPage({ envMode = 'flood', isDarkMode = false }: { envMode?: 'flood' | 'drought'; isDarkMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const copy = getPredictionCopy();
  const { forecast, incidents: apiIncidents, boundaries, status, usingDemo, reload } = useForecast();
  const [destination, setDestination] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [isMultiStateMode, setIsMultiStateMode] = useState<boolean>(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
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
    setIsStateDropdownOpen(false);
    setStateSearchQuery('');
  };

  const handleSelectRegion = (reg: typeof ALL_REGIONS[0]) => {
    playClick();
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

  const [showHeatLayer, setShowHeatLayer] = useState(false);
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
  const [pathRiskTier, setPathRiskTier] = useState<'low' | 'moderate' | 'high'>('low');

  // Sync mode with URL if query parameter changes
  useEffect(() => {
    if (isCreatePathQuery) {
      setIsPathCreationMode(true);
      // Auto-switch to 2D standard map if needed for crystal-clear waypoint interaction
      if (mapEngine !== 'leaflet') {
        setMapEngine('leaflet');
      }
    }
  }, [isCreatePathQuery, mapEngine, setMapEngine]);

  // Selected Incident: null by default so no unwanted distance or vector line is computed until the user explicitly selects a point
  const [selectedIncident, setSelectedIncident] = useState<TelemetryIncident | null>(null);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);
  const [clusterSortBy] = useState<'proximity' | 'severity'>('proximity');

  // Default Coordinates: National All-India Overview Center
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const [userCoords, setUserCoords] = useState<[number, number]>(defaultCenter);
  const [hasRealLocation, setHasRealLocation] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(5);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [activeLeftTab, setActiveLeftTab] = useState<'search' | 'forecast' | 'incident' | 'clusters'>('search');

  // Combined National Master Telemetry Pool (Karnataka Ground-Truth + 17 Indian States via Amazon Location Geocoder)
  const allIncidentsPool = useMemo<TelemetryIncident[]>(() => {
    return [...WATERLOGGING_DATASET_INCIDENTS, ...NATIONAL_MUNICIPAL_INCIDENTS];
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
      if (destination.trim()) {
        const query = destination.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) || 
          item.ward.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // When showing All India with no active filters, build a stratified sample
    // to guarantee geographic diversity. Bengaluru (BBMP) dominates the pool
    // since it comes first in the array — a naive slice(0,N) would show ONLY
    // Bengaluru pins. We take national incidents first, then fill with Bengaluru.
    const isAllIndia = (!isMultiStateMode && selectedState === 'all') || (isMultiStateMode && selectedStates.length === 0);
    if (severityFilter === 'all' && !destination.trim() && isAllIndia) {
      const isBengaluru = (i: TelemetryIncident) =>
        (i.source || '').includes('BBMP') || (i.source || '').includes('OpenCity') || (i.source || '').includes('WaterLogging Dataset');
      const bengaluru = matched.filter(isBengaluru);
      const national = matched.filter((i) => !isBengaluru(i));
      // Stratified representation: up to 140 national + up to 60 Bengaluru
      return [...national.slice(0, 140), ...bengaluru.slice(0, 60)];
    }
    return matched.slice(0, 350);
  }, [severityFilter, destination, incidentSource, selectedState, isMultiStateMode, selectedStates, envMode]);

  const [isLocating, setIsLocating] = useState(false);
  const [isViewingMyLocation, setIsViewingMyLocation] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Amazon Location Service — live geocoding state
  const [alsSuggestions, setAlsSuggestions] = useState<import('../lib/amazonLocation').GeocodedPlace[]>([]);
  const [alsLoading, setAlsLoading] = useState(false);
  const [geocodedPin, setGeocodedPin] = useState<[number, number] | null>(null);
  const alsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced ALS geocode — fires 400ms after the user stops typing
  const handleSearchChange = useCallback((query: string) => {
    setDestination(query);
    setAlsSuggestions([]);
    if (alsDebounceRef.current) clearTimeout(alsDebounceRef.current);
    if (query.trim().length < 3) { setAlsLoading(false); return; }
    setAlsLoading(true);
    alsDebounceRef.current = setTimeout(async () => {
      const results = await geocodePlace(query + ', India', 5);
      setAlsSuggestions(results);
      setAlsLoading(false);
    }, 400);
  }, []);

  // When user picks an ALS suggestion — pan map + drop geocoded pin
  const handleAlsSelect = useCallback((place: import('../lib/amazonLocation').GeocodedPlace) => {
    playClick();
    setGeocodedPin([place.lat, place.lng]);
    setMapCenter([place.lat, place.lng]);
    setMapZoom(13);
    setDestination(place.label);
    setAlsSuggestions([]);
  }, []);

  // Safe Path Creation: Map Click Handler
  const handleMapClickForPath = useCallback((lat: number, lng: number) => {
    playClick();
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const coordsStr = `${roundedLat}° N, ${roundedLng}° E`;

    if (pathPickingTarget === 'origin') {
      setPathOrigin([roundedLat, roundedLng]);
      setPathOriginAddress(prev => prev || `GPS Waypoint (${coordsStr})`);
      setPathPickingTarget('destination');
    } else {
      setPathDest([roundedLat, roundedLng]);
      setPathDestAddress(prev => prev || `Safe Elevation Point (${coordsStr})`);
    }
  }, [pathPickingTarget]);

  // Safe Path Creation: Save to localStorage and redirect to /routes/best
  const handleSaveCustomPath = useCallback(() => {
    if (!pathOrigin && !pathDest && !pathOriginAddress && !pathDestAddress) return;
    playClick();

    const originName = pathOriginAddress.trim() || (pathOrigin ? `${pathOrigin[0]}, ${pathOrigin[1]}` : 'Selected Origin');
    const destName = pathDestAddress.trim() || (pathDest ? `${pathDest[0]}, ${pathDest[1]}` : 'Safe Haven Sector');
    const summary = pathSummaryName.trim() || `Custom Safe Elevation Corridor (${originName} → ${destName})`;

    // Compute distance
    let distMeters = 7500;
    if (pathOrigin && pathDest) {
      const distKm = haversineKm(pathOrigin[0], pathOrigin[1], pathDest[0], pathDest[1]);
      distMeters = Math.max(800, Math.round(distKm * 1000));
    }
    const durationSec = Math.round((distMeters / 1000) * 160); // ~22 km/h city evacuation speed

    const originQuery = pathOrigin ? `${pathOrigin[0]},${pathOrigin[1]}` : encodeURIComponent(originName);
    const destQuery = pathDest ? `${pathDest[0]},${pathDest[1]}` : encodeURIComponent(destName);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=driving`;

    const riskVal = pathRiskTier === 'low' ? 0.045 : pathRiskTier === 'moderate' ? 0.175 : 0.380;

    const newCustomRoute = {
      summary,
      distance_meters: distMeters,
      duration_seconds: durationSec,
      mean_risk: riskVal,
      data_quality: 'ok',
      scored: true,
      maps_url: mapsUrl,
      rank: pathRiskTier === 'low' ? 'safest' : 'alternative',
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
  }, [pathOrigin, pathDest, pathOriginAddress, pathDestAddress, pathSummaryName, pathRiskTier, navigate]);

  // Cancel Safe Path Creation
  const handleCancelCustomPath = useCallback(() => {
    playClick();
    setIsPathCreationMode(false);
    setPathOrigin(null);
    setPathDest(null);
    setPathOriginAddress('');
    setPathDestAddress('');
    setPathSummaryName('');
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

  // Automatically start fetching user live location on MapPage mount
  useEffect(() => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    let isCancelled = false;

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
        setMapCenter(realCoords);
        setMapZoom(15);
        setIsLocating(false);
        setIsViewingMyLocation(true);
      },
      () => {
        if (isCancelled) return;
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 15000 }
    );

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

  const handleRecenter = () => {
    playClick();
    if (isViewingMyLocation) {
      // Toggle back: Zoom out to All-India national overview
      setMapCenter(defaultCenter);
      setMapZoom(5);
      setIsViewingMyLocation(false);
      return;
    }

    // Zoom in to real GPS location
    setIsLocating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const liveLat = position.coords.latitude;
          const liveLng = position.coords.longitude;
          const realCoords: [number, number] = [liveLat, liveLng];
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
            className="absolute top-2.5 sm:top-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] sm:w-[560px] max-w-full pointer-events-auto"
          >
            <div className="neo-glass-card rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 flex flex-col gap-3">
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
                        Interactive Waypoints
                      </span>
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      Click directly on map or type addresses below to compute bypass route
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
                <button
                  type="button"
                  onClick={() => { playClick(); setPathPickingTarget('origin'); }}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden ${
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                      {pathOrigin ? `${pathOrigin[0].toFixed(3)}°, ${pathOrigin[1].toFixed(3)}°` : 'Place on Map'}
                    </div>
                  </div>
                </button>

                {/* Waypoint B (Destination) */}
                <button
                  type="button"
                  onClick={() => { playClick(); setPathPickingTarget('destination'); }}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden ${
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                      {pathDest ? `${pathDest[0].toFixed(3)}°, ${pathDest[1].toFixed(3)}°` : 'Place on Map'}
                    </div>
                  </div>
                </button>
              </div>

              {/* Manual Input Fields (Address / Landmark Name) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">
                    Origin Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={pathOriginAddress}
                    onChange={(e) => setPathOriginAddress(e.target.value)}
                    placeholder="e.g. Indiranagar Metro Station"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">
                    Destination / Safe Haven
                  </label>
                  <input
                    type="text"
                    value={pathDestAddress}
                    onChange={(e) => setPathDestAddress(e.target.value)}
                    placeholder="e.g. High Elevation Ridge / Whitefield"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {/* Path Name & Risk Tier Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Risk Profile:</span>
                  {(['low', 'moderate', 'high'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => { playClick(); setPathRiskTier(tier); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold capitalize transition-all cursor-pointer border ${
                        pathRiskTier === tier
                          ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-2xs'
                          : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {tier}
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
                    className="px-4 py-1.5 rounded-xl bg-[var(--text-main)] hover:opacity-90 disabled:opacity-40 text-[var(--bg-card)] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed active:scale-95"
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
      <div className={`absolute top-2.5 left-2.5 sm:top-4 sm:left-4 ${isStateDropdownOpen || alsSuggestions.length > 0 ? 'z-50' : 'z-20'} w-[calc(100%-3.75rem)] sm:w-92 pointer-events-none`}>
        <div 
          id="tour-map-search" 
          className={`neo-glass-card rounded-2xl pointer-events-auto shadow-xl backdrop-blur-xl border border-[var(--border-color)] transition-all duration-200 ${
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
            className={`flex items-center justify-between gap-2 bg-[var(--bg-main)]/90 px-3 py-2 cursor-pointer select-none transition-colors hover:bg-[var(--bg-main)] ${
              isMobileCollapsed ? 'rounded-2xl' : 'rounded-t-2xl border-b border-[var(--border-color)]'
            }`}
            title={isMobileCollapsed ? "Click to expand Search & Risk Monitor" : "Click to collapse"}
          >
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
              <span className="text-xs font-bold truncate text-[var(--text-main)]">
                Live Risk Monitor
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Dual Engine Sliding Pill Bar (Professional Apple/Mapbox Standard) */}
              <div 
                className="relative flex items-center p-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xs select-none"
                role="tablist"
                aria-label="Map rendering engine mode"
              >
                {/* Smooth Animated Sliding Background Pill with Consistent Brand/Theme Background */}
                <span
                  aria-hidden="true"
                  className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-xs pointer-events-none bg-[var(--text-main)] ${
                    mapEngine === 'leaflet'
                      ? 'left-0.5 w-[calc(50%-2px)]'
                      : 'left-[calc(50%+1px)] w-[calc(50%-2px)]'
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
                  className={`relative z-10 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1 ${
                    mapEngine === 'leaflet'
                      ? 'text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="2D Standard Engine (Leaflet): Ultra-low battery, fast raster rendering"
                >
                  <Globe2 size={10} className={mapEngine === 'leaflet' ? 'text-[var(--bg-card)]' : ''} />
                  <span>2D</span>
                  <span className="hidden sm:inline font-normal opacity-80">Lite</span>
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
                  className={`relative z-10 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1 ${
                    mapEngine === 'maplibre'
                      ? 'text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="3D GPU Vector Engine (MapLibre GL): Hardware-accelerated, 3D tilt & bearing"
                >
                  <Cpu size={10} className={mapEngine === 'maplibre' ? 'text-[var(--bg-card)] animate-pulse' : ''} />
                  <span>3D</span>
                  <span className="hidden sm:inline font-normal opacity-90">GPU</span>
                </button>
              </div>

              <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hidden xs:inline">
                {copy.oneHour}
              </span>
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation();
                  playClick(); 
                  setIsMobileCollapsed(!isMobileCollapsed); 
                }}
                className="p-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                aria-label={isMobileCollapsed ? "Expand Inspector" : "Collapse Inspector"}
                title={isMobileCollapsed ? "Expand Inspector" : "Collapse Inspector"}
              >
                {isMobileCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {!isMobileCollapsed && (
            <div className="p-3 flex flex-col gap-2.5">
              
              {/* Segmented Tab Switcher (Search, Forecast, Clusters, Hazard) */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => { playClick(); setActiveLeftTab('search'); }}
                  className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeLeftTab === 'search'
                      ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Search className="h-3 w-3" />
                  <span>Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setActiveLeftTab('forecast'); }}
                  className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeLeftTab === 'forecast'
                      ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Activity className="h-3 w-3" />
                  <span>Forecast</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setActiveLeftTab('clusters');
                  }}
                  className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeLeftTab === 'clusters'
                      ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>Clusters</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setActiveLeftTab('incident'); }}
                  className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeLeftTab === 'incident'
                      ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Hazard</span>
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
                      className="w-full pl-8.5 pr-14 py-1.5 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
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
                        <span className="font-semibold">Civic Address Registry</span>
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
                  <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                      <span className="flex items-center gap-1 font-semibold text-[var(--text-main)]">
                        <Globe2 className="h-3 w-3 text-[var(--color-brand-accent)]" />
                        Region Focus
                      </span>
                      <span className="text-[9px] font-bold text-black dark:text-white">
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
                              : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--color-brand-accent)]/40 border-[var(--border-color)]'
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
                              : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--color-brand-accent)]/40 border-[var(--border-color)]'
                          }`}
                          title={isMultiStateMode ? "State Filter Active (Click to Toggle Off)" : "Click to Toggle State Filter"}
                        >
                          <SlidersHorizontal className="h-2.5 w-2.5 shrink-0" />
                          <span>State Filter</span>
                          {isMultiStateMode && selectedStates.length > 0 && (
                            <span className="ml-0.5 px-1 py-0.2 rounded-full text-[8px] bg-[var(--color-brand-accent)] text-white font-bold shrink-0">
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
                                ? 'border-[var(--color-brand-accent)] ring-1 ring-[var(--color-brand-accent)]/20' 
                                : (isMultiStateMode && selectedStates.length > 0) || (!isMultiStateMode && selectedState !== 'all')
                                  ? 'border-[var(--text-main)] text-[var(--text-main)] font-semibold'
                                  : 'border-[var(--border-color)] text-[var(--text-muted)]'
                            }`}
                          >
                            <Search className="h-3 w-3 text-[var(--color-brand-accent)] shrink-0" />
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
                                    className="text-[8px] text-[var(--text-muted)] hover:text-red-500 font-mono transition-colors cursor-pointer"
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
                                    className="text-[8px] text-[var(--color-brand-accent)] font-bold font-mono hover:underline cursor-pointer"
                                  >
                                    Done ✓
                                  </button>
                                )}
                                {!isMultiStateMode && (
                                  <span className="text-[var(--color-brand-accent)] text-[8px]">Click to Zoom</span>
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
                                        <MapPin className={`h-2.5 w-2.5 shrink-0 ${isSelected ? 'text-[var(--bg-card)]' : 'text-[var(--color-brand-accent)]'}`} />
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
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-main)] flex items-center gap-1">
                        <Activity className="h-3 w-3 text-[var(--color-brand-accent)]" />
                        {copy.estimate}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase">
                        Mockup
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { playClick(); void reload(); }} 
                      className="text-[10px] font-bold text-[var(--color-brand-accent)] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
                      <span>{copy.refresh}</span>
                    </button>
                  </div>
                  
                  <div className="text-[var(--text-muted)] text-[11px] space-y-1">
                    <p>
                      {status === 'loading' && copy.loading}
                      {status === 'error' && (
                        <span>
                          <strong className="text-amber-600 dark:text-amber-400">{copy.error}</strong>{' '}
                          {copy.offlineDemo}
                        </span>
                      )}
                      {status === 'insufficient' && (envMode === 'drought' ? copy.droughtNote : copy.insufficient)}
                      {status === 'ready' && copy.notASensor}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]/80 italic">
                      This is a student prototype ML estimate from elevation and historic complaints, not an official municipal warning.
                    </p>
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
                      <Layers className="h-3 w-3 text-rose-500" />
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
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
                      }`}
                    >
                      {showHeatLayer ? 'Halos ON' : 'Halos OFF'}
                    </button>
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)] leading-tight font-mono">
                    Formed via SAHNIRMAAN Haversine clustering. Click any cluster row to center map halos on that sector.
                  </p>

                  {/* Micro Table of Hotspot Clusters */}
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                    {recurringClusters.slice(0, 10).map((cluster, cIdx) => {
                      const clusterKey = `${cluster.ward}-${cIdx}`;
                      const isSelected = selectedClusterKey === clusterKey;
                      const isCrit = cluster.highestSeverity === 'Critical';
                      const isHigh = cluster.highestSeverity === 'High';
                      return (
                        <div
                          key={`cluster-row-${cIdx}`}
                          onClick={() => {
                            playClick();
                            setSelectedClusterKey(clusterKey);
                            setMapCenter([cluster.lat, cluster.lng]);
                            setMapZoom(13);
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group ${
                            isSelected
                              ? 'bg-[var(--text-main)]/5 border-[var(--color-brand-accent)] ring-1 ring-[var(--color-brand-accent)]/30'
                              : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-[var(--color-brand-accent)]/50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {/* Indicator dot: subtle and small, only blinks when selected */}
                              <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
                                {isSelected && isCrit && (
                                  <span className="absolute inline-flex w-full h-full rounded-full bg-rose-400 opacity-60 animate-ping" />
                                )}
                                <span className={`relative inline-flex rounded-full shrink-0 ${
                                  isSelected ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5'
                                } ${
                                  isCrit 
                                    ? isSelected ? 'bg-rose-500 animate-pulse' : 'bg-rose-500/80' 
                                    : isHigh 
                                      ? 'bg-amber-500' 
                                      : 'bg-sky-500'
                                }`} />
                              </span>
                              <span className={`font-bold text-xs truncate ${
                                isSelected 
                                  ? 'text-[var(--color-brand-accent)]' 
                                  : 'text-[var(--text-main)] group-hover:text-[var(--color-brand-accent)]'
                              }`}>
                                {cluster.ward}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-2">
                              <span>Radius: ~{cluster.clusterRadiusKm.toFixed(1)} km</span>
                              {cluster.distFromUser != null && (
                                <span className="text-[var(--color-brand-accent)]">
                                  {cluster.distFromUser.toFixed(1)} km from you
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                              isCrit
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                : isHigh
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  : 'bg-sky-500/10 text-sky-600 border-sky-500/30'
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
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                              : selectedIncident.severity === 'High'
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                : 'bg-sky-500/15 text-sky-600 border-sky-500/30'
                          }`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-[var(--text-main)] truncate leading-tight">
                              {selectedIncident.title}
                            </h4>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-0.5 truncate">
                              {selectedIncident.ward} • {selectedIncident.updatedTime}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          selectedIncident.severity === 'Critical'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40'
                            : selectedIncident.severity === 'High'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40'
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
                          className="flex-1 py-1.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1 hover:opacity-90 transition-opacity shadow-2xs"
                        >
                          <RouteIcon className="h-3 w-3" />
                          <span>Reroute Around</span>
                        </Link>
                        
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${selectedIncident.lat},${selectedIncident.lng}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => playClick()}
                          className="px-2 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-main)] flex items-center gap-1.5"
                        >
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EA4335" />
                            <path d="M12 11.5C13.3807 11.5 14.5 10.3807 14.5 9C14.5 7.61929 13.3807 6.5 12 6.5C10.6193 6.5 9.5 7.61929 9.5 9C9.5 10.3807 10.6193 11.5 12 11.5Z" fill="#FFFFFF" />
                          </svg>
                          <span>{copy.openMaps}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setSelectedIncident(null)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
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
          )}
        </div>
      </div>

      {/* ── Top-Right SAHNIRMAAN Floating Neo-Glass Map Controls Toolbar (Vertical Column) ── */}
      <div id="tour-map-controls" className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)]/90 dark:bg-[#12100e]/90 backdrop-blur-xl border border-[var(--border-color)] dark:border-white/15 shadow-xl pointer-events-auto">
        {/* 1. Start Map Page Tour Guide (Placed at the very top, matching theme styling) */}
        <Tooltip content="Live Map Guide" position="left">
          <button
            type="button"
            onClick={() => {
              playClick();
              window.dispatchEvent(new CustomEvent('doab:start-page-tour', { detail: { pageKey: 'dashboard' } }));
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Start Map Tour Guide"
          >
            <Compass size={15} />
          </button>
        </Tooltip>

        {/* 2. Map Intelligence & AI Copilot Button (Direct launch of DOAB AI Assistant) */}
        <Tooltip content="DOAB AI Copilot" position="left">
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
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 group relative"
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
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group ${
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
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              showHeatLayer
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2 ring-rose-500/30'
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Toggle Risk Halo and Cluster Table"
          >
            <Layers size={15} />
          </button>
        </Tooltip>

        {/* 5. Fullscreen Toggle Button */}
        <Tooltip content={isFullScreen ? "Exit Fullscreen" : "Fullscreen Map"} position="left">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isFullScreen 
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md' 
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Toggle Fullscreen"
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </Tooltip>

        {/* 6. Nearby Safety & Route Info Toggle */}
        <Tooltip content={showInfo ? "Close Nearby Safety" : "Nearby Safety & Alerts"} position="left">
          <button
            type="button"
            onClick={() => { playClick(); setShowInfo(!showInfo); }}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer relative overflow-hidden ${
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
                <X size={15} />
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !showInfo ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75 pointer-events-none'
                }`}
              >
                <Info size={15} />
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
            className="absolute top-3 right-14 sm:top-4 sm:right-16 z-20 w-80 sm:w-96 p-4 rounded-3xl backdrop-blur-2xl bg-[var(--bg-card)]/95 dark:bg-[#12100e]/95 border border-[var(--border-color)] dark:border-white/15 shadow-2xl space-y-3.5 pointer-events-auto"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)] dark:border-white/10">
              <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-main)]">
                <Radar size={15} className="text-[var(--color-brand-accent)] animate-spin" style={{ animationDuration: '8s' }} />
                <span>Nearby Safety & Routes</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                proximityIntelligence.hasRealGps 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
              }`}>
                {proximityIntelligence.hasRealGps ? 'GPS Ground Lock' : 'City Grid Lock'}
              </span>
            </div>

            {/* Metric 1: Route Blockage / Inundation Probability Bar */}
            <div className="p-3 rounded-2xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                  <Navigation2 size={13} className="text-[var(--color-brand-accent)]" />
                  Transit Route Blockage Risk
                </span>
                <span className={`font-mono font-bold text-xs ${
                  proximityIntelligence.routeInundationProb > 50 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : proximityIntelligence.routeInundationProb > 25 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {proximityIntelligence.routeInundationProb}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 rounded-full bg-[var(--border-color)]/60 dark:bg-white/10 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    proximityIntelligence.routeInundationProb > 50 
                      ? 'bg-rose-500' 
                      : proximityIntelligence.routeInundationProb > 25 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
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
                  <Droplets size={11} className="text-sky-500" />
                  <span>Within 3 km</span>
                </div>
                <div className="font-bold text-[var(--text-main)] text-sm mt-1 flex items-baseline gap-1">
                  <span>{proximityIntelligence.nearbyTotalWithin3km}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-normal">choke points</span>
                </div>
                <div className="text-[10px] font-mono text-rose-500 font-semibold mt-0.5">
                  {proximityIntelligence.nearbyCritical} critical severe
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5">
                <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  <ShieldAlert size={11} className="text-amber-500" />
                  <span>Within 5 km</span>
                </div>
                <div className="font-bold text-[var(--text-main)] text-sm mt-1 flex items-baseline gap-1">
                  <span>{proximityIntelligence.nearbyTotalWithin5km}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-normal">total hotspots</span>
                </div>
                <div className="text-[10px] font-mono text-amber-500 font-semibold mt-0.5">
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
                <span className="px-2 py-1 rounded-xl bg-[var(--bg-card)] font-mono font-bold text-xs text-[var(--color-brand-accent)] border border-[var(--border-color)] shrink-0 shadow-2xs">
                  {proximityIntelligence.nearestDistanceKm} km away
                </span>
              </div>
            )}

            {/* Footer Metadata */}
            <div className="pt-2 border-t border-[var(--border-color)] dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>Municipal Data Synced</span>
              </span>
              <Link 
                to="/routes/best"
                onClick={() => playClick()}
                className="font-bold text-[var(--color-brand-accent)] hover:underline flex items-center gap-0.5"
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
            activeRouteGeometry={
              hasRealLocation && selectedIncident 
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
                    color: cell.probability >= 0.5 ? '#d97706' : '#64748b',
                    fillColor: cell.probability >= 0.5 ? '#d97706' : '#64748b',
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
                    <div className="font-bold text-neutral-900 flex items-center gap-1.5">
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
                    <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
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
            {showHeatLayer && recurringClusters.slice(0, 8).map((cluster, cIdx) => (
              <Circle
                key={`cluster-halo-${cIdx}`}
                center={[cluster.lat, cluster.lng]}
                radius={Math.max(cluster.clusterRadiusKm * 500, 1600)}
                pathOptions={{
                  color: cluster.highestSeverity === 'Critical' ? '#E11D48' : '#D97706',
                  fillColor: cluster.highestSeverity === 'Critical' ? '#E11D48' : '#D97706',
                  fillOpacity: 0.07,
                  weight: 1.8,
                  dashArray: '6, 8',
                }}
              />
            ))}

            {/* Focused Risk Halo: Rendered for the currently inspected incident */}
            {showHeatLayer && selectedIncident && (
              <Circle
                center={[selectedIncident.lat, selectedIncident.lng]}
                radius={selectedIncident.severity === 'Critical' ? 480 : selectedIncident.severity === 'High' ? 320 : 180}
                pathOptions={{
                  color: selectedIncident.severity === 'Critical' ? '#E11D48' : selectedIncident.severity === 'High' ? '#D97706' : '#0284C7',
                  fillColor: selectedIncident.severity === 'Critical' ? '#E11D48' : selectedIncident.severity === 'High' ? '#D97706' : '#0284C7',
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
                  color: selectedIncident.severity === 'Critical' ? '#E11D48' : '#D97706',
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
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
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
                    <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
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

            {/* Custom Safe Path Connecting Elevation Polyline */}
            {pathOrigin && pathDest && (
              <Polyline
                positions={[pathOrigin, pathDest]}
                pathOptions={{
                  color: '#10B981',
                  weight: 4,
                  dashArray: '6, 8',
                  opacity: 0.9,
                }}
              />
            )}

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
      </div>
    </div>
  );
}
