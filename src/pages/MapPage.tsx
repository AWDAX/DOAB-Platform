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

// Leaflet default icon asset fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface TelemetryIncident {
  id: string;
  title: string;
  ward: string;
  category: 'waterlogging' | 'drainage' | 'tanker_dispatch' | 'groundwater_deficit' | 'road_submersion';
  envType: 'flood' | 'drought';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  lat: number;
  lng: number;
  waterDepthCm?: number;
  rainfallMmH?: number;
  drainageBlockagePct?: number;
  groundwaterDeficitMeters?: number;
  tankerDeficitLiters?: number;
  verifiedCount: number;
  updatedTime: string;
  description: string;
}

// Factor-grounded DOAB Civic Telemetry Incidents
export const CIVIC_INCIDENTS: TelemetryIncident[] = [
  // Flood Incidents
  {
    id: 'INC-FL-01',
    title: 'MG Road Junction Submersion',
    ward: 'Ward 14 (Central)',
    category: 'waterlogging',
    envType: 'flood',
    severity: 'Critical',
    lat: 23.3645,
    lng: 85.3260,
    waterDepthCm: 72,
    rainfallMmH: 48,
    drainageBlockagePct: 88,
    verifiedCount: 14,
    updatedTime: '4m ago',
    description: 'Severe stormwater pooling at intersection. Low ground clearance vehicles stalled. Bypass required.'
  },
  {
    id: 'INC-FL-02',
    title: 'Circular Road Underpass Flooding',
    ward: 'Ward 12 (North)',
    category: 'road_submersion',
    envType: 'flood',
    severity: 'High',
    lat: 23.3762,
    lng: 85.3345,
    waterDepthCm: 54,
    rainfallMmH: 42,
    drainageBlockagePct: 65,
    verifiedCount: 9,
    updatedTime: '12m ago',
    description: 'Underpass drainage pump overload. Standing water reaching vehicle exhaust levels.'
  },
  {
    id: 'INC-FL-03',
    title: 'Harmu River Culvert Overflow',
    ward: 'Ward 19 (South-West)',
    category: 'drainage',
    envType: 'flood',
    severity: 'High',
    lat: 23.3480,
    lng: 85.3090,
    waterDepthCm: 44,
    rainfallMmH: 36,
    drainageBlockagePct: 75,
    verifiedCount: 7,
    updatedTime: '18m ago',
    description: 'Silt blockage causing backflow onto main arterial bypass corridor.'
  },
  {
    id: 'INC-FL-04',
    title: 'Ratu Road Market Choke',
    ward: 'Ward 07 (West)',
    category: 'drainage',
    envType: 'flood',
    severity: 'Medium',
    lat: 23.3720,
    lng: 85.3015,
    waterDepthCm: 28,
    rainfallMmH: 22,
    drainageBlockagePct: 52,
    verifiedCount: 5,
    updatedTime: '31m ago',
    description: 'Debris accumulation in storm drain causing slow lateral drainage.'
  },
  {
    id: 'INC-FL-05',
    title: 'Morabadi Outer Ring Telemetry Pool',
    ward: 'Ward 03 (North-West)',
    category: 'waterlogging',
    envType: 'flood',
    severity: 'Low',
    lat: 23.3910,
    lng: 85.3280,
    waterDepthCm: 16,
    rainfallMmH: 15,
    drainageBlockagePct: 30,
    verifiedCount: 3,
    updatedTime: '45m ago',
    description: 'Minor curb accumulation. Road passable with reduced vehicle speed.'
  },

  // Drought Incidents
  {
    id: 'INC-DR-01',
    title: 'Ward 08 Groundwater Table Depletion',
    ward: 'Ward 08 (Southern Sector)',
    category: 'groundwater_deficit',
    envType: 'drought',
    severity: 'Critical',
    lat: 23.3320,
    lng: 85.3180,
    groundwaterDeficitMeters: 19.4,
    tankerDeficitLiters: 45000,
    verifiedCount: 16,
    updatedTime: '6m ago',
    description: '3 Community borewells dried up. Emergency commercial tanker work order dispatched.'
  },
  {
    id: 'INC-DR-02',
    title: 'Kanke Outskirts Agricultural Moisture Deficit',
    ward: 'Ward 02 (North)',
    category: 'tanker_dispatch',
    envType: 'drought',
    severity: 'High',
    lat: 23.4150,
    lng: 85.3180,
    groundwaterDeficitMeters: 14.8,
    tankerDeficitLiters: 32000,
    verifiedCount: 11,
    updatedTime: '15m ago',
    description: 'Perimeter crop cluster experiencing severe water stress. Irrigation tanker scheduled.'
  },
  {
    id: 'INC-DR-03',
    title: 'Doranda Municipal Pressure Drop',
    ward: 'Ward 16 (South)',
    category: 'groundwater_deficit',
    envType: 'drought',
    severity: 'Medium',
    lat: 23.3390,
    lng: 85.3350,
    groundwaterDeficitMeters: 9.2,
    tankerDeficitLiters: 18000,
    verifiedCount: 6,
    updatedTime: '28m ago',
    description: 'Feeder line pipe pressure loss. Relief delivery points activated for residential block.'
  },
  {
    id: 'INC-DR-04',
    title: 'Tupudana Industrial Tanker Queue',
    ward: 'Ward 24 (South Outer)',
    category: 'tanker_dispatch',
    envType: 'drought',
    severity: 'Medium',
    lat: 23.2890,
    lng: 85.2980,
    groundwaterDeficitMeters: 8.5,
    tankerDeficitLiters: 25000,
    verifiedCount: 4,
    updatedTime: '50m ago',
    description: 'Industrial supply allocation queued for priority civic refilling.'
  },
  {
    id: 'INC-DR-05',
    title: 'Namkum Reservoir Dry Margin',
    ward: 'Ward 21 (East)',
    category: 'groundwater_deficit',
    envType: 'drought',
    severity: 'Low',
    lat: 23.3420,
    lng: 85.3780,
    groundwaterDeficitMeters: 5.1,
    tankerDeficitLiters: 8000,
    verifiedCount: 2,
    updatedTime: '1h ago',
    description: 'Low water table boundary monitored. Standard supply cycle active.'
  }
];

// Helper: Custom Clean Marker Icons (Hardware Accelerated SVG DivIcons)
function createIncidentMarkerIcon(severity: string, isSelected: boolean) {
  let ringColor = 'rgba(234, 88, 12, 0.95)';
  let haloColor = 'rgba(234, 88, 12, 0.22)';
  let dotColor = '#EA580C';

  if (severity === 'High') {
    ringColor = 'rgba(245, 158, 11, 0.95)';
    haloColor = 'rgba(245, 158, 11, 0.20)';
    dotColor = '#F59E0B';
  } else if (severity === 'Medium') {
    ringColor = 'rgba(2, 132, 199, 0.90)';
    haloColor = 'rgba(2, 132, 199, 0.18)';
    dotColor = '#0284C7';
  } else if (severity === 'Low') {
    ringColor = 'rgba(100, 116, 139, 0.85)';
    haloColor = 'rgba(100, 116, 139, 0.15)';
    dotColor = '#64748B';
  }

  const size = isSelected ? 32 : 24;
  const half = size / 2;

  return L.divIcon({
    className: 'custom-incident-pin',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        ${isSelected ? `<span style="position:absolute; inset:0; border-radius:50%; background:${haloColor}; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>` : ''}
        <div style="
          width:${isSelected ? 24 : 18}px; 
          height:${isSelected ? 24 : 18}px; 
          border-radius:50%; 
          background:${haloColor}; 
          border:2px solid ${ringColor}; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.25); 
          display:flex; align-items:center; justify-content:center;
          transition: transform 0.15s ease;
        ">
          <div style="width:${isSelected ? 8 : 6}px; height:${isSelected ? 8 : 6}px; border-radius:50%; background:${dotColor};"></div>
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
    <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(2,132,199,0.35); animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:18px; height:18px; border-radius:50%; background:#0284C7; border:3px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center;">
        <div style="width:5px; height:5px; border-radius:50%; background:#ffffff;"></div>
      </div>
    </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
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
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function MapPage() {
  const [destination, setDestination] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<TelemetryIncident | null>(CIVIC_INCIDENTS[0]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');
  const [showHeatLayer, setShowHeatLayer] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.3645, 85.3260]);
  const [mapZoom, setMapZoom] = useState(13);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  // User live location (Default: Ward 14 MG Road)
  const userCoords: [number, number] = [23.3600, 85.3240];

  // Filter incidents based on criteria
  const filteredIncidents = useMemo(() => {
    return CIVIC_INCIDENTS.filter((item) => {
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (destination.trim()) {
        const query = destination.toLowerCase();
        return item.title.toLowerCase().includes(query) || item.ward.toLowerCase().includes(query);
      }
      return true;
    });
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
    setMapZoom(14);
  };

  return (
    <div id="tour-map-view" className="flex-grow flex flex-col relative w-full h-full bg-[var(--bg-main)] overflow-hidden">
      
      {/* ── Left Floating Controls & Incident Inspector Panel ── */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 w-[calc(100%-1.5rem)] sm:w-88 flex flex-col gap-2.5 pointer-events-none max-h-[calc(100%-2rem)]">
        
        {/* Search & Safe Routing Card */}
        <div className="neo-glass-card p-3 sm:p-4 rounded-2xl flex flex-col gap-2.5 pointer-events-auto shadow-lg backdrop-blur-xl border border-[var(--border-color)]">
          <div className="flex items-center justify-between gap-2 bg-[var(--bg-main)]/90 border border-[var(--border-color)] px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
              <span className="text-xs font-semibold truncate text-[var(--text-main)]">GPS: Ward 14 (MG Road)</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">
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
                  placeholder="Search ward or safe destination..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] shadow-inner transition-colors text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
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
          <div className="p-4 sm:p-4.5 bg-[var(--bg-card)]/95 border border-[var(--border-color)] rounded-2xl flex flex-col gap-3 pointer-events-auto shadow-xl backdrop-blur-xl transition-all duration-200">
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
                  <h4 className="font-bold text-xs text-[var(--text-main)] leading-tight">
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
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-[var(--bg-main)]/90 rounded-xl border border-[var(--border-color)] text-center">
              {selectedIncident.envType === 'flood' ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Water Depth</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      {selectedIncident.waterDepthCm} cm
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[var(--border-color)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Rain Rate</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                      {selectedIncident.rainfallMmH} mm/h
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Drain Choke</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                      {selectedIncident.drainageBlockagePct}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Table Deficit</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      -{selectedIncident.groundwaterDeficitMeters} m
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[var(--border-color)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Tanker Need</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                      {(selectedIncident.tankerDeficitLiters || 0) / 1000}k L
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Verified</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {selectedIncident.verifiedCount} Riders
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-1">
              <Link
                to="/routes/best"
                onClick={() => playClick()}
                className="flex-1 py-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-2xs"
              >
                <RouteIcon className="h-3.5 w-3.5" />
                Reroute Around
              </Link>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
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
          title="Toggle Risk Halo Circles"
          aria-label="Toggle Risk Circles"
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      {/* ── Leaflet Interactive Map View ── */}
      <div className="flex-grow relative h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
          style={{ height: '100%', width: '100%' }}
        >
          {/* CartoDB Clean Tiles (Adapts seamlessly to light & dark themes) */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          <MapViewController center={mapCenter} zoom={mapZoom} />

          {/* User Live GPS Marker */}
          <Marker position={userCoords} icon={USER_LIVE_ICON} />

          {/* Risk Halos (Visual Range of Waterlogging / Drought Radius) */}
          {showHeatLayer && filteredIncidents.map((inc) => (
            <Circle
              key={`circle-${inc.id}`}
              center={[inc.lat, inc.lng]}
              radius={inc.severity === 'Critical' ? 450 : inc.severity === 'High' ? 300 : 180}
              pathOptions={{
                color: inc.severity === 'Critical' ? '#EA580C' : inc.severity === 'High' ? '#F59E0B' : '#0284C7',
                fillColor: inc.severity === 'Critical' ? '#EA580C' : inc.severity === 'High' ? '#F59E0B' : '#0284C7',
                fillOpacity: selectedIncident?.id === inc.id ? 0.22 : 0.10,
                weight: selectedIncident?.id === inc.id ? 2 : 1,
                dashArray: inc.severity === 'Critical' ? '4, 4' : undefined,
              }}
            />
          ))}

          {/* Telemetry Incident Pins */}
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

      {/* ── Bottom Floating Telemetry Summary Bar ── */}
      <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-auto sm:right-4 z-20 pointer-events-auto flex items-center justify-between sm:justify-end gap-3">
        <div className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-muted)] shadow-lg flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-[var(--text-main)]">{filteredIncidents.length} Active Incidents</span>
          <span>•</span>
          <span>Ranchi Grid (Ward 01 - 24)</span>
        </div>
      </div>
    </div>
  );
}
