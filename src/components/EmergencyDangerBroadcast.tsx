import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Route as RouteIcon, X, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { playClick, playAlertAlarm } from '../utils/soundFx';

interface EmergencyDangerBroadcastProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  ward?: string;
  distanceAhead?: string;
  waterDepthCm?: number;
  description?: string;
}

export default function EmergencyDangerBroadcast({
  isOpen,
  onClose,
  title = "Severe Waterlogging Ahead",
  ward = "Ward 14 (MG Road Corridor)",
  distanceAhead = "380 meters",
  waterDepthCm = 72,
  description = "Ultrasonic sensor cluster reports standing water exceeding 70cm depth. Low clearance 2-wheelers stalled. Immediate bypass engaged."
}: EmergencyDangerBroadcastProps) {

  useEffect(() => {
    if (isOpen) {
      playAlertAlarm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg neo-glass-card rounded-3xl border-2 border-red-500/60 bg-[var(--bg-card)] shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden p-6 sm:p-7 flex flex-col"
        >
          {/* Top Danger Bar */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 animate-pulse">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-600 dark:text-red-400 font-bold block">
                  Critical Danger Broadcast
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  Live Ground Elevation Telemetry
                </span>
              </div>
            </div>

            <button
              onClick={() => { playClick(); onClose(); }}
              className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
              aria-label="Dismiss Alert"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Alert Main Details */}
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[var(--text-muted)]">
              <span className="font-mono font-semibold text-[var(--text-main)]">{ward}</span>
              <span>•</span>
              <span className="font-mono text-red-600 dark:text-red-400 font-bold">{distanceAhead} ahead</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Telemetry Sensor Matrix */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] text-center text-xs mb-6">
            <div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] block">Standing Depth</span>
              <span className="font-mono font-extrabold text-red-600 dark:text-red-400 text-sm sm:text-base">
                {waterDepthCm} cm
              </span>
            </div>
            <div className="border-x border-[var(--border-color)]">
              <span className="text-[9px] font-mono text-[var(--text-muted)] block">Passability</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                Unsafe
              </span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] block">Safe Bypass</span>
              <span className="font-mono font-bold text-[var(--text-main)] text-xs sm:text-sm">
                +4 mins
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/routes/best"
              onClick={() => { playClick(); onClose(); }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <RouteIcon className="h-4 w-4" />
              <span>Engage Safe Path</span>
            </Link>

            <button
              type="button"
              onClick={() => { playClick(); onClose(); }}
              className="w-full sm:w-auto py-3 px-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-main)] font-semibold text-xs transition-colors cursor-pointer"
            >
              I'm Safe / Dismiss
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Volume2 className="h-3 w-3 text-red-500" />
              Life-safety DND bypass active
            </span>
            <span>DOAB Risk Perimeter</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
