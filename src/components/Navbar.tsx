import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Compass, Settings, X, MapPin, Route as RouteIcon, Bell, User, Sun, Droplets, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tooltip from './Tooltip';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import { playClick } from '../utils/soundFx';
import { CIVIC_INCIDENTS } from '../pages/MapPage';

interface NavbarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
  onOpenTour?: () => void;
  onOpenPreferences?: () => void;
}

export default function Navbar({ isDarkMode, toggleTheme, envMode, toggleEnvMode, onOpenTour, onOpenPreferences }: NavbarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute filtered search results
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    
    // Base static navigation options
    const staticOptions = [
      { id: 'map', title: 'Live Command Map', subtitle: 'View IoT sensor telemetry & risk corridors', path: '/', icon: MapPin, type: 'Page' },
      { id: 'routes', title: 'Safe Route Optimizer', subtitle: 'Multi-modal bypass routes & flood avoidance', path: '/routes/best', icon: RouteIcon, type: 'Page' },
      { id: 'history', title: 'Route Audit History', subtitle: 'Verified sensor receipts & trip logs', path: '/routes/old', icon: RouteIcon, type: 'Page' },
      { id: 'alerts', title: 'Civic Alerts Feed', subtitle: 'Ward-level danger alerts & tanker orders', path: '/notifications', icon: Bell, type: 'Page' },
      { id: 'profile', title: 'Stakeholder Profile', subtitle: 'Manage operator roles & credentials', path: '/profile', icon: User, type: 'Page' },
      { id: 'action-permissions', title: 'Life-Safety & Permissions Suite', subtitle: 'Manage GPS, Civic Notifications, Geofencing, & SOS', action: () => window.dispatchEvent(new CustomEvent('doab:open-permissions')), icon: ShieldAlert, type: 'Action' },
      { id: 'action-tour', title: 'Start Guided Platform Tour', subtitle: 'Interactive walkthrough of active workspace', action: () => onOpenTour?.(), icon: Compass, type: 'Action' },
      { id: 'action-env', title: `Switch to ${envMode === 'flood' ? 'Drought' : 'Flood'} Mode`, subtitle: 'Toggle dual-climate operational engine', action: toggleEnvMode, icon: Droplets, type: 'Action' },
      { id: 'action-theme', title: `Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`, subtitle: 'Toggle theme display appearance', action: toggleTheme, icon: Sun, type: 'Action' },
      { id: 'action-sos', title: 'Manage & Test SOS Danger Screen', subtitle: 'Trigger full-screen emergency override alarm', action: () => window.dispatchEvent(new CustomEvent('doab:trigger-danger-broadcast')), icon: ShieldAlert, type: 'Action' },
    ];

    if (!q) {
      return staticOptions.slice(0, 5);
    }

    // Filter dynamic incidents & wards
    const incidentMatches = CIVIC_INCIDENTS.filter(inc => 
      inc.title.toLowerCase().includes(q) ||
      inc.ward.toLowerCase().includes(q) ||
      inc.category.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q)
    ).map(inc => ({
      id: inc.id,
      title: `${inc.ward} — ${inc.title}`,
      subtitle: `${inc.severity} ${inc.category.replace('_', ' ')} • ${inc.description.slice(0, 50)}...`,
      path: `/?incident=${inc.id}`,
      icon: MapPin,
      type: 'Telemetry'
    }));

    // Filter static options
    const navMatches = staticOptions.filter(opt => 
      opt.title.toLowerCase().includes(q) ||
      opt.subtitle.toLowerCase().includes(q)
    );

    return [...incidentMatches, ...navMatches].slice(0, 8);
  }, [query, envMode, isDarkMode, toggleEnvMode, toggleTheme, onOpenTour]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (item: any) => {
    playClick();
    if (item.action) {
      item.action();
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
        <div className="w-full max-w-[1800px] 2xl:max-w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo Area with Animated Video Badge */}
          <Link to="/" onClick={() => playClick()} className="flex items-center gap-3 group cursor-pointer shrink-0">
            <BrandLogo size="md" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-none text-[var(--text-main)] group-hover:text-[var(--color-brand-accent)] transition-colors">DOAB</span>
              <span className="text-[10px] text-[var(--text-muted)] tracking-tight leading-none mt-1">Two Waters Response System</span>
            </div>
          </Link>

          {/* Desktop Interactive Search Bar */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <div 
              onClick={() => inputRef.current?.focus()}
              className={`w-full bg-[var(--bg-card)] border rounded-xl px-3.5 py-1.5 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition-all cursor-text ${
                isFocused 
                  ? 'border-[var(--color-brand-accent)] ring-2 ring-[var(--color-brand-accent)]/20 shadow-sm' 
                  : 'border-[var(--border-color)] hover:border-[var(--text-muted)]/40'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className={`h-4 w-4 shrink-0 transition-colors ${isFocused ? 'text-[var(--color-brand-accent)]' : 'text-[var(--text-muted)]'}`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search ward risk telemetry, routes, alerts..."
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
                                : 'bg-[var(--bg-main)] text-[var(--color-brand-accent)]'
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

          {/* Action Controls & Navigation Utilities */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Theme Toggle */}
            <div className="hidden md:flex items-center">
              <ThemeToggle darkMode={isDarkMode} toggleTheme={toggleTheme} />
            </div>

            {onOpenPreferences && (
              <Tooltip content="Preferences & Controls" shortcut="Shift+S" position="bottom">
                <button
                  type="button"
                  id="tour-preferences-btn"
                  onClick={() => { playClick(); onOpenPreferences(); }}
                  className="w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--color-brand-accent)]/40 hover:bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] transition-all flex items-center justify-center cursor-pointer shadow-2xs group"
                  aria-label="Open System Preferences"
                >
                  <Settings className="h-4.5 w-4.5 text-[var(--color-brand-accent)] transition-transform duration-500 group-hover:rotate-90" />
                </button>
              </Tooltip>
            )}

            {/* Mobile Menu Trigger */}
            <button 
              type="button"
              onClick={() => { playClick(); setIsMobileMenuOpen(true); }}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors shadow-2xs cursor-pointer active:scale-95"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="h-4.5 w-4.5" />
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
                    placeholder="Search wards or alerts..."
                    className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none"
                  />
                </div>

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
                    <MapPin className="h-4 w-4 text-[var(--color-brand-accent)]" />
                    <span>Live Command Map</span>
                  </Link>

                  <Link
                    to="/routes/best"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center gap-3 transition-colors"
                  >
                    <RouteIcon className="h-4 w-4 text-[var(--color-brand-accent)]" />
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
                      <Bell className="h-4 w-4 text-[var(--color-brand-accent)]" />
                      <span>Civic Alerts</span>
                    </div>
                    <span className="mono-badge text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)] dark:bg-white/10 text-[var(--text-main)]">
                      3
                    </span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                    className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center gap-3 transition-colors"
                  >
                    <User className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>Stakeholder Profile</span>
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
                      <Settings className="h-4 w-4 text-[var(--color-brand-accent)]" />
                      <span>System Preferences</span>
                    </button>
                  )}

                  {onOpenTour && (
                    <button
                      type="button"
                      onClick={() => { playClick(); setIsMobileMenuOpen(false); onOpenTour(); }}
                      className="p-2.5 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] hover:bg-[var(--text-main)]/10 text-left flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Compass className="h-4 w-4 text-[var(--color-brand-accent)]" />
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
                    <ShieldAlert className="h-4 w-4 text-orange-500" />
                    <span>Life-Safety Permissions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setIsMobileMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('doab:trigger-danger-broadcast'));
                    }}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-left flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Test SOS Danger Screen</span>
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
