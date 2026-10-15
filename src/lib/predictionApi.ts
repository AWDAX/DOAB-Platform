export type DataQuality = 'ok' | 'insufficient_data';

export interface ForecastCell {
  lat: number;
  lng: number;
  probability: number | null;
  confidence: 'high' | 'moderate' | 'low' | null;
  horizon_hours: number;
  target_time: string;
  data_quality: DataQuality;
  reason: string | null;
  factors: { name: string; value: number; relation: string }[];
  estimate_label?: string;
}

export interface ForecastResponse {
  generated_at: string;
  stale_after_seconds: number;
  horizon_hours: number;
  coverage: string;
  data_quality: DataQuality;
  reason: string | null;
  cells: ForecastCell[];
  limitation: string;
  cache?: string;
}

export interface HistoricalIncident {
  id: string;
  lat: number;
  lng: number;
  time: string;
  category: string;
  source: string;
  kind: 'historical_complaint';
}

export interface RouteOption {
  summary: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  mean_risk: number | null;
  data_quality: DataQuality;
  scored: boolean;
  maps_url: string;
  rank: string;
}

export interface RouteResponse {
  scored: boolean;
  label: string;
  reason: string | null;
  routes: RouteOption[];
  disclaimer: string;
}

export interface BoundaryCollection {
  type: 'FeatureCollection';
  features: Array<{ type: 'Feature'; properties?: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }>;
  source?: string;
  gaul_loaded?: boolean;
}

const BASE = (import.meta.env.VITE_PREDICTION_API_URL || 'https://api-doab.sahnirmaan.live').replace(/\/$/, '');

export interface ImdTelemetry {
  source: string;
  status: 'live' | 'cached_offline';
  station_id: string;
  station_name: string;
  state: string;
  lat?: number;
  lng?: number;
  observed_at: string;
  rainfall_24h_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  relative_humidity_morning: number;
  relative_humidity_evening: number;
  warning: {
    color: string;
    text: string;
  };
  forecast_summary: string;
  forecast_7day?: Array<{
    day_offset: number;
    forecast: string;
    temp_max: number;
    temp_min: number;
    warning: string;
    color: string;
  }>;
  is_live: boolean;
}

export interface ImdStation {
  station_id: string;
  station: string;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`prediction_api_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchForecast(signal?: AbortSignal): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    min_lat: '12.60',
    max_lat: '13.30',
    min_lng: '77.30',
    max_lng: '77.90',
  });
  return getJson<ForecastResponse>(`/forecast?${params.toString()}`, signal);
}

export function fetchIncidents(signal?: AbortSignal): Promise<{ label: string; incidents: HistoricalIncident[] }> {
  return getJson('/incidents?limit=80', signal);
}

export function fetchBoundaries(signal?: AbortSignal): Promise<BoundaryCollection> {
  return getJson('/boundaries', signal);
}

export interface ImdTelemetryOptions {
  stationId?: string;
  lat?: number;
  lng?: number;
  state?: string;
}

export function fetchImdTelemetry(
  optionsOrStationId?: string | ImdTelemetryOptions,
  signal?: AbortSignal,
): Promise<ImdTelemetry> {
  if (typeof optionsOrStationId === 'string') {
    return getJson<ImdTelemetry>(`/imd/station/${encodeURIComponent(optionsOrStationId)}`, signal);
  }
  const params = new URLSearchParams();
  if (optionsOrStationId?.stationId) params.append('station_id', optionsOrStationId.stationId);
  if (optionsOrStationId?.lat !== undefined && optionsOrStationId.lat !== null) params.append('lat', String(optionsOrStationId.lat));
  if (optionsOrStationId?.lng !== undefined && optionsOrStationId.lng !== null) params.append('lng', String(optionsOrStationId.lng));
  if (optionsOrStationId?.state) params.append('state', optionsOrStationId.state);

  const query = params.toString();
  return getJson<ImdTelemetry>(`/imd/telemetry${query ? `?${query}` : ''}`, signal);
}

export function fetchImdStations(query: string = '', signal?: AbortSignal): Promise<{ query: string; count: number; stations: ImdStation[] }> {
  return getJson(`/imd/stations?query=${encodeURIComponent(query)}`, signal);
}

export function fetchRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RouteResponse> {
  return fetch(`${BASE}/routes`, {
    method: 'POST',
    signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
    }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`prediction_api_${response.status}`);
    return response.json() as Promise<RouteResponse>;
  });
}

export interface LiveNdmaAlert {
  id: string;
  source: string;
  disaster_type: string;
  category: 'Flood' | 'Severe_Weather';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  severity_level?: string;
  area_description: string;
  lat: number | null;
  lng: number | null;
  effective_start_time?: string;
  effective_end_time?: string;
  warning_message: string;
  color?: string;
  sender_org?: string;
  status: string;
}

export interface LiveGmdaIncident {
  id: string;
  source: string;
  category: string;
  survey_type: string;
  severity: string;
  lat: number;
  lng: number;
  area_description: string;
  remarks: string;
  water_type_road?: string | null;
  gully_trap?: string | null;
  status: string;
  updated_time: string;
}

export interface LiveCivicResponse {
  status: string;
  generated_at: string;
  summary: {
    ndma_total_alerts: number;
    ndma_flood_alerts: number;
    gmda_waterlogging_points: number;
  };
  national_alerts: LiveNdmaAlert[];
  municipal_waterlogging: LiveGmdaIncident[];
}

export function fetchLiveAlerts(category?: string, signal?: AbortSignal): Promise<{ source: string; count: number; alerts: LiveNdmaAlert[] }> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return getJson(`/alerts/live${query}`, signal);
}

export function fetchLiveCivicData(signal?: AbortSignal): Promise<LiveCivicResponse> {
  return getJson<LiveCivicResponse>('/incidents/live', signal);
}

export function isStale(generatedAt: string, staleAfterSeconds: number, now = Date.now()): boolean {
  const stamp = Date.parse(generatedAt);
  if (Number.isNaN(stamp)) return true;
  return now - stamp > staleAfterSeconds * 1000;
}

