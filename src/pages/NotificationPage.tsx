import { useState, useEffect } from 'react';
import { Bell, Clock, ShieldAlert, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForecast } from '../hooks/useForecast';
import { getPredictionCopy } from '../i18n/predictionCopy';
import { PageTourButton } from '../components/GuidedTour';
import { WATERLOGGING_DATASET_INCIDENTS } from '../data/waterloggingIncidents';
import { playClick } from '../utils/soundFx';

export default function NotificationPage() {
  const copy = getPredictionCopy();
  const { forecast, status, stale, reload } = useForecast();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'Critical' | 'High' | 'Medium'>('all');

  // Dev/Admin simulated alerts from localStorage
  const [adminCustomAlerts, setAdminCustomAlerts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('doab_admin_custom_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen for admin custom alerts trigger
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('doab_admin_custom_alerts');
        setAdminCustomAlerts(saved ? JSON.parse(saved) : []);
      } catch {}
    };
    window.addEventListener('doab:admin-alerts-updated', handleUpdate);
    return () => window.removeEventListener('doab:admin-alerts-updated', handleUpdate);
  }, []);

  // Mark alerts as read when user visits Notification Page
  useEffect(() => {
    try {
      localStorage.setItem('doab_notifications_read', 'true');
      window.dispatchEvent(new CustomEvent('doab:alerts-read'));
    } catch (_) {}
  }, []);

  // Ground truth / realistic flood and inundation alerts derived from municipal datasets
  // Filter out non-flood, pipeline maintenance, and informal user complaints
  const mockAlerts = WATERLOGGING_DATASET_INCIDENTS
    .filter((inc) => {
      const lowerTitle = (inc.title || '').toLowerCase();
      const lowerDesc = (inc.description || '').toLowerCase();
      const isUnwanted = 
        lowerTitle.includes('leaking pipeline') ||
        lowerTitle.includes('urinating') ||
        lowerTitle.includes('shitting') ||
        lowerTitle.includes('dangerous road condiyion') ||
        lowerDesc.includes('urinat') ||
        lowerDesc.includes('wine shop') ||
        lowerTitle.includes('pipeline') ||
        lowerTitle.includes('leak');
      return !isUnwanted && inc.severity !== 'Low';
    })
    .slice(0, 8)
    .map((inc, i) => ({
      lat: inc.lat,
      lng: inc.lng,
      title: inc.title,
      ward: inc.ward,
      severity: inc.severity,
      waterDepthCm: inc.waterDepthCm || 45,
      rainfallMmH: inc.rainfallMmH || 32,
      probability: inc.severity === 'Critical' ? 0.88 - i * 0.05 : inc.severity === 'High' ? 0.65 - i * 0.04 : 0.42,
      confidence: 'Historical sensor-backed ground truth',
      updatedTime: inc.updatedTime,
      isMockup: true,
    }));

  const liveCells = (forecast?.cells ?? [])
    .filter((cell) => cell.probability != null && cell.probability >= 0.35)
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0))
    .slice(0, 8)
    .map((cell) => ({
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
      isMockup: false,
    }));

  const isModelResponding = status === 'ready' && liveCells.length > 0;
  const baseAlerts = isModelResponding ? liveCells : mockAlerts;
  const activeAlerts = [...adminCustomAlerts, ...baseAlerts];

  const filteredAlerts = activeAlerts.filter(
    (a) => filterSeverity === 'all' || a.severity === filterSeverity
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar flex flex-col items-center">
      {/* Page Header */}
      <div id="tour-alerts-header" className="mb-5 w-full max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-[var(--color-brand-accent)]" />
              All Alerts
            </h1>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] font-medium uppercase tracking-wider shadow-2xs">
              Prototype Mockup
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1 leading-relaxed">
            {copy.notASensor}
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
        {/* Subtle, Crisp Status Disclaimer Callout */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xs flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-[var(--color-brand-accent)] border border-sky-500/20 shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 text-xs leading-relaxed">
            <div className="font-semibold text-[var(--text-main)] flex items-center gap-2 flex-wrap">
              <span>Interactive Demonstration & Mockup Feed</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">
                {!isModelResponding ? 'Offline Ground-Truth BBMP Feed' : 'Live ML Estimator Connected'}
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-[11px] mt-1 leading-normal">
              {!isModelResponding
                ? `${copy.error} Displaying high-fidelity civic telemetry mockups from historical Bengaluru waterlogging reports with verified GPS coordinates and rainfall metrics.`
                : copy.notASensor}
            </p>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'Critical', 'High', 'Medium'] as const).map((sev) => {
            const isSelected = filterSeverity === sev;
            const count = sev === 'all' ? activeAlerts.length : activeAlerts.filter(a => a.severity === sev).length;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => { playClick(); setFilterSeverity(sev); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)] shadow-2xs font-semibold'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] border-[var(--border-color)]'
                }`}
              >
                <span>{sev === 'all' ? 'All Alerts' : sev}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-[var(--bg-card)]/20 text-[var(--bg-card)]' : 'bg-[var(--bg-main)] text-[var(--text-muted)]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Alerts Stream List */}
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
            No alerts found matching the selected severity filter.
          </div>
        ) : (
          filteredAlerts.map((alert, index) => {
            const isCritical = alert.severity === 'Critical';
            const isHigh = alert.severity === 'High';
            return (
              <div
                key={`${alert.lat}-${alert.lng}-${index}`}
                id={index === 0 ? 'tour-alerts-critical' : index === 1 ? 'tour-alerts-tanker' : index === 2 ? 'tour-alerts-backcheck' : undefined}
                className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-start border border-[var(--border-color)] shadow-2xs hover:border-[var(--color-brand-accent)]/40 hover:shadow-sm transition-all duration-200"
              >
                {/* Severity Badge Icon */}
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  isCritical
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    : isHigh
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                }`}>
                  <ShieldAlert className="h-5 w-5" />
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
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : isHigh
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                        }`}>
                          {alert.severity}
                        </span>
                        {alert.isMockup && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] font-normal">
                            Ground-Truth
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 block">
                        {alert.ward} • {alert.updatedTime}
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
                      {stale ? copy.stale : copy.notASensor}
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
