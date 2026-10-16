import { useState, useEffect } from 'react';
import { Bell, Clock, Activity, Radio, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForecast } from '../hooks/useForecast';
import { getPredictionCopy } from '../i18n/predictionCopy';
import { PageTourButton } from '../components/GuidedTour';
import { playClick } from '../utils/soundFx';
import { haversineKm, mapSessionState, getStoredUserCoords } from './MapPage';

export default function NotificationPage() {
  const copy = getPredictionCopy();
  const [searchParams] = useSearchParams();
  const focusedAlertId = searchParams.get('alertId');
  const focusedAlertTitle = searchParams.get('title');
  const { forecast, status, stale, reload } = useForecast();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');

  // Synchronize user live GPS coordinates and active state combobox
  const [userLocation, setUserLocation] = useState<{ coords: [number, number]; hasReal: boolean }>(() => getStoredUserCoords());
  const [activeState, setActiveState] = useState<string>(() => {
    try {
      return sessionStorage.getItem('doab_selected_state') || mapSessionState.selectedState || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    const handleStateSync = (e: any) => {
      if (e.detail?.selectedState) {
        setActiveState(e.detail.selectedState);
      } else {
        try {
          setActiveState(sessionStorage.getItem('doab_selected_state') || mapSessionState.selectedState || 'all');
        } catch {}
      }
    };
    const handleCoordsSync = () => {
      setUserLocation(getStoredUserCoords());
    };
    window.addEventListener('doab:state-changed', handleStateSync);
    window.addEventListener('storage', handleCoordsSync);
    window.addEventListener('doab:user-coords-updated', handleCoordsSync);
    return () => {
      window.removeEventListener('doab:state-changed', handleStateSync);
      window.removeEventListener('storage', handleCoordsSync);
      window.removeEventListener('doab:user-coords-updated', handleCoordsSync);
    };
  }, []);

  // Dev/Admin simulated alerts from localStorage (Auto-purges events older than 1 Hour)
  const ONE_HOUR_MS = 60 * 60 * 1000;

  const loadFreshAdminAlerts = () => {
    try {
      const saved = localStorage.getItem('doab_admin_custom_alerts');
      if (!saved) return [];
      const now = Date.now();
      const parsed = JSON.parse(saved);
      const fresh = parsed.filter((a: any) => {
        const created = a.createdAt || (a.updatedTime ? Date.parse(a.updatedTime) : null);
        return created ? now - created < ONE_HOUR_MS : true;
      });
      if (fresh.length !== parsed.length) {
        localStorage.setItem('doab_admin_custom_alerts', JSON.stringify(fresh));
      }
      return fresh;
    } catch {
      return [];
    }
  };

  const [adminCustomAlerts, setAdminCustomAlerts] = useState<any[]>(loadFreshAdminAlerts);

  // Listen for admin custom alerts trigger and periodically prune stale alerts
  useEffect(() => {
    const handleUpdate = () => {
      setAdminCustomAlerts(loadFreshAdminAlerts());
    };
    window.addEventListener('doab:admin-alerts-updated', handleUpdate);
    const pruneTimer = setInterval(() => {
      setAdminCustomAlerts(loadFreshAdminAlerts());
    }, 60000); // Check for expired alerts every 60s

    return () => {
      window.removeEventListener('doab:admin-alerts-updated', handleUpdate);
      clearInterval(pruneTimer);
    };
  }, []);

  // Mark alerts as read when user visits Notification Page
  useEffect(() => {
    try {
      localStorage.setItem('doab_notifications_read', 'true');
      window.dispatchEvent(new CustomEvent('doab:alerts-read'));
    } catch (_) {}
  }, []);

  // Strict Real-Time Mode: Only active AI flood forecast cells and live admin dispatches are shown.
  const liveCells = (forecast?.cells ?? [])
    .filter((cell) => cell.probability != null && cell.probability >= 0.35)
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0))
    .slice(0, 16)
    .map((cell, idx) => {
      const distKm = userLocation.coords
        ? haversineKm(userLocation.coords[0], userLocation.coords[1], cell.lat, cell.lng)
        : undefined;
      return {
        id: `live-cell-${idx}`,
        lat: cell.lat,
        lng: cell.lng,
        title: `Grid Cell (${cell.lat.toFixed(2)}, ${cell.lng.toFixed(2)})`,
        ward: 'Ward Inundation Zone',
        severity: (cell.probability ?? 0) >= 0.7 ? ('Critical' as const) : (cell.probability ?? 0) >= 0.5 ? ('High' as const) : ('Medium' as const),
        waterDepthCm: Math.round((cell.probability ?? 0) * 60),
        rainfallMmH: 28,
        probability: cell.probability ?? 0.5,
        confidence: cell.confidence,
        updatedTime: 'Next 60 min forecast',
        distKm,
        isMockup: false,
      };
    });

  // Strict Real-Time: Only real-time ML cells and active admin dispatches
  const activeAlerts = [...adminCustomAlerts, ...liveCells];

  const filteredAlerts = activeAlerts.filter(
    (a) => filterSeverity === 'all' || a.severity === filterSeverity
  );

  // Auto-reset severity filter and scroll to focused alert when navigated from Recent Alerts
  useEffect(() => {
    if (!focusedAlertId && !focusedAlertTitle) return;
    setFilterSeverity('all');
    const timer = setTimeout(() => {
      const el = document.getElementById(`alert-card-${focusedAlertId}`) || document.querySelector('[data-focused-alert="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [focusedAlertId, focusedAlertTitle]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] custom-scrollbar flex flex-col items-center">
      {/* Page Header */}
      <div id="tour-alerts-header" className="mb-5 w-full max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-[var(--text-main)] dark:text-neutral-200" />
              All Alerts
            </h1>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]">
              {userLocation.hasReal ? 'Proximity Sorted' : activeState !== 'all' ? `Filter: ${activeState.toUpperCase()}` : 'National Stream'}
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1 leading-relaxed">
            Real-time hydrological risk stream and verified municipal waterlogging telemetry.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { playClick(); void reload(); }}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shadow-2xs"
            title="Refresh Alert Stream"
            aria-label="Refresh Alert Stream"
          >
            <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
          </button>
          <PageTourButton pageKey="notifications" label="Alerts Guide" />
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">

        {/* Severity Filter Segmented Sliding Pill Toolbar (Fixed 4-Column Grid — Zero Layout Shift & Zero Horizontal Overflow) */}
        <div
          role="tablist"
          aria-label="Filter alerts by severity"
          className="grid grid-cols-4 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xs relative w-full select-none"
        >
          {(['all', 'Critical', 'High', 'Medium'] as const).map((sev) => {
            const isSelected = filterSeverity === sev;
            const count = sev === 'all' ? activeAlerts.length : activeAlerts.filter(a => a.severity === sev).length;
            return (
              <button
                key={sev}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  if (filterSeverity !== sev) {
                    playClick();
                    setFilterSeverity(sev);
                  }
                }}
                className={`relative z-10 py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap min-w-0 ${
                  isSelected
                    ? 'text-[var(--bg-card)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="alertsSeveritySlidingPill"
                    className="absolute inset-0 bg-[var(--text-main)] rounded-xl -z-10 shadow-xs"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="truncate">
                  {sev === 'all' ? (
                    <>
                      <span className="sm:hidden">All</span>
                      <span className="hidden sm:inline">All Alerts</span>
                    </>
                  ) : (
                    sev
                  )}
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-[var(--bg-card)]/20 text-[var(--bg-card)]'
                    : 'bg-[var(--bg-main)] text-[var(--text-muted)]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Alerts Stream List */}
        {filteredAlerts.length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] flex flex-col items-center justify-center gap-2 shadow-2xs">
            <div className="w-10 h-10 rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-main)] mb-1">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="font-bold text-sm text-[var(--text-main)]">
              All Clear • No Active Hazard Alerts
            </div>
            <div className="text-xs font-mono text-[var(--text-muted)]">
              {filterSeverity !== 'all'
                ? `No active real-time events found matching ${filterSeverity} severity.`
                : 'No real-time inundation or waterlogging breaches detected.'}
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => {
            const isCritical = alert.severity === 'Critical';
            const isHigh = alert.severity === 'High';
            const isFocused = Boolean(
              (focusedAlertId && alert.id === focusedAlertId) ||
              (focusedAlertTitle && alert.title === focusedAlertTitle)
            );
            return (
              <div
                key={`${alert.id || alert.lat}-${alert.lng}-${index}`}
                id={index === 0 ? 'tour-alerts-critical' : index === 1 ? 'tour-alerts-tanker' : index === 2 ? 'tour-alerts-backcheck' : (alert.id ? `alert-card-${alert.id}` : undefined)}
                data-focused-alert={isFocused ? 'true' : undefined}
                className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-start border transition-all duration-300 ${
                  isFocused
                    ? 'bg-[var(--bg-main)] border-neutral-900 dark:border-white ring-2 ring-neutral-900/25 dark:ring-white/30 shadow-xl scale-[1.01]'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] shadow-2xs hover:border-[var(--text-main)]/35 hover:shadow-sm'
                }`}
              >
                {/* Severity Badge Icon */}
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  isCritical
                    ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                    : isHigh
                      ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                      : 'bg-teal-950/[0.06] dark:bg-teal-500/[0.12] text-teal-700 dark:text-teal-300 border-teal-600/25 dark:border-teal-400/25'
                }`}>
                  {isCritical ? <Radio className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                </div>

                <div className="flex-grow min-w-0 w-full">
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--text-main)] text-sm">
                          {alert.title}
                        </h3>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                            : isHigh
                              ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                              : 'bg-teal-950/[0.06] dark:bg-teal-500/[0.12] text-teal-700 dark:text-teal-300 border-teal-600/25 dark:border-teal-400/25'
                        }`}>
                          {alert.severity}
                        </span>
                        {typeof (alert as any).distKm === 'number' && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                            {(alert as any).distKm < 10 ? `${(alert as any).distKm.toFixed(1)} km away` : `${Math.round((alert as any).distKm)} km away`}
                          </span>
                        )}
                        {isFocused && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-2xs">
                            Selected Alert
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 block">
                        {alert.ward} • {typeof (alert as any).distKm === 'number' ? `${(alert as any).distKm < 10 ? (alert as any).distKm.toFixed(1) : Math.round((alert as any).distKm)} km away • ` : ''}{alert.updatedTime}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-[var(--text-main)]">
                        {Math.round((alert.probability ?? 0) * 100)}% Risk
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] inline-flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {copy.oneHour}
                      </span>
                    </div>
                  </div>

                  {/* Clean Telemetry Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3 p-2.5 rounded-xl bg-[var(--bg-main)]/70 border border-[var(--border-color)] text-[11px] font-mono">
                    <div className="p-1">
                      <span className="text-[10px] text-[var(--text-muted)] block">Est. Water Depth</span>
                      <span className="font-semibold text-[var(--text-main)] text-xs mt-0.5 block">{alert.waterDepthCm} cm</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[10px] text-[var(--text-muted)] block">Rainfall Intensity</span>
                      <span className="font-semibold text-[var(--text-main)] text-xs mt-0.5 block">{alert.rainfallMmH} mm/h</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-1">
                      <span className="text-[10px] text-[var(--text-muted)] block">GPS Coordinates</span>
                      <span className="font-semibold text-[var(--text-main)] text-xs mt-0.5 truncate block">
                        {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed truncate">
                      {stale ? copy.stale : 'Verified hydrological telemetry & SRTM elevation analysis.'}
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/routes/best?lat=${alert.lat}&lng=${alert.lng}`}
                        onClick={() => playClick()}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-2xs"
                      >
                        <span>Compute Bypass</span>
                      </Link>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playClick()}
                        className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
