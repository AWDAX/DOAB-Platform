import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, GeoJSON, Polyline } from 'react-leaflet';
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
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { playClick } from '../utils/soundFx';
import AnimatedCrosshair from '../components/AnimatedCrosshair';
import Tooltip from '../components/Tooltip';
import { WATERLOGGING_DATASET_INCIDENTS, type TelemetryIncident } from '../data/waterloggingIncidents';
import { useForecast } from '../hooks/useForecast';
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

// Map Viewport Controller for Smooth Recenter and Immediate Tile Invalidation
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    try {
      map.invalidateSize();
      map.setView(center, zoom, { animate: true });
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

export default function MapPage({ envMode = 'flood' }: { envMode?: 'flood' | 'drought' }) {
  const copy = getPredictionCopy();
  const { forecast, incidents: apiIncidents, boundaries, status, usingDemo, stale, reload } = useForecast();
  const [destination, setDestination] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');
  const [showHeatLayer, setShowHeatLayer] = useState(true);

  const [selectedIncident, setSelectedIncident] = useState<TelemetryIncident | null>(() => WATERLOGGING_DATASET_INCIDENTS[0] || null);

  // Default Coordinates: WaterLogging Urban Corridor Center
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const [userCoords, setUserCoords] = useState<[number, number]>(defaultCenter);
  const [hasRealLocation, setHasRealLocation] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'search' | 'forecast' | 'incident'>('search');

  // Filter incidents based on criteria and curate density for clean map aesthetics
  const incidentSource = useMemo<TelemetryIncident[]>(() => {
    if (usingDemo || apiIncidents.length === 0) return WATERLOGGING_DATASET_INCIDENTS;
    return apiIncidents.map((item) => ({
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
  }, [apiIncidents, usingDemo, copy.historical]);

  const filteredIncidents = useMemo(() => {
    const matched = incidentSource.filter((item) => {
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

    // When unfiltered with no search, show a balanced, aesthetic sample of ~50 key nodes to avoid screen clutter
    if (severityFilter === 'all' && !destination.trim()) {
      return matched.slice(0, 50);
    }
    return matched;
  }, [severityFilter, destination, incidentSource]);

  const [isLocating, setIsLocating] = useState(false);
  const [isViewingMyLocation, setIsViewingMyLocation] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

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

    let nearbyCritical = 0;
    let nearbyHigh = 0;
    let nearbyTotalWithin3km = 0;
    let nearbyTotalWithin5km = 0;
    let nearestDist = Infinity;
    let nearestNodeTitle = 'None';

    incidentSource.forEach((inc) => {
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
  }, [userCoords, incidentSource, hasRealLocation]);

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

    incidentSource.forEach((inc) => {
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
    }).sort((a, b) => b.count - a.count);
  }, [incidentSource, userCoords, hasRealLocation]);

  const handleSelectIncident = (incident: TelemetryIncident) => {
    playClick();
    setSelectedIncident(incident);
    setActiveLeftTab('incident');
    setIsMobileCollapsed(false);
    setMapCenter([incident.lat, incident.lng]);
    setMapZoom(14);
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
      // Toggle back: Zoom out to city overview
      setMapCenter(defaultCenter);
      setMapZoom(11);
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
          // Fallback if permission denied or timeout: zoom to city overview without pretending it's real GPS
          setMapCenter(defaultCenter);
          setMapZoom(12);
          setIsLocating(false);
          setIsViewingMyLocation(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setIsLocating(false);
      setMapCenter(defaultCenter);
      setMapZoom(12);
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
      
      {/* ── Unified Left Floating Map Command Dock (Tabbed, Elegant, Non-Intrusive) ── */}
      <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 w-[calc(100%-3.75rem)] sm:w-92 pointer-events-none">
        <div id="tour-map-search" className="neo-glass-card rounded-2xl pointer-events-auto shadow-xl backdrop-blur-xl border border-[var(--border-color)] overflow-hidden transition-all duration-200">
          
          {/* Header Bar with Mode Pill & Minimize Toggle */}
          <div className="flex items-center justify-between gap-2 bg-[var(--bg-main)]/90 border-b border-[var(--border-color)] px-3 py-2">
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
              <span className="text-xs font-bold truncate text-[var(--text-main)]">
                Urban WaterLogging Grid
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)]">
                {copy.oneHour}
              </span>
              <button
                type="button"
                onClick={() => { playClick(); setIsMobileCollapsed(!isMobileCollapsed); }}
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
              
              {/* Segmented Tab Switcher (Search, Forecast, Inspector) */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-[11px] font-semibold">
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
                      placeholder="Search ward, street, or hotspot..."
                      className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
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
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer border ${
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
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-[var(--color-brand-accent)]" />
                      {copy.estimate}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => { playClick(); void reload(); }} 
                      className="text-[10px] font-bold text-[var(--color-brand-accent)] hover:underline cursor-pointer"
                    >
                      {copy.refresh}
                    </button>
                  </div>
                  
                  <p className="text-[var(--text-muted)] text-[11px]">
                    {status === 'loading' && copy.loading}
                    {status === 'error' && copy.error}
                    {status === 'insufficient' && (envMode === 'drought' ? copy.droughtNote : copy.insufficient)}
                    {status === 'ready' && copy.notASensor}
                    {usingDemo && ` ${copy.offlineDemo}`}
                    {stale && status === 'ready' && ` ${copy.stale}`}
                  </p>

                  {forecast?.cells[0]?.target_time && (
                    <div className="pt-1 border-t border-[var(--border-color)]/60 text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                      <span>{copy.oneHour}</span>
                      <span className="font-bold text-[var(--text-main)]">{forecast.cells[0].target_time}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Selected Incident Details */}
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
                          className="px-2 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-main)] flex items-center gap-1"
                        >
                          <span>{copy.openMaps}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
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
        {/* 1. My Location FAB with AnimatedCrosshair */}
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

        {/* 2. Focused Risk Halo / Telemetry Layer Toggle */}
        <Tooltip content={showHeatLayer ? "Hide Risk Halos & Clusters" : "Show Risk Halos & Clusters"} position="left">
          <button
            type="button"
            onClick={() => { playClick(); setShowHeatLayer(!showHeatLayer); }}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              showHeatLayer
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md'
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Toggle Risk Halo"
          >
            <Layers size={15} />
          </button>
        </Tooltip>

        {/* 3. Fullscreen Toggle Button */}
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

        {/* 4. Map Telemetry Info / Legend Button */}
        <Tooltip content={showInfo ? "Close Map Intelligence" : "Map Intelligence"} position="left">
          <button
            type="button"
            onClick={() => { playClick(); setShowInfo(!showInfo); }}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              showInfo 
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md' 
                : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Toggle Map Intelligence"
          >
            {showInfo ? <X size={15} /> : <Info size={15} />}
          </button>
        </Tooltip>

        {/* 5. Start Map Page Tour Guide */}
        <Tooltip content="Live Map Guide" position="left">
          <button
            type="button"
            onClick={() => {
              playClick();
              window.dispatchEvent(new CustomEvent('doab:start-page-tour', { detail: { pageKey: 'dashboard' } }));
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            aria-label="Start Map Tour Guide"
          >
            <Compass size={15} />
          </button>
        </Tooltip>
      </div>

      {/* ── SAHNIRMAAN Floating Map Intelligence & Proximity Radar Card (Anchored to the left of the vertical toolbar) ── */}
      {showInfo && (
        <div className="absolute top-3 right-14 sm:top-4 sm:right-16 z-20 w-80 sm:w-96 p-4 rounded-3xl backdrop-blur-2xl bg-[var(--bg-card)]/95 dark:bg-[#12100e]/95 border border-[var(--border-color)] dark:border-white/15 shadow-2xl space-y-3.5 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)] dark:border-white/10">
            <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-main)]">
              <Radar size={15} className="text-[var(--color-brand-accent)] animate-spin" style={{ animationDuration: '8s' }} />
              <span>Proximity & Route Intelligence</span>
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
              <span>Municipal Telemetry Synced</span>
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

        </div>
      )}

      {/* ── Leaflet Interactive Map View ── */}
      <div className="absolute inset-0 h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
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
          className="h-full w-full z-0 cursor-grab active:cursor-grabbing"
          style={{ height: '100%', width: '100%', minHeight: '100%' }}
        >
          {/* Universal OpenStreetMap Tile Layer (Fast, Reliable, No CORS/API Limits) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={['a', 'b', 'c']}
            maxZoom={19}
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
      </div>
    </div>
  );
}
