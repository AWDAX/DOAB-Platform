import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { playClick } from '../utils/soundFx';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-2xl p-5 border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDanger
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                {isDanger ? <Trash2 className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
              </div>
              <h3 className="font-bold text-sm text-[var(--text-main)] leading-tight">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                playClick();
                onCancel();
              }}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                playClick();
                onCancel();
              }}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                onConfirm();
              }}
              className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isDanger
                  ? 'bg-[image:var(--danger-btn-gradient,linear-gradient(180deg,#4C0519_0%,#881337_50%,#BE123C_100%))] hover:bg-[image:var(--danger-btn-hover-gradient,linear-gradient(180deg,#881337_0%,#BE123C_50%,#E11D48_100%))] hover:shadow-[0_4px_14px_rgba(190,18,60,0.45)] active:scale-95'
                  : 'bg-[var(--color-brand-accent)] hover:opacity-90 active:scale-95'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
