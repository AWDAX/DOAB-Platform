import type { LivePlace } from '../data/livePlaces';

/**
 * Live hazard indicators derived from Open-Meteo model rainfall and topsoil moisture
 * (no API key required).
 *
 * These are rainfall-derived indicators. They are NOT official flood warnings or
 * drought declarations from IMD, CWC, or any state government.
 *
 * Data resolution is about 11 km (the weather grid); a cell is a sample point, not a
 * measurement of a specific street.
 */

export type HazardLevel = 'elevated' | 'high' | 'severe';
/** 'none' = data present, no hazard. null = data unavailable for that point. */
export type HazardOutcome = HazardLevel | 'none' | null;

export interface ViewBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface GridPoint {
  lat: number;
  lng: number;
}

export interface PointReading {
  rain3h?: number;
  rain24h?: number;
  rain30d?: number;
}

export interface HazardCell extends GridPoint {
  key: string;
  name: string;
  state: string;
  flood: HazardOutcome;
  drought: HazardOutcome;
  rain3h: number | null;
  rain24h: number | null;
  rainNext6h: number | null;
  rain30d: number | null;
  /** Topsoil moisture, 0–7 cm, as a fraction (m³/m³). */
  soilMoisture: number | null;
  /** rain30d divided by the visible-area median, when a relative comparison was used. */
  droughtRatio: number | null;
}

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const MIN_SPACING_DEG = 0.1; // about 11 km, matching the weather grid
const MAX_SPACING_DEG = 1.0;
const MAX_GRID_SIDE = 12;
const BATCH_SIZE = 100;

// Heavy / very heavy rain categories (24 h totals) follow the IMD thresholds already encoded
// in Nature data/main.py (heavy_rain 64.5 mm, very_heavy_rain 115.6 mm).
// The 35 mm "elevated" floor and the 15 mm 3-hour burst are DOAB heuristics, not IMD categories.
export const FLOOD_RAIN_24H_MM = { elevated: 35, high: 64.5, severe: 115.6 } as const;
export const FLOOD_BURST_3H_MM = 15;
// Rain still to fall in the next 6 hours. These are short-burst waterlogging heuristics.
export const FLOOD_NEXT_6H_MM = { elevated: 15, high: 30, severe: 50 } as const;

// Topsoil moisture (m³/m³, 0–7 cm) combined with a dry 30-day total.
// A single soil-moisture cutoff is not a drought declaration; it is a dryness signal.
export const DROUGHT_SOIL = {
  elevated: { moisture: 0.22, rain30d: 70 },
  high: { moisture: 0.16, rain30d: 40 },
  severe: { moisture: 0.12, rain30d: 20 },
} as const;

const LEVEL_RANK: Record<HazardLevel | 'none', number> = { none: 0, elevated: 1, high: 2, severe: 3 };

// Drought is judged against the visible area's own median, because official seasonal
// normals are not available in the browser. Ratios below 1 mean drier than the area median.
export const DROUGHT_RATIO = { elevated: 0.75, high: 0.5, severe: 0.25 } as const;
// If the visible area's median 30-day rain is below this, a relative comparison is meaningless.
export const DROUGHT_MIN_MEDIAN_MM = 5;

export function pointKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Aligned grid that covers the view with one ring of padding. Keeps a fixed size bound. */
export function buildGrid(bounds: ViewBounds): { spacing: number; points: GridPoint[] } {
  const span = Math.max(bounds.north - bounds.south, bounds.east - bounds.west);
  const rawSpacing = Math.ceil((span / 8) * 100) / 100;
  const spacing = Math.min(MAX_SPACING_DEG, Math.max(MIN_SPACING_DEG, rawSpacing));

  const startLat = (Math.floor(bounds.south / spacing) - 1) * spacing;
  const startLng = (Math.floor(bounds.west / spacing) - 1) * spacing;
  const countLat = Math.min(MAX_GRID_SIDE, Math.ceil((bounds.north - startLat) / spacing) + 2);
  const countLng = Math.min(MAX_GRID_SIDE, Math.ceil((bounds.east - startLng) / spacing) + 2);

  const points: GridPoint[] = [];
  for (let i = 0; i < countLat; i += 1) {
    for (let j = 0; j < countLng; j += 1) {
      points.push({
        lat: roundTo(startLat + i * spacing, 4),
        lng: roundTo(startLng + j * spacing, 4),
      });
    }
  }
  return { spacing, points };
}

function stronger(a: HazardLevel | 'none', b: HazardLevel | 'none'): HazardLevel | 'none' {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

export function classifyFlood(rain24h: number, rain3h: number, rainNext6h = 0): HazardOutcome {
  let past: HazardLevel | 'none' = 'none';
  if (rain24h >= FLOOD_RAIN_24H_MM.severe) past = 'severe';
  else if (rain24h >= FLOOD_RAIN_24H_MM.high) past = 'high';
  else if (rain24h >= FLOOD_RAIN_24H_MM.elevated || rain3h >= FLOOD_BURST_3H_MM) past = 'elevated';

  let ahead: HazardLevel | 'none' = 'none';
  if (rainNext6h >= FLOOD_NEXT_6H_MM.severe) ahead = 'severe';
  else if (rainNext6h >= FLOOD_NEXT_6H_MM.high) ahead = 'high';
  else if (rainNext6h >= FLOOD_NEXT_6H_MM.elevated) ahead = 'elevated';

  return stronger(past, ahead);
}

/** Dryness from current topsoil moisture plus the last 30 days of rain. */
export function classifyDroughtFromSoil(soilMoisture: number, rain30d: number): HazardOutcome {
  if (soilMoisture < DROUGHT_SOIL.severe.moisture && rain30d < DROUGHT_SOIL.severe.rain30d) return 'severe';
  if (soilMoisture < DROUGHT_SOIL.high.moisture && rain30d < DROUGHT_SOIL.high.rain30d) return 'high';
  if (soilMoisture < DROUGHT_SOIL.elevated.moisture && rain30d < DROUGHT_SOIL.elevated.rain30d) return 'elevated';
  return 'none';
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function classifyDroughtRelative(rain30d: number, areaMedian: number): { level: HazardOutcome; ratio: number } {
  const ratio = rain30d / areaMedian;
  if (ratio < DROUGHT_RATIO.severe) return { level: 'severe', ratio };
  if (ratio < DROUGHT_RATIO.high) return { level: 'high', ratio };
  if (ratio < DROUGHT_RATIO.elevated) return { level: 'elevated', ratio };
  return { level: 'none', ratio };
}

/** Combine per-point readings into classified cells. Drought is judged against the area median. */
export function buildHazardCells(points: GridPoint[], readings: Map<string, PointReading>): {
  cells: HazardCell[];
  droughtComparable: boolean;
} {
  const rain30dValues = points
    .map((p) => readings.get(pointKey(p.lat, p.lng))?.rain30d)
    .filter((v): v is number => typeof v === 'number');
  const areaMedian = median(rain30dValues);
  const droughtComparable = areaMedian !== null && areaMedian >= DROUGHT_MIN_MEDIAN_MM;

  const cells = points.map((point): HazardCell => {
    const key = pointKey(point.lat, point.lng);
    const reading = readings.get(key) ?? {};
    const flood: HazardOutcome =
      reading.rain24h === undefined || reading.rain3h === undefined
        ? null
        : classifyFlood(reading.rain24h, reading.rain3h);

    let drought: HazardOutcome = null;
    let droughtRatio: number | null = null;
    if (reading.rain30d !== undefined && droughtComparable && areaMedian !== null) {
      const result = classifyDroughtRelative(reading.rain30d, areaMedian);
      drought = result.level;
      droughtRatio = result.ratio;
    }

    return {
      ...point,
      key,
      name: '',
      state: '',
      flood,
      drought,
      rain3h: reading.rain3h ?? null,
      rain24h: reading.rain24h ?? null,
      rainNext6h: null,
      rain30d: reading.rain30d ?? null,
      soilMoisture: null,
      droughtRatio,
    };
  });
  return { cells, droughtComparable };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface OpenMeteoLocation {
  hourly?: { time: string[]; precipitation: (number | null)[] };
  daily?: { time: string[]; precipitation_sum: (number | null)[] };
  error?: boolean;
  reason?: string;
}

function asLocations(payload: unknown): OpenMeteoLocation[] {
  const list = Array.isArray(payload) ? payload : [payload];
  for (const item of list) {
    if ((item as OpenMeteoLocation).error) {
      throw new Error((item as OpenMeteoLocation).reason ?? 'Open-Meteo request failed');
    }
  }
  return list as OpenMeteoLocation[];
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  // Open-Meteo returns a JSON error body with a non-2xx status when the quota is exceeded.
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || payload === null) {
    const reason = (payload as OpenMeteoLocation | null)?.reason;
    throw new Error(reason ?? `Open-Meteo HTTP ${response.status}`);
  }
  return payload;
}

function coordinateParams(points: GridPoint[]): string {
  return `latitude=${points.map((p) => p.lat).join(',')}&longitude=${points.map((p) => p.lng).join(',')}`;
}

/** Sum hourly precipitation for hours that start in (fromMs, toMs]. Returns null if no data. */
function sumHourly(times: string[], values: (number | null)[], fromMs: number, toMs: number): number | null {
  let total = 0;
  let count = 0;
  times.forEach((time, index) => {
    const startMs = Date.parse(`${time}Z`);
    const value = values[index];
    if (startMs > fromMs && startMs <= toMs && typeof value === 'number') {
      total += value;
      count += 1;
    }
  });
  return count > 0 ? total : null;
}

/** Last 3 h and 24 h rainfall ending at the current UTC hour. */
export async function fetchFloodRain(
  points: GridPoint[],
  signal: AbortSignal,
  nowMs: number = Date.now(),
): Promise<Map<string, { rain3h: number; rain24h: number }>> {
  const toMs = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const out = new Map<string, { rain3h: number; rain24h: number }>();

  for (const batch of chunk(points, BATCH_SIZE)) {
    const url = `${OPEN_METEO_FORECAST_URL}?${coordinateParams(batch)}&hourly=precipitation&past_days=1&forecast_days=1&timezone=GMT`;
    const locations = asLocations(await getJson(url, signal));
    batch.forEach((point, index) => {
      const hourly = locations[index]?.hourly;
      if (!hourly) return;
      const rain24h = sumHourly(hourly.time, hourly.precipitation, toMs - 24 * 3_600_000, toMs);
      const rain3h = sumHourly(hourly.time, hourly.precipitation, toMs - 3 * 3_600_000, toMs);
      if (rain24h !== null && rain3h !== null) {
        out.set(pointKey(point.lat, point.lng), { rain3h, rain24h });
      }
    });
  }
  return out;
}

/** Total rainfall over the last 30 completed UTC days (today is excluded because it is partial). */
export async function fetchDroughtRain(
  points: GridPoint[],
  signal: AbortSignal,
  nowMs: number = Date.now(),
): Promise<Map<string, number>> {
  const todayUtc = new Date(nowMs).toISOString().slice(0, 10);
  const out = new Map<string, number>();

  for (const batch of chunk(points, BATCH_SIZE)) {
    const url = `${OPEN_METEO_FORECAST_URL}?${coordinateParams(batch)}&daily=precipitation_sum&past_days=30&forecast_days=1&timezone=GMT`;
    const locations = asLocations(await getJson(url, signal));
    batch.forEach((point, index) => {
      const daily = locations[index]?.daily;
      if (!daily) return;
      const values: number[] = [];
      daily.time.forEach((day, i) => {
        const value = daily.precipitation_sum[i];
        if (day < todayUtc && typeof value === 'number') values.push(value);
      });
      const window = values.slice(-30);
      if (window.length >= 25) {
        out.set(pointKey(point.lat, point.lng), window.reduce((sum, v) => sum + v, 0));
      }
    });
  }
  return out;
}

interface SnapshotLocation {
  hourly?: {
    time: string[];
    precipitation: (number | null)[];
    soil_moisture_0_to_7cm?: (number | null)[];
  };
  daily?: { time: string[]; precipitation_sum: (number | null)[] };
  error?: boolean;
  reason?: string;
}

/** Local hour stamp in Asia/Kolkata, matching Open-Meteo `timezone=Asia/Kolkata` strings. */
export function kolkataHourStamp(nowMs: number): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(nowMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`;
}

function shiftStamp(stamp: string, hours: number): string {
  const utc = Date.parse(`${stamp}:00+05:30`);
  return kolkataHourStamp(utc + hours * 3_600_000);
}

function sumBetween(times: string[], values: (number | null)[], after: string, until: string): number | null {
  let total = 0;
  let count = 0;
  times.forEach((time, index) => {
    const value = values[index];
    if (time > after && time <= until && typeof value === 'number') {
      total += value;
      count += 1;
    }
  });
  return count > 0 ? total : null;
}

/**
 * One request for every named place: recent rain, rain still to fall, 30-day total, and topsoil moisture.
 */
export async function fetchPlaceSnapshot(
  places: LivePlace[],
  signal: AbortSignal,
  nowMs: number = Date.now(),
): Promise<HazardCell[]> {
  const nowStamp = kolkataHourStamp(nowMs);
  const today = nowStamp.slice(0, 10);
  const url =
    `${OPEN_METEO_FORECAST_URL}?${coordinateParams(places)}` +
    `&hourly=precipitation,soil_moisture_0_to_7cm&daily=precipitation_sum` +
    `&past_days=30&forecast_days=2&timezone=Asia%2FKolkata`;
  const locations = asLocations(await getJson(url, signal)) as SnapshotLocation[];

  return places.map((place, index) => {
    const location = locations[index];
    const hourly = location?.hourly;
    const daily = location?.daily;
    const key = pointKey(place.lat, place.lng);

    let rain3h: number | null = null;
    let rain24h: number | null = null;
    let rainNext6h: number | null = null;
    let soilMoisture: number | null = null;
    if (hourly) {
      rain3h = sumBetween(hourly.time, hourly.precipitation, shiftStamp(nowStamp, -3), nowStamp);
      rain24h = sumBetween(hourly.time, hourly.precipitation, shiftStamp(nowStamp, -24), nowStamp);
      rainNext6h = sumBetween(hourly.time, hourly.precipitation, nowStamp, shiftStamp(nowStamp, 6));
      const soilIndex = hourly.time.indexOf(nowStamp);
      const soil = soilIndex >= 0 ? hourly.soil_moisture_0_to_7cm?.[soilIndex] : undefined;
      soilMoisture = typeof soil === 'number' ? soil : null;
    }

    let rain30d: number | null = null;
    if (daily) {
      const values: number[] = [];
      daily.time.forEach((day, i) => {
        const value = daily.precipitation_sum[i];
        if (day < today && typeof value === 'number') values.push(value);
      });
      const window = values.slice(-30);
      if (window.length >= 25) rain30d = window.reduce((sum, value) => sum + value, 0);
    }

    const flood: HazardOutcome =
      rain24h === null || rain3h === null ? null : classifyFlood(rain24h, rain3h, rainNext6h ?? 0);
    const drought: HazardOutcome =
      soilMoisture === null || rain30d === null ? null : classifyDroughtFromSoil(soilMoisture, rain30d);

    return {
      key,
      name: place.name,
      state: place.state,
      lat: place.lat,
      lng: place.lng,
      flood,
      drought,
      rain3h,
      rain24h,
      rainNext6h,
      rain30d,
      soilMoisture,
      droughtRatio: null,
    };
  });
}
