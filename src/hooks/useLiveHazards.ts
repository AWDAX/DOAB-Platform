import { useCallback, useEffect, useState } from 'react';
import { LIVE_PLACES } from '../data/livePlaces';
import { fetchPlaceSnapshot, type HazardCell } from '../lib/liveHazards';

const CACHE_KEY = 'doab_live_places_v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface LiveHazardState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  cells: HazardCell[];
  spacing: number;
  droughtComparable: boolean;
  updatedAt: Date | null;
  error: string | null;
  reload: () => void;
}

interface CacheBody {
  at: number;
  cells: HazardCell[];
}

function readCache(): CacheBody | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheBody;
    if (!parsed?.at || !Array.isArray(parsed.cells)) return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cells: HazardCell[]) {
  try {
    const body: CacheBody = { at: Date.now(), cells };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(body));
  } catch {
    // sessionStorage can be unavailable; the map still works for this visit.
  }
}

export function useLiveHazards(enabled: { flood: boolean; drought: boolean }): LiveHazardState {
  const [status, setStatus] = useState<LiveHazardState['status']>('idle');
  const [cells, setCells] = useState<HazardCell[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const active = enabled.flood || enabled.drought;

  const reload = useCallback(() => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    const cached = reloadToken === 0 ? readCache() : null;
    if (cached) {
      setCells(cached.cells);
      setUpdatedAt(new Date(cached.at));
      setStatus('ready');
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setStatus('loading');
    fetchPlaceSnapshot(LIVE_PLACES, controller.signal)
      .then((next) => {
        writeCache(next);
        setCells(next);
        setUpdatedAt(new Date());
        setStatus('ready');
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Live hazard data unavailable';
        setStatus('error');
        setError(message);
      });

    return () => controller.abort();
  }, [active, reloadToken]);

  return {
    status: active ? status : 'idle',
    cells,
    spacing: 0.8,
    droughtComparable: true,
    updatedAt,
    error,
    reload,
  };
}
