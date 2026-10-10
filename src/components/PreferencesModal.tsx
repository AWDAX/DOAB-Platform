import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  X, 
  Sun, 
  Moon, 
  CloudRain, 
  SunMedium, 
  Volume2, 
  Compass, 
  User, 
  LogOut, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { playClick, playAlertAlarm, isSoundEnabled } from '../utils/soundFx';
import { firebaseSignOut } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
  user?: any;
  onOpenTour?: () => void;
}

export default function PreferencesModal({
  isOpen,
  onClose,
  isDarkMode,
  toggleTheme,
  envMode,
  toggleEnvMode,
  user,
  onOpenTour
}: PreferencesModalProps) {
  const navigate = useNavigate();

  // Acoustic feedback state
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());
  const [clearanceLimit, setClearanceLimit] = useState<'15' | '20' | '25'>(() => {
    return (localStorage.getItem('doab_clearance_limit') as any) || '15';
  });
  const [highElevationPriority, setHighElevationPriority] = useState<boolean>(() => {
    return localStorage.getItem('doab_high_elevation') !== 'false';
  });

  // Keep sound state synchronized
  const handleToggleSound = () => {
    playClick();
    const next = !soundActive;
    setSoundActive(next);
    if (next) {
      localStorage.removeItem('doab_sounds_muted');
    } else {
      localStorage.setItem('doab_sounds_muted', 'true');
    }
  };

  const handleClearanceChange = (val: '15' | '20' | '25') => {
    playClick();
    setClearanceLimit(val);
    localStorage.setItem('doab_clearance_limit', val);
  };

  const handleElevationToggle = () => {
    playClick();
    const next = !highElevationPriority;
    setHighElevationPriority(next);
    localStorage.setItem('doab_high_elevation', String(next));
  };

  const handleSignOut = async () => {
    playClick();
    await firebaseSignOut();
    onClose();
    navigate('/login', { replace: true });
  };

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { playClick(); onClose(); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-xl neo-glass-card rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden p-5 sm:p-7 flex flex-col max-h-[90dvh] z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] border border-[var(--color-brand-accent)]/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <Settings className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-main)] truncate">
                    System Preferences & Controls
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    Acoustics, climate engine & life-safety routing
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded shadow-2xs">
                  Shift+S
                </kbd>
                <button
                  type="button"
                  onClick={() => { playClick(); onClose(); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shadow-2xs"
                  aria-label="Close Preferences"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 custom-scrollbar pr-1">
              
              {/* SECTION 1: Dual-Climate & Theme Grid */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[var(--color-brand-accent)]" />
                  Appearance & Environmental Engine
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Climate Grid Mode Switcher */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        {envMode === 'flood' ? <CloudRain size={14} className="text-sky-500" /> : <SunMedium size={14} className="text-amber-500" />}
                        <span>Climate Grid Mode</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {envMode === 'flood' ? 'Monsoon submersion & drainage' : 'Groundwater deficit & tanker fleet'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => { playClick(); toggleEnvMode(); }}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)] transition-all cursor-pointer shadow-xs"
                    >
                      <span>Switch to {envMode === 'flood' ? 'Drought Mode' : 'Flood Mode'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Dark/Light Appearance Switcher */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        {isDarkMode ? <Moon size={14} className="text-sky-400" /> : <Sun size={14} className="text-amber-500" />}
                        <span>Visual Theme</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {isDarkMode ? 'Abyssal dark canvas with high contrast' : 'Porcelain light canvas with crisp ink'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => { playClick(); toggleTheme(); }}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)] transition-all cursor-pointer shadow-xs"
                    >
                      <span>Switch to {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Acoustics & Audio Feedback */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                  <Volume2 size={12} className="text-[var(--color-brand-accent)]" />
                  Tactile Audio & Siren Feedback
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Click Acoustics */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-main)] truncate">Tactile Click Sound</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">Low-latency physical click FX</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        soundActive 
                          ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs' 
                          : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {soundActive ? 'Enabled' : 'Muted'}
                    </button>
                  </div>

                  {/* Danger Alarm Acoustics */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-main)] truncate">Emergency Siren Audio</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">Dual-tone critical life-safety buzzer</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { playClick(); playAlertAlarm(); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      Test Siren
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Life-Safety Routing Thresholds */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                  <Compass size={12} className="text-[var(--color-brand-accent)]" />
                  Routing & Flood Clearance Safety
                </span>

                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Two-Wheeler Submersion Limit</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Reroutes riders when standing water depth exceeds threshold</div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--color-brand-accent)] self-start sm:self-auto">
                      {clearanceLimit} cm max
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { val: '15', label: '15 cm', desc: 'Strict Safety' },
                      { val: '20', label: '20 cm', desc: 'Standard' },
                      { val: '25', label: '25 cm', desc: 'High Clearance' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => handleClearanceChange(item.val as any)}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          clearanceLimit === item.val
                            ? 'border-[var(--text-main)] bg-[var(--bg-card)] shadow-xs ring-1 ring-[var(--text-main)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-card)]/50 hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <div className="text-xs font-bold text-[var(--text-main)]">{item.label}</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono">{item.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      Prefer High-Elevation Ridges
                    </div>
                    <button
                      type="button"
                      onClick={handleElevationToggle}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        highElevationPriority
                          ? 'bg-[var(--text-main)] text-[var(--bg-card)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {highElevationPriority ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Active Operator & Session */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                  <User size={12} className="text-[var(--color-brand-accent)]" />
                  Stakeholder Session & Access
                </span>

                {user ? (
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full border border-[var(--border-color)] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-main)] truncate">{user.displayName || 'Civic Operator'}</div>
                        <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">{user.email}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-danger-subtle flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-main)]">Anonymous Viewer</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Sign in to unlock operator routing & dispatch bounties</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { playClick(); onClose(); navigate('/login'); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--text-main)] text-[var(--bg-card)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3 flex-shrink-0">
              {onOpenTour ? (
                <button
                  type="button"
                  onClick={() => { playClick(); onClose(); onOpenTour(); }}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Compass size={14} className="text-[var(--color-brand-accent)]" />
                  <span>Start Guided Tour</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => { playClick(); onClose(); }}
                className="px-5 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
