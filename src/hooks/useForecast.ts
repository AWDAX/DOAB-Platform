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
      const [forecastRes, incidentsRes, boundariesRes] = await Promise.allSettled([
        fetchForecast(signal),
        fetchIncidents(signal),
        fetchBoundaries(signal),
      ]);
      if (signal?.aborted) return;

      const nextForecast = forecastRes.status === 'fulfilled' ? forecastRes.value : null;
      const nextIncidents = incidentsRes.status === 'fulfilled' ? incidentsRes.value.incidents : [];
      const nextBoundaries = boundariesRes.status === 'fulfilled' ? boundariesRes.value : null;

      setForecast(nextForecast);
      setIncidents(nextIncidents);
      setBoundaries(nextBoundaries);

      if (nextForecast && nextForecast.cells && nextForecast.cells.length > 0) {
        setUsingDemo(false);
        setStatus(nextForecast.data_quality === 'insufficient_data' ? 'insufficient' : 'ready');
      } else if (nextBoundaries || nextIncidents.length > 0) {
        setUsingDemo(true);
        setStatus('insufficient');
      } else {
        setUsingDemo(true);
        setStatus('error');
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
