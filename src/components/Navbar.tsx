import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, Search, Compass, Settings, X, MapPin, Route as RouteIcon, Bell, User, 
  Droplets, Activity, Radio, ArrowRight, Bot, Navigation2, SlidersHorizontal, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tooltip from './Tooltip';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import { playClick } from '../utils/soundFx';
import { CIVIC_INCIDENTS, ALL_REGIONS } from '../pages/MapPage';

interface NavbarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
  onOpenTour?: () => void;
  onOpenPreferences?: () => void;
  user?: any;
}

export default function Navbar({ isDarkMode, toggleTheme, envMode, toggleEnvMode, onOpenTour, onOpenPreferences, user }: NavbarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const alertsContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
      if (alertsContainerRef.current && !alertsContainerRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute filtered search results: Command, Telemetry & Region Focus instead of static page duplicates
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    // Default quick-utility command actions when search is empty
    if (!q) {
      // 3 Live Critical Hotspots
      const topCriticalHotspots = CIVIC_INCIDENTS.slice(0, 3).map(inc => ({
        id: `hotspot-${inc.id}`,
        title: `${inc.ward} — ${inc.title}`,
        subtitle: `Live Hazard • ${inc.severity} Severity • ${inc.category.replace('_', ' ')}`,
        incident: inc,
        path: `/?incident=${inc.id}`,
        icon: MapPin,
        type: 'Live Hotspot',
      }));

      const quickUtilities = [
        {
          id: 'action-locate',
          title: 'Locate My Real GPS Coordinates',
          subtitle: 'Center map on current position & assess nearest hazard buffer',
          action: () => {
            navigate('/');
            setTimeout(() => window.dispatchEvent(new CustomEvent('doab:locate-me')), 120);
          },
          icon: Navigation2,
          type: 'GPS Action',
        },
        {
          id: 'action-ask-assistant',
          title: 'Ask DOAB AI Dispatch Assistant',
          subtitle: 'Ask about safe corridors, water levels, rainfall, or SOS steps',
          path: '/assistant',
          icon: Bot,
          type: 'AI Copilot',
        },
        {
          id: 'action-env',
          title: `Switch to ${envMode === 'flood' ? 'Drought' : 'Flood'} Climate Engine`,
          subtitle: `Currently viewing ${envMode.toUpperCase()} hazard telemetry`,
          action: toggleEnvMode,
          icon: Droplets,
          type: 'Toggle Mode',
        },
        {
          id: 'action-permissions',
          title: 'Life-Safety & Permissions Suite',
          subtitle: 'Manage GPS, Civic Notifications, Geofencing, & SOS',
          action: () => window.dispatchEvent(new CustomEvent('doab:open-permissions')),
          icon: SlidersHorizontal,
          type: 'Safety Suite',
        },
      ];

      return [...topCriticalHotspots, ...quickUtilities];
    }

    // 1. Direct AI Query Option
    const aiItem = {
      id: 'ai-prompt-query',
      title: `Ask Assistant: "${query}"`,
      subtitle: 'Query DOAB Neural Copilot for routing advice & hazard telemetry',
      path: `/assistant?q=${encodeURIComponent(query)}`,
      icon: Sparkles,
      type: 'AI Copilot',
    };

    // 2. Incident & Ward telemetry matches
    const incidentMatches = CIVIC_INCIDENTS.filter(inc => 
      inc.title.toLowerCase().includes(q) ||
      inc.ward.toLowerCase().includes(q) ||
      inc.category.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q)
    ).slice(0, 4).map(inc => ({
      id: inc.id,
      title: `${inc.ward} — ${inc.title}`,
      subtitle: `${inc.severity} ${inc.category.replace('_', ' ')} • ${inc.description.slice(0, 52)}...`,
      incident: inc,
      path: `/?incident=${inc.id}`,
      icon: MapPin,
      type: 'Telemetry',
    }));

    // 3. State & Metropolitan City Focus matches
    const regionMatches = ALL_REGIONS.filter(reg => 
      reg.val !== 'all' && (
        reg.label.toLowerCase().includes(q) ||
        reg.val.toLowerCase().includes(q)
      )
    ).slice(0, 3).map(reg => ({
      id: `region-${reg.val}`,
      title: reg.label,
      subtitle: `Fly and zoom map to ${reg.badge || 'Regional'} view`,
      region: reg,
      path: `/?state=${encodeURIComponent(reg.val)}`,
      icon: SlidersHorizontal,
      type: 'State Focus',
    }));

    return [aiItem, ...incidentMatches, ...regionMatches];
  }, [query, envMode, toggleEnvMode, navigate]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (item: any) => {
    playClick();
    if (item.action) {
      item.action();
    } else if (item.incident) {
      navigate(item.path);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('doab:focus-incident', { detail: { incident: item.incident } }));
      }, 100);
    } else if (item.region) {
      navigate(item.path);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('doab:focus-region', { detail: { region: item.region } }));
      }, 100);
    } else if (item.path) {
      navigate(item.path);
    }
    setQuery('');
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--bg-main)]/90 backdrop-blur-xl transition-colors duration-200">
        <div className="w-full max-w-[1800px] 2xl:max-w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          
          {/* Logo Area: Centered Logo-Only on Mobile/Touch (< md), Left-Aligned with Text on Desktop (md+) */}
          <Link
            id="tour-brand"
            to="/"
            onClick={() => playClick()}
            className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-center gap-3 group cursor-pointer shrink-0 z-10"
          >
            <BrandLogo size="md" />
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-none text-[var(--text-main)] transition-colors">DOAB</span>
              <span className="text-[10px] text-[var(--text-muted)] tracking-tight leading-none mt-1">Two Waters Response System</span>
            </div>
          </Link>

          {/* Desktop Interactive Search Bar */}
          <div id="tour-search" ref={searchContainerRef} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <div 
              onClick={() => inputRef.current?.focus()}
              className={`w-full bg-[var(--bg-card)] border rounded-xl px-3.5 py-1.5 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition-all cursor-text ${
                isFocused 
                  ? 'border-neutral-900 dark:border-white/75 ring-2 ring-neutral-900/15 dark:ring-white/15 shadow-sm' 
                  : 'border-neutral-300 dark:border-white/25 hover:border-neutral-500 dark:hover:border-white/50'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className={`h-4 w-4 shrink-0 transition-colors ${isFocused ? 'text-[var(--text-main)] dark:text-white' : 'text-[var(--text-muted)]'}`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search hazards, cities, live telemetry, or ask AI..."
                  className="bg-transparent border-none outline-none text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] font-mono w-full truncate"
                />
              </div>

              {query ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer p-0.5"
                  aria-label="Clear Search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded shrink-0">
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            <AnimatePresence>
              {isFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden z-50 p-1.5 flex flex-col gap-1 max-h-84 overflow-y-auto custom-scrollbar"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider flex justify-between items-center">
                    <span>{query ? 'Search Matches' : 'Quick Access & Commands'}</span>
                    <span>{results.length} results</span>
                  </div>

                  {results.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--text-muted)] font-mono">
                      No matching telemetry or routes found for "{query}"
                    </div>
                  ) : (
                    results.map((item: any, idx: number) => {
                      const Icon = item.icon;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs' 
                              : 'hover:bg-[var(--bg-main)] text-[var(--text-main)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected 
                                ? 'bg-[var(--bg-card)]/15 text-current' 
                                : 'bg-[var(--bg-main)] text-[var(--text-main)] dark:text-neutral-200'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate leading-tight">{item.title}</span>
                              <span className={`text-[10px] truncate leading-tight mt-0.5 ${
                                isSelected ? 'text-[var(--bg-card)]/80' : 'text-[var(--text-muted)]'
                              }`}>
                                {item.subtitle}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            isSelected 
                              ? 'border-[var(--bg-card)]/30 bg-[var(--bg-card)]/10 text-current' 
                              : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)]'
                          }`}>
                            {item.type}
                          </span>
                        </button>
                      );
                    })
                  )}

                  <div className="mt-1 pt-1.5 px-2.5 pb-1 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>Use ↑↓ to navigate</span>
                    <span>↵ to select • esc to close</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Controls & Navigation Utilities:
              On Mobile (< md): [Bell + ThemeToggle] on Left, [Hamburger Menu] on Right
              On Desktop (md+): [Bell + ThemeToggle + Settings + Profile] on Right */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Quick Alerts Dropdown Window */}
              <div ref={alertsContainerRef} className="relative">
                <Tooltip content="All Alerts & Telemetry" shortcut="4" position="bottom">
                  <button
                    type="button"
                    id="tour-nav-bell"
                    onClick={() => {
                      playClick();
                      setIsAlertsOpen((prev) => !prev);
                    }}
                    className={`w-9 h-9 rounded-full border transition-colors flex items-center justify-center cursor-pointer shadow-2xs relative group ${
                      isAlertsOpen
                        ? 'border-[var(--text-main)]/30 bg-[var(--text-main)]/10 text-[var(--text-main)] ring-2 ring-[var(--text-main)]/15'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] text-neutral-700 dark:text-neutral-200 hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5'
                    }`}
                    aria-label="Open Alerts Feed Window"
                    aria-expanded={isAlertsOpen}
                  >
                    <Bell strokeWidth={2.2} className="h-[17px] w-[17px] text-neutral-700 dark:text-neutral-200 group-hover:text-[var(--text-main)] transition-colors" />
                    {/* Subtle, refined monochromatic notification badge */}
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--text-main)] dark:bg-neutral-300 opacity-50 transition-colors" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--text-main)] dark:bg-neutral-300 transition-colors" />
                    </span>
                  </button>
                </Tooltip>

                {/* Popover Window: Responsive on Mobile (never overflows screen) & Anchored on Desktop */}
                <AnimatePresence>
                  {isAlertsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="fixed top-[4.25rem] left-3 right-3 max-w-[calc(100vw-1.5rem)] sm:absolute sm:top-full sm:left-0 sm:right-auto md:left-auto md:right-0 sm:mt-2 sm:w-92 bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                    >
                      {/* Header */}
                      <div className="p-3 bg-[var(--bg-main)]/90 border-b border-[var(--border-color)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                          <span className="text-xs font-bold text-[var(--text-main)]">Recent Alerts</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setIsAlertsOpen(false);
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
                          aria-label="Close Alerts Panel"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Quick Items List */}
                      <div className="p-1.5 flex flex-col gap-1 max-h-72 overflow-y-auto custom-scrollbar">
                        {CIVIC_INCIDENTS.slice(0, 4).map((inc) => {
                          const isCrit = inc.severity === 'Critical';
                          const isHigh = inc.severity === 'High';
                          return (
                            <Link
                              key={inc.id}
                              to={`/notifications?alertId=${encodeURIComponent(inc.id)}&title=${encodeURIComponent(inc.title)}`}
                              onClick={() => {
                                playClick();
                                setIsAlertsOpen(false);
                              }}
                              className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] transition-colors flex items-start gap-2.5 group cursor-pointer border border-transparent hover:border-[var(--border-color)]"
                            >
                              <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 transition-colors ${
                                isCrit
                                  ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                                  : isHigh
                                    ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                                    : 'bg-teal-950/[0.06] dark:bg-teal-500/[0.12] text-teal-700 dark:text-teal-300 border-teal-600/25 dark:border-teal-400/25'
                              }`}>
                                {isCrit ? <Radio className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-semibold text-[var(--text-main)] truncate transition-colors">
                                    {inc.title}
                                  </span>
                                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${
                                    isCrit
                                      ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                                      : isHigh
                                        ? 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                                        : 'bg-teal-950/[0.06] dark:bg-teal-500/[0.12] text-teal-700 dark:text-teal-300 border-teal-600/25 dark:border-teal-400/25'
                                  }`}>
                                    {inc.severity}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono block truncate mt-0.5">
                                  {inc.ward} • {inc.waterDepthCm || 45} cm water
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>

                      {/* Footer View All Link (Strict Monochromatic) */}
                      <div className="p-2.5 px-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-md flex items-center justify-center">
                        <Link
                          to="/notifications"
                          onClick={() => {
                            playClick();
                            setIsAlertsOpen(false);
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs font-semibold active:scale-98 transition-all cursor-pointer shadow-xs select-none group"
                        >
                          <span>View All Alerts Page</span>
                          <ArrowRight size={13} className="text-current transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle (Visible on both mobile left cluster and desktop right cluster) */}
              <div className="flex items-center">
                <ThemeToggle darkMode={isDarkMode} toggleTheme={toggleTheme} />
              </div>

              {onOpenPreferences && (
                <Tooltip content="Preferences & Controls" shortcut="Shift+S" position="bottom">
                  <button
                    type="button"
                    id="tour-permissions"
                    onClick={() => { playClick(); onOpenPreferences(); }}
                    className="hidden md:flex w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-neutral-700 dark:text-neutral-200 hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors items-center justify-center cursor-pointer shadow-2xs group"
                    aria-label="Open System Preferences"
                  >
                    <Settings strokeWidth={2.2} className="h-[17px] w-[17px] text-neutral-700 dark:text-neutral-200 group-hover:text-[var(--text-main)] transition-all duration-500 group-hover:rotate-90" />
                  </button>
                </Tooltip>
              )}

              {/* Signed-in User Profile Button with SAHNIRMAAN Golden Ring */}
              {user ? (
                <Tooltip content={`${user.displayName || 'Account'} (Profile)`} shortcut="5" position="bottom">
                  <Link
                    to="/profile"
                    onClick={() => playClick()}
                    className="hidden md:flex items-center gap-1.5 p-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)]/5 transition-colors cursor-pointer shadow-2xs shrink-0 group"
                    aria-label="User Profile"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.55)] border border-white/20">
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=0284c7&color=fff&bold=true`}
                        alt="avatar"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Link>
                </Tooltip>
              ) : (
                <Link
                  to="/login"
                  onClick={() => playClick()}
                  className="hidden md:flex px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] transition-colors shadow-2xs cursor-pointer shrink-0"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Trigger (Far Right on Mobile/Touch) */}
            <button 
              type="button"
              onClick={() => { playClick(); setIsMobileMenuOpen(true); }}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-card)] text-neutral-700 dark:text-neutral-200 hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors shadow-2xs cursor-pointer active:scale-95 group shrink-0"
              aria-label="Open Navigation Drawer"
            >
              <Menu strokeWidth={2.2} className="h-[17px] w-[17px] text-neutral-700 dark:text-neutral-200 group-hover:text-[var(--text-main)] transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="w-[85%] max-w-xs h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] p-5 flex flex-col justify-between shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2.5">
                    <BrandLogo size="sm" />
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-[var(--text-main)]">DOAB Grid</span>
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">Operations Menu</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Mobile Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search hazards, cities, telemetry, AI..."
                    className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Mobile Search Results when typing */}
                {query.trim() && (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto p-1 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                    {results.map((item: any) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            handleSelect(item);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-card)] flex items-center justify-between gap-2 text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-3.5 w-3.5 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[11px] truncate text-[var(--text-main)]">{item.title}</span>
                              <span className="text-[9px] text-[var(--text-muted)] truncate">{item.subtitle}</span>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-muted)] shrink-0">
                            {item.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Navigation Links */}
                <div className="flex flex-col gap-1 text-xs font-semibold">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-1 py-1 font-bold">
                    Destinations
                  </span>
                  
                  <Link
                    to="/"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center gap-3 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                    <span>Live Command Map</span>
                  </Link>

                  <Link
                    to="/routes/best"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center gap-3 transition-colors"
                  >
                    <RouteIcon className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                    <span>Safe Routes Optimizer</span>
                  </Link>

                  <Link
                    to="/routes/old"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center gap-3 transition-colors"
                  >
                    <RouteIcon className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>Route History & Audit</span>
                  </Link>

                  <Link
                    to="/notifications"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                      <span>All Alerts</span>
                    </div>
                    <span className="mono-badge text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)] dark:bg-white/10 text-[var(--text-main)]">
                      3
                    </span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {user ? (
                        <div className="w-6.5 h-6.5 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.55)] border border-white/20">
                          <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=0284c7&color=fff&bold=true`}
                            alt="avatar"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <User className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
                      )}
                      <span className="truncate">{user?.displayName || 'Stakeholder Profile'}</span>
                    </div>
                    {user && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)] dark:bg-white/10 text-[var(--text-main)] dark:text-neutral-200 font-bold shrink-0">
                        Active
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/team"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center gap-3 transition-colors"
                  >
                    <BrandLogo size="sm" />
                    <span>Team Contrarians</span>
                  </Link>
                </div>

                {/* Quick Actions Partition */}
                <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-1 py-0.5 font-bold">
                    Quick Actions
                  </span>

                  {onOpenPreferences && (
                    <button
                      type="button"
                      onClick={() => { playClick(); setIsMobileMenuOpen(false); onOpenPreferences(); }}
                      className="p-2.5 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] hover:bg-[var(--text-main)]/10 text-left flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                      <span>System Preferences</span>
                    </button>
                  )}

                  {onOpenTour && (
                    <button
                      type="button"
                      onClick={() => { playClick(); setIsMobileMenuOpen(false); onOpenTour(); }}
                      className="p-2.5 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] hover:bg-[var(--text-main)]/10 text-left flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Compass className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                      <span>Start Platform Tour</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setIsMobileMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('doab:open-permissions'));
                    }}
                    className="p-2.5 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] hover:bg-[var(--text-main)]/10 text-left flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                    <span>Life-Safety Permissions</span>
                  </button>
                </div>
              </div>

              {/* Bottom Drawer Footer */}
              <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>DOAB v1.0.0</span>
                <span>Civic Operational Grid</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
