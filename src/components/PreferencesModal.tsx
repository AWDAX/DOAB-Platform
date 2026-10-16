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
  VolumeX,
  User, 
  LogOut, 
  MousePointer,
  Check,
  ChevronDown,
  SlidersHorizontal,
  BellRing,
  ChevronRight,
  Sliders
} from 'lucide-react';
import AIOrbIcon from './AIOrbIcon';
import { playClick, isSoundEnabled } from '../utils/soundFx';
import { firebaseSignOut } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

/**
 * High-Precision ToggleSwitch Component
 * Replaces default checkboxes with a clean, semantic animated button slider.
 * DOAB design standard.
 */
export function ToggleSwitch({ 
  checked, 
  onChange, 
  disabled = false, 
  size = 'md', 
  ariaLabel = 'Toggle switch' 
}: { 
  checked: boolean; 
  onChange: (next: boolean) => void; 
  disabled?: boolean; 
  size?: 'sm' | 'md';
  ariaLabel?: string;
}) {
  const isSmall = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onChange) onChange(!checked);
      }}
      className={`relative inline-flex items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer select-none border-transparent shrink-0 ${
        isSmall ? 'w-9 h-5 p-0.5' : 'w-11 h-6 p-0.5'
      } ${
        checked 
          ? 'bg-[var(--text-main)]' 
          : 'bg-slate-200 dark:bg-white/20'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block rounded-full transition-transform duration-300 shadow-xs pointer-events-none ${
          isSmall ? 'w-4 h-4' : 'w-5 h-5'
        } ${
          checked 
            ? 'bg-[var(--bg-card)]' 
            : 'bg-white dark:bg-slate-300'
        }`}
        style={{
          transform: checked 
            ? (isSmall ? 'translateX(16px)' : 'translateX(20px)') 
            : 'translateX(0px)'
        }}
      />
    </button>
  );
}

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
  user?: any;
}

export default function PreferencesModal({
  isOpen,
  onClose,
  isDarkMode,
  toggleTheme,
  envMode,
  toggleEnvMode,
  user
}: PreferencesModalProps) {
  const navigate = useNavigate();

  // Acoustic feedback state
  const [soundsActive, setSoundsActive] = useState(() => isSoundEnabled());
  const [clickSoundActive, setClickSoundActive] = useState(() => localStorage.getItem('doab_click_sound') !== 'off');
  const [isAudioAccordionOpen, setIsAudioAccordionOpen] = useState(true);

  // Vehicle routing parameters
  const [clearanceLimit, setClearanceLimit] = useState<'15' | '20' | '25'>(() => {
    return (localStorage.getItem('doab_clearance_limit') as any) || '15';
  });
  const [highElevationPriority, setHighElevationPriority] = useState<boolean>(() => {
    return localStorage.getItem('doab_high_elevation') !== 'false';
  });

  // Keep master sound state synchronized
  const handleMasterSoundToggle = (next: boolean) => {
    playClick();
    setSoundsActive(next);
    if (next) {
      localStorage.removeItem('doab_sounds_muted');
    } else {
      localStorage.setItem('doab_sounds_muted', 'true');
    }
  };

  const handleClickSoundToggle = (next: boolean) => {
    playClick();
    setClickSoundActive(next);
    localStorage.setItem('doab_click_sound', next ? 'on' : 'off');
  };

  const handleClearanceChange = (val: '15' | '20' | '25') => {
    playClick();
    setClearanceLimit(val);
    localStorage.setItem('doab_clearance_limit', val);
  };

  const handleElevationToggle = (next: boolean) => {
    playClick();
    setHighElevationPriority(next);
    localStorage.setItem('doab_high_elevation', String(next));
  };

  // System Alerts & Geofence Parameters
  const [alertDistance, setAlertDistance] = useState<'250' | '500' | '1000'>(() => {
    return (localStorage.getItem('doab_alert_distance') as any) || '500';
  });
  const [alertSirenEnabled, setAlertSirenEnabled] = useState<boolean>(() => {
    return localStorage.getItem('doab_alert_siren_enabled') !== 'false';
  });
  const [alertMinSeverity, setAlertMinSeverity] = useState<'all' | 'high' | 'critical'>(() => {
    return (localStorage.getItem('doab_alert_sensitivity') as any) || 'high';
  });

  const handleAlertDistanceChange = (val: '250' | '500' | '1000') => {
    playClick();
    setAlertDistance(val);
    localStorage.setItem('doab_alert_distance', val);
    window.dispatchEvent(new CustomEvent('doab:alert-config-changed', { detail: { alertDistance: val } }));
  };

  const handleAlertSirenToggle = (next: boolean) => {
    playClick();
    setAlertSirenEnabled(next);
    localStorage.setItem('doab_alert_siren_enabled', String(next));
    window.dispatchEvent(new CustomEvent('doab:alert-config-changed', { detail: { alertSirenEnabled: next } }));
  };

  const handleAlertSensitivityChange = (val: 'all' | 'high' | 'critical') => {
    playClick();
    setAlertMinSeverity(val);
    localStorage.setItem('doab_alert_sensitivity', val);
    window.dispatchEvent(new CustomEvent('doab:alert-config-changed', { detail: { alertMinSeverity: val } }));
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
            transition={{ duration: 0.18 }}
            onClick={() => { playClick(); onClose(); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container Card (DOAB Standard) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-4xl lg:max-w-5xl neo-glass-card rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden p-5 sm:p-7 flex flex-col max-h-[92dvh] z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-neutral-500/10 text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] dark:border-white/15 flex items-center justify-center shrink-0 shadow-2xs">
                  <Settings className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-main)] truncate">
                    System Preferences & Controls
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    Climate dynamics, acoustics & safe routing parameters
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

            {/* Scrollable Content Body - Responsive 2-Column Grid */}
            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* LEFT COLUMN: Environment, Theme Canvas, Sensory Audio & Vehicle Clearance */}
                <div className="space-y-4">
                  {/* SECTION 1: Dual-Climate Dynamics (SWATVA Visual Cards) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                      <AIOrbIcon size={13} className="text-[var(--text-main)] dark:text-neutral-200" />
                      Dual-Climate Environmental Engine
                    </span>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Flood Mode Card */}
                      <button
                        type="button"
                        onClick={() => {
                          if (envMode !== 'flood') {
                            playClick();
                            toggleEnvMode();
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer select-none relative group ${
                          envMode === 'flood'
                            ? 'bg-sky-500/10 border-sky-500/40 text-sky-950 dark:text-sky-100 shadow-sm ring-1 ring-sky-500/30'
                            : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/30'
                        }`}
                      >
                        {envMode === 'flood' && (
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-xs">
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-500/10 text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] flex items-center justify-center">
                            <CloudRain size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight text-[var(--text-main)]">Flood Mode</div>
                            <div className="text-[9px] font-mono text-[var(--text-muted)]">Aqua / Porcelain</div>
                          </div>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                          Monsoon inundation, ward waterlog & high-elevation reroutes
                        </div>
                      </button>

                      {/* Drought Mode Card */}
                      <button
                        type="button"
                        onClick={() => {
                          if (envMode !== 'drought') {
                            playClick();
                            toggleEnvMode();
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer select-none relative group ${
                          envMode === 'drought'
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/30'
                        }`}
                      >
                        {envMode === 'drought' && (
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-xs">
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-500/10 text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] flex items-center justify-center">
                            <SunMedium size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight text-[var(--text-main)]">Drought Mode</div>
                            <div className="text-[9px] font-mono text-[var(--text-muted)]">Amber / Baked Earth</div>
                          </div>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                          Groundwater deficits, dry wards & emergency tanker dispatches
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 2: Visual Theme (Light vs Dark) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                      {isDarkMode ? <Moon size={12} className="text-[var(--text-main)] dark:text-neutral-200" /> : <Sun size={12} className="text-[var(--text-main)] dark:text-neutral-200" />}
                      Theme & Contrast Canvas
                    </span>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Light Canvas */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDarkMode) {
                            playClick();
                            toggleTheme();
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          !isDarkMode
                            ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-transparent shadow-sm'
                            : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sun size={14} className={!isDarkMode ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)]'} />
                          <div>
                            <div className={`text-xs font-bold leading-tight ${!isDarkMode ? 'text-[var(--bg-card)]' : 'text-[var(--text-main)]'}`}>
                              Light Theme
                            </div>
                            <div className={`text-[9px] font-mono mt-0.5 ${!isDarkMode ? 'text-[var(--bg-card)]/70' : 'text-[var(--text-muted)]'}`}>
                              Clean Sea Porcelain
                            </div>
                          </div>
                        </div>
                        {!isDarkMode && <Check size={14} strokeWidth={3} className="text-[var(--bg-card)]" />}
                      </button>

                      {/* Dark Canvas */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDarkMode) {
                            playClick();
                            toggleTheme();
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isDarkMode
                            ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-transparent shadow-sm'
                            : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Moon size={14} className={isDarkMode ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)]'} />
                          <div>
                            <div className={`text-xs font-bold leading-tight ${isDarkMode ? 'text-[var(--bg-card)]' : 'text-[var(--text-main)]'}`}>
                              Dark Theme
                            </div>
                            <div className={`text-[9px] font-mono mt-0.5 ${isDarkMode ? 'text-[var(--bg-card)]/70' : 'text-[var(--text-muted)]'}`}>
                              Abyssal Obsidian
                            </div>
                          </div>
                        </div>
                        {isDarkMode && <Check size={14} strokeWidth={3} className="text-[var(--bg-card)]" />}
                      </button>
                    </div>
                  </div>

                  {/* SECTION 3: Sensory & Audio Feedback Engine */}
                  <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] flex items-center justify-center shrink-0 shadow-2xs">
                          {soundsActive ? <Volume2 size={15} /> : <VolumeX size={15} className="text-[var(--text-muted)]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-main)] truncate">Acoustic Audio FX</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">Tactile clicks & alert chimes</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ToggleSwitch 
                          checked={soundsActive} 
                          onChange={handleMasterSoundToggle} 
                          ariaLabel="Toggle audio feedback"
                        />
                        <button
                          type="button"
                          onClick={() => { playClick(); setIsAudioAccordionOpen(!isAudioAccordionOpen); }}
                          className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                          title="Audio Sub-options"
                        >
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform duration-300 ${isAudioAccordionOpen ? 'rotate-180' : ''}`} 
                          />
                        </button>
                      </div>
                    </div>

                    {/* Sub-Settings Accordion */}
                    <AnimatePresence>
                      {isAudioAccordionOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 border-t border-[var(--border-color)] pt-2.5 overflow-hidden"
                        >
                          {/* Sub 1: Tactile Click Sound */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <MousePointer size={12} className="text-[var(--text-muted)] shrink-0" />
                              <span className="text-xs font-medium text-[var(--text-main)] truncate">Tactile Click FX</span>
                            </div>
                            <ToggleSwitch
                              size="sm"
                              disabled={!soundsActive}
                              checked={clickSoundActive && soundsActive}
                              onChange={handleClickSoundToggle}
                              ariaLabel="Toggle click sounds"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* SECTION 4: Life-Safety & Vehicle Routing Parameters */}
                  <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <SlidersHorizontal size={15} className="text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-[var(--text-main)]">Two-Wheeler Flood Clearance</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Reroutes riders when standing water exceeds limit</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)] text-[var(--text-main)] dark:text-neutral-200 shrink-0 shadow-2xs">
                        {clearanceLimit} cm max
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      {[
                        { val: '15', label: '15 cm', desc: 'Strict Safety' },
                        { val: '20', label: '20 cm', desc: 'Standard City' },
                        { val: '25', label: '25 cm', desc: 'High Clearance' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleClearanceChange(item.val as any)}
                          className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                            clearanceLimit === item.val
                              ? 'border-[var(--text-main)] bg-[var(--bg-card)] shadow-xs ring-1 ring-[var(--text-main)] font-bold'
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
                      <ToggleSwitch
                        size="sm"
                        checked={highElevationPriority}
                        onChange={handleElevationToggle}
                        ariaLabel="Toggle high-elevation priority"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Auto-Alerts & Danger Geofence + User Profile */}
                <div className="space-y-4">
                  {/* SECTION 5: Auto-Alerts & Geofence Triggers */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BellRing size={16} className="text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-[var(--text-main)]">Auto-Alerts & Danger Geofence</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Proximity triggers & emergency broadcast thresholds</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shrink-0 shadow-2xs">
                        {alertDistance}m trigger
                      </span>
                    </div>

                    {/* Proximity Trigger Range Selector */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Geofence Alert Distance Ahead</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: '250', label: '250 m', desc: 'Dense Urban' },
                          { val: '500', label: '500 m', desc: 'Recommended' },
                          { val: '1000', label: '1000 m', desc: 'Highway / Fast' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => handleAlertDistanceChange(item.val as any)}
                            className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                              alertDistance === item.val
                                ? 'border-[var(--text-main)] bg-[var(--bg-card)] shadow-xs ring-1 ring-[var(--text-main)] font-bold text-[var(--text-main)]'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)]/50 hover:bg-[var(--bg-card)] text-[var(--text-muted)]'
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div className="text-[9px] text-[var(--text-muted)] font-mono">{item.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Minimum Hazard Severity Filter */}
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Minimum Warning Severity</span>
                        <span className="text-[10px] font-mono capitalize">{alertMinSeverity}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: 'all', label: 'All Risks', desc: '≥ 35% Risk' },
                          { val: 'high', label: 'High+', desc: '≥ 50% Depth' },
                          { val: 'critical', label: 'Critical Only', desc: '≥ 70% Severe' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => handleAlertSensitivityChange(item.val as any)}
                            className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                              alertMinSeverity === item.val
                                ? 'border-[var(--text-main)] bg-[var(--bg-card)] shadow-xs ring-1 ring-[var(--text-main)] font-bold text-[var(--text-main)]'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)]/50 hover:bg-[var(--bg-card)] text-[var(--text-muted)]'
                            }`}
                          >
                            <div className="text-xs">{item.label}</div>
                            <div className="text-[9px] font-mono">{item.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Siren Audio Toggle */}
                    <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-[var(--text-main)]">Emergency Siren Alarm</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Acoustic siren on approaching flooded underpass</div>
                      </div>
                      <ToggleSwitch
                        size="sm"
                        checked={alertSirenEnabled}
                        onChange={handleAlertSirenToggle}
                        ariaLabel="Toggle emergency siren"
                      />
                    </div>
                  </div>

                  {/* SECTION 6: Logged In Account & Profile */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                      <User size={12} className="text-[var(--text-main)] dark:text-neutral-200" />
                      Your Logged In Account
                    </span>

                    {user ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=0284c7&color=fff&bold=true`}
                              alt="Avatar"
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-white/20 object-cover ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.55)] transition-all"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-[var(--bg-card)] flex items-center justify-center shadow-xs" title="Verified Account">
                              <span className="w-1 h-1 rounded-full bg-slate-950" />
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-main)] truncate">{user.displayName || 'Civic Operator'}</div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">{user.email}</div>
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
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-main)]">Anonymous Viewer</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Sign in to publish tanker dispatches & safe routing</div>
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

                {/* SECTION 7: Life-Safety & System Permissions */}
                <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] text-left">
                      Life-Safety & System Permissions
                    </h2>
                  </div>

                  <div className="p-3 sm:p-3.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)] dark:border-white/10 flex items-center justify-center shrink-0">
                        <Settings className="h-4.5 w-4.5 text-[var(--text-main)] dark:text-neutral-200" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">
                          Life-Safety & System Permissions
                        </div>
                        <div className="text-[10.5px] sm:text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                          Manage GPS location, civic flash flood alerts, commuter geofencing, and SOS alarm broadcast preferences.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        onClose();
                        window.dispatchEvent(new CustomEvent('doab:open-permissions'));
                      }}
                      className="px-3.5 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 border border-neutral-950/20 dark:border-white/20 text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-xs active:scale-98"
                    >
                      <Sliders size={13} className="stroke-[2.2]" />
                      <span>All Permissions</span>
                      <ChevronRight size={13} className="opacity-70" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
