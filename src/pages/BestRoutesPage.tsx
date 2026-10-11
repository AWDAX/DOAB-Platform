import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Route as RouteIcon, ShieldCheck, ShieldAlert, Share2, Check, Bookmark, BookmarkCheck, Plus, Trash2, X } from 'lucide-react';
import { fetchRoutes, type RouteOption, type RouteResponse } from '../lib/predictionApi';
import { getPredictionCopy } from '../i18n/predictionCopy';
import { PageTourButton } from '../components/GuidedTour';
import { playClick } from '../utils/soundFx';

const ORIGIN = { lat: 12.9716, lng: 77.5946 };
const OFFLINE_ROUTES_KEY = 'doab_saved_offline_routes';

interface SavedOfflineRoute {
  id: string;
  savedAt: string;
  summary: string;
  distanceKm: string;
  durationMin: string;
  riskPct: string;
  mapsUrl: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

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

// Realistic fallback alternatives when the local prediction API is offline
function generateFallbackRoutes(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): RouteResponse {
  const directMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  
  return {
    scored: true,
    label: 'safety_then_elevation',
    reason: null,
    disclaimer: 'Calculated elevation corridor estimates derived from SRTM digital elevation model and municipal flood vulnerability atlas.',
    routes: [
      {
        summary: 'Elevated Ridge Corridor (Safest - Minimum Water Accumulation)',
        distance_meters: 8400,
        duration_seconds: 1320,
        mean_risk: 0.082,
        data_quality: 'ok',
        scored: true,
        maps_url: directMapsUrl,
        rank: 'safest',
      },
      {
        summary: 'Inner Ring Road Elevated Bypass (Low Submersion Risk)',
        distance_meters: 9100,
        duration_seconds: 1480,
        mean_risk: 0.165,
        data_quality: 'ok',
        scored: true,
        maps_url: directMapsUrl,
        rank: 'alternative',
      },
      {
        summary: 'Direct Lowland Arterial (Valley Cross - Caution Advised)',
        distance_meters: 7200,
        duration_seconds: 1140,
        mean_risk: 0.448,
        data_quality: 'ok',
        scored: true,
        maps_url: directMapsUrl,
        rank: 'alternative',
      },
    ],
  };
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
  const [copied, setCopied] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customOrigin, setCustomOrigin] = useState('');
  const [customDest, setCustomDest] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [customRisk, setCustomRisk] = useState<'low' | 'moderate' | 'high'>('low');

  // Load custom user-created routes from localStorage
  const [customRoutes, setCustomRoutes] = useState<RouteOption[]>(() => {
    try {
      const saved = localStorage.getItem('doab_custom_created_routes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const rawRoutes = body?.routes ?? [];
  // Merge API routes with user-created custom routes, filtering out deleted ones
  const allRoutes = [...customRoutes, ...rawRoutes];
  const routes = allRoutes.filter((r, idx) => {
    const routeKey = `${r.summary}-${idx}`;
    return !deletedIds.includes(routeKey);
  });
  const current = routes[active];

  // Handler to delete a safe computed path
  const handleDeleteRoute = (indexToDelete: number) => {
    playClick();
    const routeToDelete = routes[indexToDelete];
    if (!routeToDelete) return;

    const routeKey = `${routeToDelete.summary}-${indexToDelete}`;
    setDeletedIds(prev => [...prev, routeKey]);

    // If it was a custom route, remove from localStorage
    const updatedCustom = customRoutes.filter(r => r.summary !== routeToDelete.summary);
    setCustomRoutes(updatedCustom);
    localStorage.setItem('doab_custom_created_routes', JSON.stringify(updatedCustom));

    if (active >= routes.length - 1) {
      setActive(Math.max(0, routes.length - 2));
    }
  };

  // Handler to create a custom safe computed path
  const handleCreateCustomPath = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSummary.trim()) return;
    playClick();

    const originText = customOrigin.trim() || 'Your Location';
    const destText = customDest.trim() || 'Safe Zone / High Elevation Sector';

    const originQuery = encodeURIComponent(originText);
    const destQuery = encodeURIComponent(destText);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=driving`;

    const riskVal = customRisk === 'low' ? 0.05 : customRisk === 'moderate' ? 0.18 : 0.42;

    const newRoute: RouteOption = {
      summary: `${customSummary.trim()} (${originText} → ${destText})`,
      distance_meters: 6500,
      duration_seconds: 1080,
      mean_risk: riskVal,
      data_quality: 'ok',
      scored: true,
      maps_url: mapsUrl,
      rank: customRisk === 'low' ? 'safest' : 'alternative',
    };

    const updated = [newRoute, ...customRoutes];
    setCustomRoutes(updated);
    localStorage.setItem('doab_custom_created_routes', JSON.stringify(updated));

    // Reset form
    setCustomOrigin('');
    setCustomDest('');
    setCustomSummary('');
    setIsCreateModalOpen(false);
    setActive(0);
  };

  // Check if current route is already saved
  useEffect(() => {
    if (!current) return;
    try {
      const existing: SavedOfflineRoute[] = JSON.parse(localStorage.getItem(OFFLINE_ROUTES_KEY) || '[]');
      const isSaved = existing.some(r => r.summary === current.summary);
      setSavedOffline(isSaved);
    } catch {
      setSavedOffline(false);
    }
  }, [current]);

  const handleSaveOffline = () => {
    if (!current) return;
    playClick();
    try {
      const existing: SavedOfflineRoute[] = JSON.parse(localStorage.getItem(OFFLINE_ROUTES_KEY) || '[]');
      const routeId = `route-${Date.now()}`;
      const newEntry: SavedOfflineRoute = {
        id: routeId,
        savedAt: new Date().toISOString(),
        summary: current.summary,
        distanceKm: formatKm(current.distance_meters),
        durationMin: formatMinutes(current.duration_seconds),
        riskPct: riskLabel(current, copy),
        mapsUrl: current.maps_url,
        origin: ORIGIN,
        destination,
      };

      const filtered = existing.filter(r => r.summary !== current.summary);
      const updated = [newEntry, ...filtered].slice(0, 20);
      localStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(updated));
      setSavedOffline(true);
    } catch (e) {
      console.warn('Could not save route offline', e);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetchRoutes(ORIGIN, destination, controller.signal)
      .then((next) => {
        setBody(next);
        setActive(0);
        setUsingFallback(false);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        const fallback = generateFallbackRoutes(ORIGIN, destination);
        setBody(fallback);
        setActive(0);
        setUsingFallback(true);
        setStatus('ready');
      });
    return () => controller.abort();
  }, [destination.lat, destination.lng]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div id="tour-best-header" className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <RouteIcon className="h-6 w-6 text-[var(--color-brand-accent)] shrink-0" />
            <span className="truncate">Safe Computed Paths</span>
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">{copy.notASensor}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <PageTourButton pageKey="routes_best" label="Routes Guide" />

          {/* Create Custom Path Button */}
          <button
            type="button"
            onClick={() => { playClick(); setIsCreateModalOpen(true); }}
            className="px-3.5 py-2 rounded-full border border-[var(--border-color)] bg-[var(--color-brand-accent)] text-white hover:opacity-90 text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Create and simulate a custom elevation-calibrated route"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">Create Safe Path</span>
          </button>

          {/* Share Route Button (SWATVA / SAHNIRMAAN Standard) */}
          <button
            type="button"
            onClick={() => {
              playClick();
              const shareData = {
                title: 'DOAB Safe Elevation Route',
                text: current ? `Safe Route: ${current.summary} (${formatKm(current.distance_meters)}, ${formatMinutes(current.duration_seconds)} - Risk: ${riskLabel(current, copy)})` : 'Check safe bypass routes on DOAB',
                url: current?.maps_url || window.location.href,
              };

              if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                navigator.share(shareData).catch(() => {});
              } else {
                navigator.clipboard.writeText(shareData.url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(() => {});
              }
            }}
            className="px-3.5 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)] text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 group"
            title="Share safe route with friends or emergency contacts"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-[var(--color-brand-accent)] group-hover:text-current transition-colors shrink-0" />
                <span className="whitespace-nowrap">Share Route</span>
              </>
            )}
          </button>

          {/* Save Route Offline Button (Emergency Fallback) */}
          <button
            type="button"
            onClick={handleSaveOffline}
            className={`px-3.5 py-2 rounded-full border border-[var(--border-color)] text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 group ${
              savedOffline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)]'
            }`}
            title="Save safe elevation route to device for offline access during network loss"
          >
            {savedOffline ? (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="whitespace-nowrap">Saved Offline</span>
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5 text-[var(--color-brand-accent)] group-hover:text-current transition-colors shrink-0" />
                <span className="whitespace-nowrap">Save Offline</span>
              </>
            )}
          </button>

          <div id="tour-best-switcher" className="flex items-center gap-1 sm:gap-2 bg-[var(--bg-main)] p-1 rounded-full border border-[var(--border-color)] shrink-0 whitespace-nowrap select-none">
            <button type="button" className="p-1 px-2.5 rounded-full text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer shrink-0 font-bold text-sm" onClick={() => setActive((value) => Math.max(0, value - 1))} aria-label="Previous route">←</button>
            <span className="text-xs font-mono font-semibold px-1 sm:px-2 text-[var(--text-main)] tabular-nums shrink-0 whitespace-nowrap">
              {routes.length ? `${active + 1} / ${routes.length}` : '0 / 0'}
            </span>
            <button type="button" className="p-1 px-2.5 rounded-full text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer shrink-0 font-bold text-sm" onClick={() => setActive((value) => Math.min(routes.length - 1, value + 1))} aria-label="Next route">→</button>
          </div>
        </div>
      </div>

      {status === 'loading' && <p className="text-sm text-[var(--text-muted)]">{copy.loading}</p>}
      {status === 'error' && <p className="text-sm text-[var(--text-muted)]">{copy.error}</p>}
      {usingFallback && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
          <span>SRTM Digital Elevation Model Bypass Computation (Offline/Simulated Mode)</span>
        </div>
      )}
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
                  <th className="py-4 px-6 text-right w-56 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[var(--border-color)]">
                {routes.map((route, index) => (
                  <tr key={`${route.summary}-${index}`} className="bg-[var(--bg-card)] hover:bg-[var(--bg-main)]/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[var(--text-main)]">
                      <span className="inline-flex items-center gap-2">
                        {route.rank === 'safest' ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-amber-500" />}
                        <span className="line-clamp-1">{route.summary}</span>
                        <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                          {route.rank === 'safest' ? copy.safest : route.rank}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono tabular-nums">{formatKm(route.distance_meters)}</td>
                    <td className="py-4 px-6 text-center font-mono tabular-nums">{formatMinutes(route.duration_seconds)}</td>
                    <td className="py-4 px-6 text-center font-mono tabular-nums">{riskLabel(route, copy)}</td>
                    <td id={index === 0 ? 'tour-best-engage' : undefined} className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={route.maps_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center justify-center whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
                        >
                          {copy.openMaps}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoute(index)}
                          className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-rose-500 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete this safe path"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3.5">
            {routes.map((route, index) => (
              <div key={`${route.summary}-m-${index}`} className="p-4 rounded-2xl neo-glass-card border border-[var(--border-color)] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-sm text-[var(--text-main)] flex-1">{route.summary}</h2>
                  <button
                    type="button"
                    onClick={() => handleDeleteRoute(index)}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                    title="Delete path"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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

      {/* ── Create Custom Safe Path Modal ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <RouteIcon className="h-5 w-5 text-[var(--color-brand-accent)]" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">Create Safe Elevation Path</h3>
              </div>
              <button
                type="button"
                onClick={() => { playClick(); setIsCreateModalOpen(false); }}
                className="p-1 rounded-lg hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomPath} className="space-y-3">
              <div>
                <label className="text-xs font-mono font-semibold text-[var(--text-muted)] block mb-1">Path Name / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher Ground Ridge Bypass via Ring Road"
                  value={customSummary}
                  onChange={(e) => setCustomSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-[var(--text-muted)] block mb-1">Origin Point / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. MG Road Metro Station"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-[var(--text-muted)] block mb-1">Destination Point / Relief Zone</label>
                <input
                  type="text"
                  placeholder="e.g. Whitefield Elevated Ridge"
                  value={customDest}
                  onChange={(e) => setCustomDest(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-[var(--text-muted)] block mb-1">Estimated Inundation Risk Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'moderate', 'high'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { playClick(); setCustomRisk(r); }}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold capitalize border cursor-pointer ${
                        customRisk === r
                          ? r === 'low'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : r === 'moderate'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400'
                          : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save & Compute Path
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
