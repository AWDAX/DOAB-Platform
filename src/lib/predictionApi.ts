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

export function fetchImdTelemetry(stationId: string = '43295', signal?: AbortSignal): Promise<ImdTelemetry> {
  return getJson<ImdTelemetry>(`/imd/station/${encodeURIComponent(stationId)}`, signal);
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

export function isStale(generatedAt: string, staleAfterSeconds: number, now = Date.now()): boolean {
  const stamp = Date.parse(generatedAt);
  if (Number.isNaN(stamp)) return true;
  return now - stamp > staleAfterSeconds * 1000;
}
