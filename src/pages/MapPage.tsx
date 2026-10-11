import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  Crosshair
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { playClick } from '../utils/soundFx';
import AnimatedCrosshair from '../components/AnimatedCrosshair';
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
  const userCoords: [number, number] = [12.9716, 77.5946];

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

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

  const handleSelectIncident = (incident: TelemetryIncident) => {
    playClick();
    setSelectedIncident(incident);
    setMapCenter([incident.lat, incident.lng]);
    setMapZoom(14);
  };

  const handleRecenter = () => {
    playClick();
    if (isViewingMyLocation) {
      // Zoom out to city overview
      setMapCenter(defaultCenter);
      setMapZoom(11);
      setIsViewingMyLocation(false);
    } else {
      // Zoom in to GPS
      setIsLocating(true);
      setTimeout(() => {
        setIsLocating(false);
        setMapCenter(userCoords);
        setMapZoom(15);
        setIsViewingMyLocation(true);
      }, 400);
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
      
      {/* ── Left Floating Controls & Incident Inspector Panel ── */}
      <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 w-[calc(100%-3.75rem)] sm:w-92 flex flex-col gap-2.5 pointer-events-none max-h-[calc(100%-1.5rem)] overflow-y-auto custom-scrollbar">
        
        {/* Search & Safe Routing Card */}
        <div id="tour-map-search" className="neo-glass-card p-2.5 sm:p-3.5 rounded-2xl flex flex-col gap-2.5 pointer-events-auto shadow-lg backdrop-blur-xl border border-[var(--border-color)]">
          
          <div className="flex items-center justify-between gap-2 bg-[var(--bg-main)]/90 border border-[var(--border-color)] px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
              <span className="text-xs font-semibold truncate text-[var(--text-main)]">
                GPS: Urban WaterLogging Grid
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)] dark:bg-white/10 text-[var(--text-main)] dark:text-neutral-200">
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
            <>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Search ward, street, or hotspot..."
                  className="w-full pl-9 pr-3.5 py-2 text-base sm:text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] shadow-inner transition-colors text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
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
                      onClick={() => { playClick(); setSeverityFilter(sev); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                        active 
                          ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]' 
                          : 'bg-[var(--bg-main)]/70 text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border-color)]'
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
                Compute Safe Path
              </Link>
            </>
          )}
        </div>

        <div className="neo-glass-card p-3 rounded-2xl pointer-events-auto border border-[var(--border-color)] shadow-lg text-[11px] text-[var(--text-muted)] leading-relaxed">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider">{copy.estimate}</span>
            <button type="button" onClick={() => { playClick(); void reload(); }} className="font-semibold text-[var(--text-main)] cursor-pointer">
              {copy.refresh}
            </button>
          </div>
          <p>
            {status === 'loading' && copy.loading}
            {status === 'error' && copy.error}
            {status === 'insufficient' && (envMode === 'drought' ? copy.droughtNote : copy.insufficient)}
            {status === 'ready' && copy.notASensor}
            {usingDemo && ` ${copy.offlineDemo}`}
            {stale && status === 'ready' && ` ${copy.stale}`}
          </p>
          {forecast?.cells[0]?.target_time && (
            <p className="mt-1 font-mono text-[10px]">{copy.oneHour}: {forecast.cells[0].target_time}</p>
          )}
        </div>

        {/* Selected Incident Telemetry Card */}
        {selectedIncident && !isMobileCollapsed && (
          <div className="p-3.5 sm:p-4 bg-[var(--bg-card)]/95 border border-[var(--border-color)] rounded-2xl flex flex-col gap-2.5 pointer-events-auto shadow-xl backdrop-blur-xl transition-all duration-200">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                  selectedIncident.severity === 'Critical'
                    ? 'bg-orange-500/15 text-orange-600 border-orange-500/30'
                    : selectedIncident.severity === 'High'
                      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                      : 'bg-sky-500/15 text-sky-600 border-sky-500/30'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-main)] leading-tight line-clamp-2">
                    {selectedIncident.title}
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-0.5">
                    {selectedIncident.ward} • {selectedIncident.updatedTime}
                  </span>
                </div>
              </div>

              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                selectedIncident.severity === 'Critical'
                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40'
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
            <p className="text-[10px] text-[var(--text-muted)]">{copy.notASensor}</p>

            <div className="flex items-center justify-between gap-2.5 pt-0.5">
              <Link
                to={`/routes/best?lat=${selectedIncident.lat}&lng=${selectedIncident.lng}`}
                onClick={() => playClick()}
                className="flex-1 py-1.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-2xs"
              >
                <RouteIcon className="h-3.5 w-3.5" />
                Reroute Around
              </Link>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${selectedIncident.lat},${selectedIncident.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClick()}
                className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] text-[10px] font-semibold text-[var(--text-main)]"
              >
                {copy.openMaps}
              </a>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Top-Right SAHNIRMAAN Floating Neo-Glass Map Controls Toolbar ── */}
      <div id="tour-map-controls" className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)]/90 dark:bg-[#12100e]/90 backdrop-blur-xl border border-[var(--border-color)] dark:border-white/15 shadow-xl pointer-events-auto">
        {/* 1. My Location FAB with AnimatedCrosshair */}
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
          title={isViewingMyLocation ? "Viewing My Location (Click to zoom out)" : "Go to My Location"}
          aria-label={isViewingMyLocation ? "Zoom out to regional map overview" : "Fly map to my current GPS location"}
        >
          <AnimatedCrosshair size={16} locating={isLocating} active={isViewingMyLocation} />
        </button>

        {/* 2. Focused Risk Halo / Telemetry Layer Toggle */}
        <button
          type="button"
          onClick={() => { playClick(); setShowHeatLayer(!showHeatLayer); }}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            showHeatLayer
              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md'
              : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          title="Toggle Risk Halo & Prediction Cells"
          aria-label="Toggle Risk Halo"
        >
          <Layers size={15} />
        </button>

        {/* 3. Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isFullScreen 
              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md' 
              : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          title={isFullScreen ? "Exit Fullscreen" : "Toggle Fullscreen Map"}
          aria-label="Toggle Fullscreen"
        >
          {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* 4. Map Telemetry Info / Legend Button */}
        <button
          type="button"
          onClick={() => { playClick(); setShowInfo(!showInfo); }}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            showInfo 
              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md' 
              : 'text-neutral-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          title={showInfo ? "Close Map Intelligence" : "Open Map Intelligence"}
          aria-label="Toggle Map Intelligence"
        >
          {showInfo ? <X size={15} /> : <Info size={15} />}
        </button>
      </div>

      {/* ── SAHNIRMAAN Floating Map Intelligence & Legend Card (Anchored below toolbar) ── */}
      {showInfo && (
        <div className="absolute top-16 right-3 sm:right-4 z-20 w-72 sm:w-80 p-4 rounded-2xl backdrop-blur-2xl bg-[var(--bg-card)]/95 dark:bg-[#12100e]/95 border border-[var(--border-color)] dark:border-white/15 shadow-2xl space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] dark:border-white/10">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-neutral-900 dark:text-white">
              <Radar size={14} className="text-[var(--color-brand-accent)]" />
              <span>GIS Urban WaterLogging Grid</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live Telemetry
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed">
              Real-time spatial telemetry combining historical municipal complaints, radar precipitation, and one-hour elevation-aware forecasts.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Top Severity</div>
                <div className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5">
                  {filteredIncidents.some(i => i.severity === 'Critical') ? 'Critical (40+ cm)' : 'High Hazard'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-main)]/90 border border-[var(--border-color)] dark:border-white/5">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Active Nodes</div>
                <div className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5">
                  {filteredIncidents.length} Hotspots
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span>GPS: WGS84 EPSG:4326</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Synchronized</span>
            </div>
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

          {/* User Live GPS Marker */}
          <Marker position={userCoords} icon={USER_LIVE_ICON} />

          {/* Focused Risk Halo: Rendered ONLY for the currently inspected incident */}
          {showHeatLayer && selectedIncident && (
            <Circle
              center={[selectedIncident.lat, selectedIncident.lng]}
              radius={selectedIncident.severity === 'Critical' ? 320 : selectedIncident.severity === 'High' ? 220 : 140}
              pathOptions={{
                color: selectedIncident.severity === 'Critical' ? '#E11D48' : selectedIncident.severity === 'High' ? '#D97706' : '#0284C7',
                fillColor: selectedIncident.severity === 'Critical' ? '#E11D48' : selectedIncident.severity === 'High' ? '#D97706' : '#0284C7',
                fillOpacity: 0.14,
                weight: 1.5,
                dashArray: '4, 4',
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
