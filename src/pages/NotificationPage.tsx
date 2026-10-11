import { Bell, Clock, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForecast } from '../hooks/useForecast';
import { getPredictionCopy } from '../i18n/predictionCopy';
import { PageTourButton } from '../components/GuidedTour';

export default function NotificationPage() {
  const copy = getPredictionCopy();
  const { forecast, status, stale } = useForecast();
  const alerts = (forecast?.cells ?? [])
    .filter((cell) => cell.probability != null && cell.probability >= 0.35)
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0))
    .slice(0, 8);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar flex flex-col items-center">
      <div id="tour-alerts-header" className="mb-6 w-full max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-[var(--color-brand-accent)]" />
            All Civic Alerts
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">{copy.notASensor}</p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <PageTourButton pageKey="notifications" label="Alerts Guide" />
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
        {status === 'loading' && <p className="text-sm text-[var(--text-muted)]">{copy.loading}</p>}
        {status === 'error' && <p id="tour-alerts-critical" className="text-sm text-[var(--text-muted)]">{copy.error}</p>}
        {(status === 'insufficient' || (status === 'ready' && alerts.length === 0)) && (
          <p id="tour-alerts-critical" className="text-sm text-[var(--text-muted)]">{copy.insufficient}</p>
        )}
        {alerts.map((cell, index) => (
          <div
            key={`${cell.lat}-${cell.lng}`}
            id={index === 0 ? 'tour-alerts-critical' : index === 1 ? 'tour-alerts-tanker' : index === 2 ? 'tour-alerts-backcheck' : undefined}
            className="neo-glass-card p-5 sm:p-6 rounded-2xl flex gap-4 items-start border border-[var(--border-color)] shadow-sm"
          >
            <div className="h-10 w-10 bg-[var(--bg-main)] text-[var(--text-main)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-color)]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-bold text-[var(--text-main)] text-sm">
                  {copy.estimate}: {Math.round((cell.probability ?? 0) * 1000) / 10}%
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-muted)] inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {copy.oneHour}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {cell.lat.toFixed(2)}, {cell.lng.toFixed(2)}. {cell.confidence}. {stale ? copy.stale : copy.notASensor}
              </p>
              <Link to={`/routes/best?lat=${cell.lat}&lng=${cell.lng}`} className="mt-3 inline-block text-xs font-bold text-[var(--text-main)]">
                {copy.openMaps}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
