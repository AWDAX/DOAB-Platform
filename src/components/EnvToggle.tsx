import { playClick } from '../utils/soundFx';
import { motion, AnimatePresence } from 'framer-motion';

interface EnvToggleProps {
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
  className?: string;
}

/**
 * Minimalist Circular Environmental Mode Toggle
 * Kinetic dropping physics with clean circular enclosure.
 */
export default function EnvToggle({ envMode, toggleEnvMode, className = '' }: EnvToggleProps) {
  const handleClick = () => {
    playClick();
    toggleEnvMode();
  };

  const isFlood = envMode === 'flood';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] transition-all shadow-2xs backdrop-blur-md focus:outline-none focus:ring-0 active:outline-none group shrink-0 ${className}`}
      title={isFlood ? "Switch to Drought Mode" : "Switch to Flood Mode"}
      aria-label="Toggle Environment Theme"
    >
      <div className="flex items-center justify-center absolute inset-0 overflow-hidden rounded-full">
        <AnimatePresence mode="wait" initial={false}>
          {isFlood ? (
            <motion.div
              key="flood"
              initial={{ y: -14, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 14, opacity: 0, rotate: 20 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center text-sky-500"
            >
              {/* Minimalist Water/Flood Droplet Icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="drought"
              initial={{ y: -14, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 14, opacity: 0, rotate: 20 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center text-amber-500"
            >
              {/* Minimalist Cracked Earth / Drought Icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2l-1.5 5 3.5 4-2.5 5 1.5 6" />
                <path d="M10.5 11l-4.5 1" />
                <path d="M11.5 16l4.5 1.5" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}
