import { useState, useEffect } from 'react';
import { MapPin, X, Check, ThumbsUp, Star, ThumbsDown, Bookmark } from 'lucide-react';
import { playClick, playArrivalSuccessChime } from '../utils/soundFx';

export interface RouteOptionLike {
  summary: string;
  distance_meters: number;
  duration_seconds: number;
  mean_risk: number;
  maps_url: string;
  rank?: string;
  scored?: boolean;
}

export interface DestinationArrivalModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: RouteOptionLike | null;
  riskDisplay?: string;
}

const OFFLINE_ROUTES_KEY = 'doab_offline_routes_v1';

export default function DestinationArrivalModal({
  isOpen,
  onClose,
  route,
  riskDisplay = 'Low Inundation Risk'
}: DestinationArrivalModalProps) {
  useEffect(() => {
    if (isOpen) {
      playArrivalSuccessChime();
    }
  }, [isOpen]);
  const [feedbackRating, setFeedbackRating] = useState<'accurate' | 'moderate' | 'inaccurate' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [savedAsFavorite, setSavedAsFavorite] = useState(() => {
    if (!route) return false;
    try {
      const existing = JSON.parse(localStorage.getItem(OFFLINE_ROUTES_KEY) || '[]');
      return existing.some((r: any) => r.summary === route.summary);
    } catch {
      return false;
    }
  });

  if (!isOpen || !route) return null;

  const formatKm = (m: number) => `${(m / 1000).toFixed(1)} km`;

  const handleSubmitArrivalFeedback = (shouldSave: boolean) => {
    playClick();

    // 1. Save telemetry feedback rating
    try {
      const feedbackRecord = {
        routeSummary: route.summary,
        predictedRisk: riskDisplay,
        userRating: feedbackRating || 'accurate',
        notes: feedbackNotes.trim(),
        timestamp: new Date().toISOString(),
      };
      const existingFeedback = JSON.parse(localStorage.getItem('doab_route_accuracy_feedback') || '[]');
      localStorage.setItem('doab_route_accuracy_feedback', JSON.stringify([feedbackRecord, ...existingFeedback].slice(0, 50)));
    } catch (e) {
      console.warn('Could not save route feedback', e);
    }

    // 2. Bookmark path to both Offline Routes and Safe Routes page
    if (shouldSave) {
      try {
        const existing = JSON.parse(localStorage.getItem(OFFLINE_ROUTES_KEY) || '[]');
        const routeId = `route-${Date.now()}`;
        const newEntry = {
          id: routeId,
          savedAt: new Date().toISOString(),
          summary: route.summary,
          distanceKm: formatKm(route.distance_meters),
          riskPct: riskDisplay,
          mapsUrl: route.maps_url,
        };
        const filtered = existing.filter((r: any) => r.summary !== route.summary);
        localStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify([newEntry, ...filtered].slice(0, 20)));

        const existingCustom = JSON.parse(localStorage.getItem('doab_custom_created_routes') || '[]');
        if (!existingCustom.some((r: any) => r.summary === route.summary)) {
          const customRouteObj = {
            summary: route.summary,
            distance_meters: route.distance_meters || 7500,
            duration_seconds: Math.round(((route.distance_meters || 7500) / 1000) * 160),
            mean_risk: route.mean_risk ?? 0.08,
            data_quality: 'ok',
            scored: true,
            maps_url: route.maps_url || 'https://www.google.com/maps',
            rank: (route.mean_risk ?? 0.08) <= 0.12 ? 'safest' : 'alternative',
          };
          localStorage.setItem('doab_custom_created_routes', JSON.stringify([customRouteObj, ...existingCustom]));
        }
        setSavedAsFavorite(true);
      } catch (e) {
        console.warn('Could not bookmark route', e);
      }
    }

    setFeedbackSubmitted(true);
    setTimeout(() => {
      onClose();
      setFeedbackSubmitted(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-500/10 border border-[var(--border-color)] dark:border-white/15 text-[var(--text-main)] dark:text-neutral-200 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-main)] flex items-center gap-2">
                <span>Destination Reached</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-500/10 text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] dark:border-white/15">
                  Safe Arrival
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-xs sm:max-w-sm mt-0.5">
                {route.summary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {feedbackSubmitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-neutral-500/15 text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] mx-auto flex items-center justify-center animate-bounce">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-main)]">Thank You for Your Feedback!</h4>
            <p className="text-xs text-[var(--text-muted)]">
              Your ground truth telemetry helps our flood elevation model improve route safety for everyone.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Predicted Probability Badge */}
            <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">Model Predicted Risk</span>
                <span className="font-bold text-sm text-[var(--text-main)]">{riskDisplay}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">Distance Covered</span>
                <span className="font-bold text-sm font-mono text-[var(--text-main)]">{formatKm(route.distance_meters)}</span>
              </div>
            </div>

            {/* Ground Truth Accuracy Question */}
            <div className="space-y-2">
              <label className="font-semibold text-[var(--text-main)] block">
                How accurate was the predicted safety level during your trip?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { playClick(); setFeedbackRating('accurate'); }}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    feedbackRating === 'accurate'
                      ? 'border-teal-600/40 dark:border-teal-400/40 bg-teal-950/[0.06] dark:bg-teal-500/[0.12] text-teal-700 dark:text-teal-300 font-bold shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:border-teal-600/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                  <span className="text-[11px] leading-tight">Accurate & Clear</span>
                  <span className="text-[9px] opacity-75">No waterlogging</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setFeedbackRating('moderate'); }}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    feedbackRating === 'moderate'
                      ? 'border-amber-600/40 dark:border-amber-400/40 bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:border-amber-600/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  <Star className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <span className="text-[11px] leading-tight">Slight Water</span>
                  <span className="text-[9px] opacity-75">Passable ponding</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setFeedbackRating('inaccurate'); }}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    feedbackRating === 'inaccurate'
                      ? 'border-rose-600/40 dark:border-rose-400/40 bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 font-bold shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:border-rose-600/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4 text-rose-700 dark:text-rose-300" />
                  <span className="text-[11px] leading-tight">Flooded / Blocked</span>
                  <span className="text-[9px] opacity-75">Risk was higher</span>
                </button>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                Optional Ground Observation (Water depth, bottlenecks, etc.)
              </label>
              <input
                type="text"
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="e.g. Underpass had 2 inches of water but service road was clear"
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Save as Safe Path Bookmark Option */}
            <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Bookmark className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
                <div>
                  <span className="font-semibold text-[var(--text-main)] block text-xs">Save as Safe Path for Future Trips</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Bookmark this tested elevation corridor for offline quick access</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { playClick(); setSavedAsFavorite(!savedAsFavorite); }}
                className={`px-3 py-1.5 rounded-xl border font-bold text-[10px] shrink-0 cursor-pointer transition-all ${
                  savedAsFavorite
                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-2xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--text-main)]'
                }`}
              >
                {savedAsFavorite ? 'Bookmarked ✓' : 'Save Path'}
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => handleSubmitArrivalFeedback(savedAsFavorite)}
                className="px-4 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs active:scale-95"
              >
                Submit & Save Path
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
