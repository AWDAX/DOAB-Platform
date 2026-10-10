import { useCallback, useEffect, useState } from 'react';
import {
  fetchBoundaries,
  fetchForecast,
  fetchIncidents,
  isStale,
  type BoundaryCollection,
  type ForecastResponse,
  type HistoricalIncident,
} from '../lib/predictionApi';

export type ForecastStatus = 'loading' | 'ready' | 'empty' | 'error' | 'insufficient';

export function useForecast() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [incidents, setIncidents] = useState<HistoricalIncident[]>([]);
  const [boundaries, setBoundaries] = useState<BoundaryCollection | null>(null);
  const [status, setStatus] = useState<ForecastStatus>('loading');
  const [usingDemo, setUsingDemo] = useState(false);

  const reload = useCallback(async (signal?: AbortSignal) => {
    setStatus('loading');
    try {
      const [nextForecast, nextIncidents, nextBoundaries] = await Promise.all([
        fetchForecast(signal),
        fetchIncidents(signal),
        fetchBoundaries(signal),
      ]);
      if (signal?.aborted) return;
      setForecast(nextForecast);
      setIncidents(nextIncidents.incidents);
      setBoundaries(nextBoundaries);
      setUsingDemo(false);
      if (nextForecast.data_quality === 'insufficient_data' || nextForecast.cells.length === 0) {
        setStatus('insufficient');
      } else {
        setStatus('ready');
      }
    } catch {
      if (signal?.aborted) return;
      setForecast(null);
      setIncidents([]);
      setBoundaries(null);
      setUsingDemo(true);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const stale = forecast ? isStale(forecast.generated_at, forecast.stale_after_seconds) : false;

  return { forecast, incidents, boundaries, status, usingDemo, stale, reload: () => reload() };
}
