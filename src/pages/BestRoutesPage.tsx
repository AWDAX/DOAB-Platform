import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Route as RouteIcon, ShieldCheck, ShieldAlert } from 'lucide-react';
import { fetchRoutes, type RouteOption, type RouteResponse } from '../lib/predictionApi';
import { getPredictionCopy } from '../i18n/predictionCopy';

const ORIGIN = { lat: 12.9716, lng: 77.5946 };

function formatKm(meters: number | null): string {
  if (meters == null) return '—';
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatMinutes(seconds: number | null): string {
  if (seconds == null) return '—';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function riskLabel(route: RouteOption, copy: ReturnType<typeof getPredictionCopy>): string {
  if (!route.scored || route.mean_risk == null) return copy.unscored;
  return `${Math.round(route.mean_risk * 1000) / 10}%`;
}

export default function BestRoutesPage() {
  const copy = getPredictionCopy();
  const [params] = useSearchParams();
  const destination = {
    lat: Number(params.get('lat')) || 12.9352,
    lng: Number(params.get('lng')) || 77.6245,
  };
  const [body, setBody] = useState<RouteResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetchRoutes(ORIGIN, destination, controller.signal)
      .then((next) => {
        setBody(next);
        setActive(0);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [destination.lat, destination.lng]);

  const routes = body?.routes ?? [];
  const current = routes[active];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div id="tour-best-header">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <RouteIcon className="h-6 w-6 text-[var(--color-brand-accent)]" />
            Safe Computed Paths
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">{copy.notASensor}</p>
        </div>
        <div id="tour-best-switcher" className="flex items-center gap-2 self-start sm:self-auto bg-[var(--bg-main)] p-1.5 rounded-2xl border border-[var(--border-color)]">
          <button type="button" className="p-2 rounded-xl text-[var(--text-main)]" onClick={() => setActive((value) => Math.max(0, value - 1))} aria-label="Previous route">←</button>
          <span className="text-xs font-mono font-semibold px-2.5 text-[var(--text-main)] tabular-nums">
            {routes.length ? `${active + 1} / ${routes.length}` : '0 / 0'}
          </span>
          <button type="button" className="p-2 rounded-xl text-[var(--text-main)]" onClick={() => setActive((value) => Math.min(routes.length - 1, value + 1))} aria-label="Next route">→</button>
        </div>
      </div>

      {status === 'loading' && <p className="text-sm text-[var(--text-muted)]">{copy.loading}</p>}
      {status === 'error' && <p className="text-sm text-[var(--text-muted)]">{copy.error}</p>}
      {status === 'ready' && body && !body.scored && (
        <p className="text-sm text-[var(--text-muted)] mb-4">{body.reason || copy.noRoute}</p>
      )}

      {current && (
        <>
          <div id="tour-best-table" className="hidden md:block neo-glass-card rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-main)]/70 border-b border-[var(--border-color)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
                  <th className="py-4 px-6">Route</th>
                  <th className="py-4 px-6 text-center">Distance</th>
                  <th className="py-4 px-6 text-center">Time</th>
                  <th className="py-4 px-6 text-center">{copy.risk}</th>
                  <th className="py-4 px-6 text-right w-36">Link</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[var(--border-color)]">
                {routes.map((route, index) => (
                  <tr key={`${route.summary}-${index}`} className="bg-[var(--bg-card)]">
                    <td className="py-4 px-6 font-semibold text-[var(--text-main)]">
                      <span className="inline-flex items-center gap-2">
                        {route.rank === 'safest' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                        {route.summary}
                        <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                          {route.rank === 'safest' ? copy.safest : route.rank}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono tabular-nums">{formatKm(route.distance_meters)}</td>
                    <td className="py-4 px-6 text-center font-mono tabular-nums">{formatMinutes(route.duration_seconds)}</td>
                    <td className="py-4 px-6 text-center font-mono tabular-nums">{riskLabel(route, copy)}</td>
                    <td id={index === 0 ? 'tour-best-engage' : undefined} className="py-4 px-6 text-right">
                      <a href={route.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex w-32 min-w-[8rem] justify-center px-3 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-semibold">
                        {copy.openMaps}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3.5">
            {routes.map((route, index) => (
              <div key={`${route.summary}-m-${index}`} className="p-4 rounded-2xl neo-glass-card border border-[var(--border-color)] space-y-3">
                <h2 className="font-semibold text-sm text-[var(--text-main)]">{route.summary}</h2>
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[var(--bg-main)]/70 border border-[var(--border-color)] text-center font-mono">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Distance</span>
                    <span className="text-xs font-bold">{formatKm(route.distance_meters)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Time</span>
                    <span className="text-xs font-bold">{formatMinutes(route.duration_seconds)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">{copy.risk}</span>
                    <span className="text-xs font-bold">{riskLabel(route, copy)}</span>
                  </div>
                </div>
                <a href={route.maps_url} target="_blank" rel="noopener noreferrer" className="block text-center w-full py-2.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-xs">
                  {copy.openMaps}
                </a>
              </div>
            ))}
          </div>
          {body?.disclaimer && <p className="mt-4 text-[11px] text-[var(--text-muted)]">{body.disclaimer}</p>}
        </>
      )}
    </div>
  );
}
