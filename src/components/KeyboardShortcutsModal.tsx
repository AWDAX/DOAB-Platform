import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick } from '../utils/soundFx';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation Hubs',
    items: [
      { keys: ['1'], description: 'Jump to Live Map' },
      { keys: ['2'], description: 'Jump to Safe Routes' },
      { keys: ['3'], description: 'Jump to Route History' },
      { keys: ['4'], description: 'Jump to All Alerts' },
      { keys: ['5'], description: 'Jump to Entity Profile' },
    ]
  },
  {
    title: 'Operational Controls',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Focus Destination Search' },
      { keys: ['Ctrl', 'J'], description: 'Toggle DOAB Assistant Window' },
      { keys: ['Shift', 'E'], description: 'Toggle Mode (Flood / Drought)' },
      { keys: ['Shift', 'T'], description: 'Toggle Theme (Light / Dark)' },
      { keys: ['Shift', 'G'], description: 'Start Guided Product Tour' },
      { keys: ['Esc'], description: 'Close Modals / Minimize Assistant' },
      { keys: ['?'], description: 'Show Keyboard Shortcuts' },
    ]
  }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={() => { playClick(); onClose(); }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg neo-glass-card rounded-3xl border border-[var(--border-color)] shadow-2xl p-6 z-10 overflow-hidden bg-[var(--bg-card)] text-[var(--text-main)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <Keyboard className="h-5 w-5 text-[var(--color-brand-accent)]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Keyboard Accessibility & Hotkeys</h2>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">Fast civic navigation shortcuts</p>
                </div>
              </div>

              <button
                onClick={() => { playClick(); onClose(); }}
                className="p-1.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {SHORTCUT_GROUPS.map((group, gIdx) => (
                <div key={gIdx}>
                  <h3 className="text-[10px] font-mono uppercase font-bold tracking-wider text-[var(--text-muted)] mb-2">
                    {group.title}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {group.items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-[var(--bg-main)]/60 border border-[var(--border-color)] text-xs"
                      >
                        <span className="text-[var(--text-main)] font-medium text-[11px]">{item.description}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, kIdx) => (
                            <kbd
                              key={kIdx}
                              className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xs text-[var(--text-main)]"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-[var(--border-color)] flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)]">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]">Esc</kbd> anytime to dismiss</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
