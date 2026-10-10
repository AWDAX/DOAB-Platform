import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  AlertTriangle, 
  Route as RouteIcon, 
  Crosshair, 
  Layers, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { playClick } from '../utils/soundFx';
import { WATERLOGGING_DATASET_INCIDENTS, type TelemetryIncident } from '../data/waterloggingIncidents';

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

export default function MapPage() {
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
  const filteredIncidents = useMemo(() => {
    const matched = WATERLOGGING_DATASET_INCIDENTS.filter((item) => {
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
  }, [severityFilter, destination]);

  const handleSelectIncident = (incident: TelemetryIncident) => {
    playClick();
    setSelectedIncident(incident);
    setMapCenter([incident.lat, incident.lng]);
    setMapZoom(14);
  };

  const handleRecenter = () => {
    playClick();
    setMapCenter(userCoords);
    setMapZoom(12);
  };

  return (
    <div id="tour-map-view" className="flex-grow flex flex-col relative w-full h-full min-h-[420px] bg-[var(--bg-main)] overflow-hidden">
      
      {/* ── Left Floating Controls & Incident Inspector Panel ── */}
      <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 w-[calc(100%-3.75rem)] sm:w-92 flex flex-col gap-2.5 pointer-events-none max-h-[calc(100%-1.5rem)] overflow-y-auto custom-scrollbar">
        
        {/* Search & Safe Routing Card */}
        <div className="neo-glass-card p-2.5 sm:p-3.5 rounded-2xl flex flex-col gap-2.5 pointer-events-auto shadow-lg backdrop-blur-xl border border-[var(--border-color)]">
          
          <div className="flex items-center justify-between gap-2 bg-[var(--bg-main)]/90 border border-[var(--border-color)] px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
              <span className="text-xs font-semibold truncate text-[var(--text-main)]">
                GPS: Urban WaterLogging Grid
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                Live
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
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] shadow-inner transition-colors text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
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
              {selectedIncident.description}
            </p>

            {/* DOAB Real Telemetry Factors Grid */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-[var(--bg-main)]/90 rounded-xl border border-[var(--border-color)] text-center">
              {selectedIncident.envType === 'flood' ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Water Depth</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      {selectedIncident.waterDepthCm || 40} cm
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[var(--border-color)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Rain Rate</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                      {selectedIncident.rainfallMmH || 35} mm/h
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Drain Choke</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                      {selectedIncident.drainageBlockagePct || 70}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Table Deficit</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      -{selectedIncident.groundwaterDeficitMeters || 12} m
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[var(--border-color)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Tanker Need</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                      {((selectedIncident.tankerDeficitLiters || 20000) / 1000).toFixed(0)}k L
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Verified</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {selectedIncident.verifiedCount} Reports
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-0.5">
              <Link
                to="/routes/best"
                onClick={() => playClick()}
                className="flex-1 py-1.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-2xs"
              >
                <RouteIcon className="h-3.5 w-3.5" />
                Reroute Around
              </Link>
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

      {/* ── Top-Right Map Controls ── */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-2.5 rounded-xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors shadow-lg cursor-pointer"
          title="Recenter to GPS Location"
          aria-label="Recenter to GPS"
        >
          <Crosshair className="h-4 w-4 text-[var(--color-brand-accent)]" />
        </button>

        <button
          type="button"
          onClick={() => { playClick(); setShowHeatLayer(!showHeatLayer); }}
          className={`p-2.5 rounded-xl backdrop-blur-md border transition-colors shadow-lg cursor-pointer ${
            showHeatLayer
              ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]'
              : 'bg-[var(--bg-card)]/90 text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
          }`}
          title="Toggle Focused Risk Halo"
          aria-label="Toggle Focused Risk Halo"
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

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
