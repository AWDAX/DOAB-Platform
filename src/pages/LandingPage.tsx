import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Route as RouteIcon, 
  MapPin, 
  Search, 
  ArrowRight, 
  ArrowUpRight, 
  Droplets, 
  Sun, 
  Camera, 
  ChevronDown, 
  CheckCircle2, 
  Activity, 
  Truck, 
  Menu, 
  X, 
  Layers, 
  HelpCircle,
  Settings,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import EnvToggle from '../components/EnvToggle';
import Tooltip from '../components/Tooltip';
import BrandLogo from '../components/BrandLogo';
import KineticRollingHeadline from '../components/KineticRollingHeadline';
import FooterParticles from '../components/FooterParticles';
import { playClick } from '../utils/soundFx';
import { CIVIC_INCIDENTS } from './MapPage';

const PROMPTS = [
  'Ward 14 MG Road flood depth',
  'Nearest water tanker dispatch point',
  'Harmu River bypass route for 2-wheelers',
  'Report dry community tap in Ward 08'
];

const DOAB_STEPS = [
  {
    n: '01',
    phase: 'DETECT',
    title: 'Ward-Level Telemetry & Anomaly Flagging',
    description: 'IoT ultrasonic sensors and ground telemetry pinpoint submerged corridors and groundwater depletion in real time.',
    icon: Activity,
    highlight: 'Sub-400m risk perimeters'
  },
  {
    n: '02',
    phase: 'ORDER',
    title: 'Automated Logistics & Bounty Dispatch',
    description: 'Algorithmic work orders trigger commercial bounties: emergency plumbers (₹5,000) and municipal water tanker units.',
    icon: Truck,
    highlight: 'Automated municipal work orders'
  },
  {
    n: '03',
    phase: 'ALERT',
    title: 'Flood-Avoidance Turn-by-Turn Rerouting',
    description: 'Computes high-elevation bypasses to steer low-clearance vehicles and delivery riders away from stalled flood arteries.',
    icon: RouteIcon,
    highlight: 'Real-time elevation bypass'
  },
  {
    n: '04',
    phase: 'BACK-CHECK',
    title: 'Citizen Ground-Truth Photo Verification',
    description: '1-tap post-commute photo submissions verify cleared roads, rewarding riders with civic trust scores.',
    icon: Camera,
    highlight: 'Decentralized trust scoring'
  }
];

const COVERAGE_STATS = [
  { label: 'Monitored Wards', value: '24 Wards', detail: 'Ranchi Municipal Grid' },
  { label: 'Reroute Proximity', value: '<400m Ahead', detail: 'Turn-by-turn elevation bypass' },
  { label: 'Bounty Dispatch', value: '₹5,000 / Tankers', detail: 'Plumbers & emergency logistics' },
  { label: 'Latency Engine', value: '<120ms Sync', detail: 'Real-time telemetry streaming' }
];

const FAQS = [
  {
    q: 'What is DOAB and how does the Dual-Climate framework work?',
    a: 'DOAB addresses both extremes of urban water crises in Indian cities: seasonal monsoon flooding (submersion, blocked drainage) and summer drought (groundwater deficit, tanker demand). The platform runs an automated four-stage loop: Detect, Order, Alert, and Back-check.'
  },
  {
    q: 'How are safe rerouting paths calculated for delivery riders and citizens?',
    a: 'The DOAB routing engine correlates live sensor water depths, elevation contours, and historical drainage choke probabilities to steer vehicles around standing water exceeding critical safety thresholds (e.g. >15cm for two-wheelers).'
  },
  {
    q: 'How does the commercial dispatch bounty system work?',
    a: 'When an anomaly is confirmed (e.g., clogged stormwater drain in Ward 14 or zero-water tap telemetry in Ward 08), the system publishes an automated bounty work order for registered municipal plumbers or verified tanker fleet partners.'
  },
  {
    q: 'Does DOAB require special hardware or can anyone contribute?',
    a: 'Any citizen or delivery rider can navigate with background geofencing enabled and submit 1-tap photo back-checks to verify road clearance, earning community trust scores and verified badges.'
  }
];

interface LandingPageProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
  user?: any;
  onOpenPreferences?: () => void;
}

export default function LandingPage({ isDarkMode, toggleTheme, envMode, toggleEnvMode, user, onOpenPreferences }: LandingPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedModeTab, setSelectedModeTab] = useState<'flood' | 'drought'>(envMode);
  const [scrolled, setScrolled] = useState(false);

  // Typewriter effect for search bar
  const [typewriterText, setTypewriterText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const heroSearchRef = useRef<HTMLInputElement>(null);

  // Sync mode tab with global mode toggle
  useEffect(() => {
    setSelectedModeTab(envMode);
  }, [envMode]);

  // Morphing navbar scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
      setScrolled(scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
      document.removeEventListener('scroll', handleScroll, { capture: true } as any);
    };
  }, []);

  // Typewriter loop
  useEffect(() => {
    if (query.length > 0) return;

    const currentPrompt = PROMPTS[promptIndex % PROMPTS.length];
    let timer: any;

    if (isTyping) {
      if (typewriterText.length < currentPrompt.length) {
        timer = setTimeout(() => {
          setTypewriterText(currentPrompt.slice(0, typewriterText.length + 1));
        }, 35);
      } else {
        timer = setTimeout(() => setIsTyping(false), 2200);
      }
    } else {
      if (typewriterText.length > 0) {
        timer = setTimeout(() => {
          setTypewriterText(currentPrompt.slice(0, typewriterText.length - 1));
        }, 15);
      } else {
        setPromptIndex((prev) => prev + 1);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timer);
  }, [typewriterText, isTyping, promptIndex, query]);

  // Focus Search on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        heroSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    const finalQuery = query.trim() || typewriterText;
    if (!user) {
      navigate('/login');
    } else {
      navigate(finalQuery ? `/?search=${encodeURIComponent(finalQuery)}` : '/');
    }
  };

  const scrollTo = (id: string) => {
    playClick();
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 relative overflow-x-clip font-sans selection:bg-[var(--color-brand-accent)] selection:text-white">
      
      {/* ── Dynamic Morphing Navbar (SAHNIRMAAN / SWATVA Standard) ── */}
      <header className={`portfolio-header ${scrolled ? 'scrolled' : ''}`}>
        
        {/* Left: Brand Logo & Title */}
        <Link to="/" onClick={() => playClick()} className="flex items-center gap-2.5 group cursor-pointer flex-shrink-0">
          <BrandLogo size="md" />
          <div className={`flex flex-col overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[140px] opacity-100 translate-x-0'
          }`}>
            <span className="font-bold text-xs tracking-tight text-[var(--text-main)] group-hover:text-[var(--color-brand-accent)] transition-colors whitespace-nowrap">
              DOAB
            </span>
            <span className="text-[9px] text-[var(--text-muted)] tracking-tight leading-none mt-0.5 whitespace-nowrap">
              Two Waters System
            </span>
          </div>
        </Link>

        {/* Left-to-Center Vertical Divider Line (Scrolled only) */}
        <div className={`hidden md:block h-3.5 w-[1px] bg-[var(--border-color)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
        }`} />

        {/* Center: Clean Nav Links with Dotted Animated Underlines */}
        <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-[var(--text-muted)]">
          <button type="button" onClick={() => scrollTo('loop')} className="portfolio-nav-link text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[var(--color-brand-accent)]" />
            <span>The Loop</span>
          </button>
          <button type="button" onClick={() => scrollTo('modes')} className="portfolio-nav-link text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-[var(--color-brand-accent)]" />
            <span>Dual Climate</span>
          </button>
          <button type="button" onClick={() => scrollTo('telemetry')} className="portfolio-nav-link text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[var(--color-brand-accent)]" />
            <span>Live Incidents</span>
          </button>
          <button type="button" onClick={() => scrollTo('faq')} className="portfolio-nav-link text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--color-brand-accent)]" />
            <span>FAQ</span>
          </button>
        </nav>

        {/* Center-to-Right Vertical Divider Line (Scrolled only) */}
        <div className={`hidden md:block h-3.5 w-[1px] bg-[var(--border-color)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
        }`} />

        {/* Right: Controls & Clean Sign In CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenPreferences && (
            <Tooltip content="Preferences" shortcut="Shift+S" position="bottom">
              <button
                type="button"
                onClick={() => { playClick(); onOpenPreferences(); }}
                className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--color-brand-accent)]/40 text-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent)]/10 transition-all flex items-center justify-center cursor-pointer shadow-2xs group"
                aria-label="Preferences"
              >
                <Settings className="h-4 w-4 text-[var(--color-brand-accent)] transition-transform duration-500 group-hover:rotate-90" />
              </button>
            </Tooltip>
          )}

          <Tooltip content={envMode === 'flood' ? "Drought" : "Flood"} shortcut="Shift+E" position="bottom">
            <EnvToggle envMode={envMode} toggleEnvMode={toggleEnvMode} />
          </Tooltip>

          <Tooltip content={isDarkMode ? "Light" : "Dark"} shortcut="Shift+T" position="bottom">
            <ThemeToggle darkMode={isDarkMode} toggleTheme={toggleTheme} />
          </Tooltip>

          <Link
            to={user ? "/" : "/login"}
            onClick={() => playClick()}
            className="flex px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap items-center gap-1.5 transition-all duration-200 border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] shadow-2xs cursor-pointer group ml-1"
          >
            <span>{user ? "Dashboard" : "Sign In"}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-current transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 flex-shrink-0" />
          </Link>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => { playClick(); setIsMobileMenuOpen(!isMobileMenuOpen); }}
            className="md:hidden w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-2xs cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile-only Slide Navigation Drawer */}
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
              className="w-[80%] max-w-xs h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] p-5 flex flex-col justify-between shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <BrandLogo size="sm" />
                    <span className="font-bold text-xs text-[var(--text-main)]">DOAB</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 text-xs font-semibold">
                  <button type="button" onClick={() => scrollTo('loop')} className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-left flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[var(--color-brand-accent)]" /> The DOAB Loop
                  </button>
                  <button type="button" onClick={() => scrollTo('modes')} className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-left flex items-center gap-2">
                    <Sun className="h-4 w-4 text-[var(--color-brand-accent)]" /> Dual Climate
                  </button>
                  <button type="button" onClick={() => scrollTo('telemetry')} className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-left flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[var(--color-brand-accent)]" /> Live Incidents
                  </button>
                  <button type="button" onClick={() => scrollTo('faq')} className="p-2.5 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-left flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[var(--color-brand-accent)]" /> Architecture FAQ
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)] flex flex-col gap-2">
                <Link
                  to={user ? "/" : "/login"}
                  onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
                  className="w-full py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] flex items-center justify-center gap-2 text-xs font-bold shadow-xs"
                >
                  {user ? "Open Dashboard" : "Sign In / Enter Grid"} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 sm:pt-40 pb-16 px-4 sm:px-6 max-w-[1200px] mx-auto flex flex-col items-center text-center min-h-[85vh] justify-center">
        
        {/* Soft Atmospheric Background Ambient Halo behind Headline */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[680px] h-[200px] sm:h-[340px] bg-gradient-to-b from-[var(--color-brand-accent)]/[0.05] via-[var(--color-brand-accent)]/[0.015] to-transparent rounded-full blur-[80px] sm:blur-[100px] pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* High-Impact Headline with Kinetic Rolling */}
        <div className="relative w-full max-w-4xl z-10 flex flex-col items-center">
          <h1 className="tracking-tight text-balance relative z-10 mb-3 flex flex-col items-center w-full">
            <span className="hero-headline-black-gradient relative max-w-fit group cursor-default whitespace-nowrap font-black text-[clamp(1.65rem,6.8vw,4.25rem)] leading-tight sm:leading-none py-1.5 px-1">
              Civic crisis response?
            </span>
            <span className="block mt-2 sm:mt-3 text-xl sm:text-3xl md:text-5xl font-semibold leading-[1.2] w-full">
              <KineticRollingHeadline />
            </span>
          </h1>

          {/* Minimal Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-[var(--text-muted)] max-w-2xl leading-relaxed mb-8 font-normal">
            Closed-loop intelligence bridging citizens, emergency responders, and municipal logistics across urban flood and drought extremes.
          </p>
        </div>

        {/* Dynamic Typewriter Search Bar (Ctrl+K) */}
        <div className="relative group w-full max-w-xl mb-8 z-10">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-1.5 shadow-md focus-within:border-[var(--color-brand-accent)] focus-within:ring-2 focus-within:ring-[var(--color-brand-accent)]/20 transition-all">
            <Search className="h-4.5 w-4.5 text-[var(--text-muted)] ml-3 shrink-0" />
            <input
              ref={heroSearchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={query ? '' : typewriterText}
              className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded mr-2 shrink-0">
              Ctrl K
            </kbd>
            <button
              type="submit"
              className="px-3.5 py-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Explore</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
          <Link
            to={user ? "/" : "/login"}
            onClick={() => playClick()}
            className="px-5 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs sm:text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <MapPin className="h-4 w-4" />
            <span>{user ? "Open Operations Map" : "Launch Grid"}</span>
          </Link>
          <Link
            to={user ? "/routes/best" : "/login"}
            onClick={() => playClick()}
            className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-[var(--bg-main)] transition-colors shadow-2xs cursor-pointer"
          >
            <RouteIcon className="h-4 w-4 text-[var(--color-brand-accent)]" />
            <span>{user ? "Safe Routes" : "Access Safe Routes"}</span>
          </Link>
        </div>

        {/* Hero 4-Stat Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full max-w-4xl mx-auto">
          {COVERAGE_STATS.map((stat, i) => (
            <div key={i} className="neo-glass-card p-4 rounded-2xl border border-[var(--border-color)] text-left flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider block mb-1">
                {stat.label}
              </span>
              <div className="text-sm sm:text-base font-extrabold text-[var(--text-main)] tracking-tight">
                {stat.value}
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 block">
                {stat.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION: THE DOAB 4-STAGE LOOP ── */}
      <section id="loop" className="py-14 px-4 sm:px-6 max-w-[1200px] mx-auto border-t border-[var(--border-color)]">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-mono font-bold text-[var(--text-muted)] mb-2">
            <span>Operating Framework</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            How DOAB Runs the Crisis Loop
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5">
            A closed-loop civic intelligence engine transforming sensor telemetry into life-safety routing and verified work orders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {DOAB_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs hover:border-[var(--text-main)]/30 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--color-brand-accent)]">
                      {step.n}. {step.phase}
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3.5">
                    {step.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-color)] flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--text-main)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
                  <span className="truncate">{step.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION: CLIMATE MODES COMPARISON ── */}
      <section id="modes" className="py-14 px-4 sm:px-6 max-w-[1200px] mx-auto border-t border-[var(--border-color)]">
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-mono font-bold text-[var(--text-muted)] mb-2">
            <span>Dual Crisis Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            One Grid. Two Climate Realities.
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5">
            DOAB dynamically adapts its palette and operational priorities depending on whether cities are fighting monsoon flooding or severe drought.
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xs">
            <button
              type="button"
              onClick={() => { playClick(); setSelectedModeTab('flood'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedModeTab === 'flood'
                  ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Droplets className="h-3.5 w-3.5" />
              <span>Monsoon (Flood)</span>
            </button>
            <button
              type="button"
              onClick={() => { playClick(); setSelectedModeTab('drought'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedModeTab === 'drought'
                  ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Scarcity (Drought)</span>
            </button>
          </div>
        </div>

        {/* Mode Details Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {selectedModeTab === 'flood' ? (
            <>
              <div className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Live Telemetry</span>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mt-1 mb-1.5">Waterlogging Hexes</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Real-time ultrasonic sensors measure water depth (cm) and rainfall intensity (mm/h) to flag impassable road segments.
                  </p>
                </div>
              </div>
              <div className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Rider Protection</span>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mt-1 mb-1.5">Submerged Rerouting</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Avoids submerged low-lying junctions (e.g. MG Road, Harmu River) by providing turn-by-turn bypass corridors.
                  </p>
                </div>
              </div>
              <div className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Civic Dispatch</span>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mt-1 mb-1.5">Plumber Bounties (₹5k)</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Instant work order disbursement for drain de-choking, heavy water pump deployment, and municipal sluice clearing.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Live Telemetry</span>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mt-1 mb-1.5">Groundwater Deficits</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Monitors underground aquifer levels, soil moisture depletion, and ward-by-ward dry tap reports.
                  </p>
                </div>
              </div>
              <div className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Citizen Advisory</span>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mt-1 mb-1.5">Heatwave Advisories</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Real-time thermal stress index, shaded rest zones for outdoor delivery riders, and public hydration kiosks.
                  </p>
                </div>
              </div>
              <div className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Civic Dispatch</span>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mt-1 mb-1.5">Tanker Logistics Dispatch</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Coordinates emergency potable water tanker units to high-stress wards with GPS delivery verification.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── SECTION: LIVE INCIDENTS PREVIEW ── */}
      <section id="telemetry" className="py-14 px-4 sm:px-6 max-w-[1200px] mx-auto border-t border-[var(--border-color)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-mono font-bold text-[var(--text-muted)] mb-2">
              <span>Ranchi Ward Incidents</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Active Sensor Incidents Preview
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Sample factor-grounded telemetry points currently plotted on the DOAB map.
            </p>
          </div>

          <Link
            to={user ? "/" : "/login"}
            onClick={() => playClick()}
            className="self-start md:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)] hover:underline"
          >
            <span>View Full Interactive Map</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {CIVIC_INCIDENTS.slice(0, 3).map((incident) => (
            <div key={incident.id} className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">
                    {incident.ward}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {incident.updatedTime}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[var(--text-main)] mb-1">
                  {incident.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3.5 line-clamp-2">
                  {incident.description}
                </p>

                {/* Telemetry Factors */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-center text-xs mb-4">
                  {incident.envType === 'flood' ? (
                    <>
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] block">Depth</span>
                        <span className="font-mono font-bold text-[var(--text-main)]">{incident.waterDepthCm} cm</span>
                      </div>
                      <div className="border-x border-[var(--border-color)]">
                        <span className="text-[9px] font-mono text-[var(--text-muted)] block">Rain Rate</span>
                        <span className="font-mono font-bold text-[var(--text-main)]">{incident.rainfallMmH} mm/h</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] block">Blockage</span>
                        <span className="font-mono font-bold text-[var(--text-main)]">{incident.drainageBlockagePct}%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] block">Deficit</span>
                        <span className="font-mono font-bold text-[var(--text-main)]">{incident.groundwaterDeficitMeters}m</span>
                      </div>
                      <div className="border-x border-[var(--border-color)]">
                        <span className="text-[9px] font-mono text-[var(--text-muted)] block">Tanker Need</span>
                        <span className="font-mono font-bold text-[var(--text-main)]">{incident.tankerDeficitLiters}L</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] block">Verified</span>
                        <span className="font-mono font-bold text-[var(--text-main)]">{incident.verifiedCount}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Link
                to={user ? `/?search=${encodeURIComponent(incident.title)}` : "/login"}
                onClick={() => playClick()}
                className="w-full py-2 rounded-xl bg-[var(--bg-main)] hover:bg-[var(--text-main)]/5 border border-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Inspect in Live Grid</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION: FREQUENTLY ASKED QUESTIONS ── */}
      <section id="faq" className="py-14 px-4 sm:px-6 max-w-[900px] mx-auto border-t border-[var(--border-color)]">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-mono font-bold text-[var(--text-muted)] mb-2">
            <span>System FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
          {FAQS.map((faq, i) => {
            const isOpen = expandedFaq === i;
            return (
              <div key={i} className="neo-glass-card rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-2xs w-full">
                <button
                  type="button"
                  onClick={() => { playClick(); setExpandedFaq(isOpen ? null : i); }}
                  className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-[var(--text-main)] flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--text-main)]/5 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="px-4 sm:px-5 pb-4 text-xs text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-color)] bg-[var(--bg-main)]/50 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-[var(--border-color)] bg-[var(--bg-card)]/90 pt-8 pb-10 px-4 sm:px-6">
        {/* Absolute Centered Top-Border Scroll-to-Top Button */}
        <button 
          type="button" 
          onClick={() => {
            playClick();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          className="footer-scroll-top group"
          aria-label="Scroll to Top"
          title="Scroll to Top"
        >
          <ArrowUp className="h-4 w-4 stroke-[2.2] transition-transform duration-300 group-hover:-translate-y-0.5" />
        </button>

        <div className="max-w-[1200px] mx-auto flex flex-col items-center">
          
          {/* Ambient Interactive Particle Canvas */}
          <div className="w-full max-w-2xl mx-auto mb-6">
            <FooterParticles text="DOAB" darkMode={isDarkMode} />
          </div>

          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-5 pt-6 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <div className="text-left">
                <div className="font-bold text-xs text-[var(--text-main)]">DOAB</div>
                <div className="text-[10px] font-mono text-[var(--text-muted)]">Detect. Order. Alert. Back-check.</div>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs text-[var(--text-muted)] font-medium">
              <Link to={user ? "/" : "/login"} onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Operations Grid</Link>
              <Link to={user ? "/routes/best" : "/login"} onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Safe Routes</Link>
              <Link to={user ? "/notifications" : "/login"} onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Alerts</Link>
              <Link to={user ? "/profile" : "/login"} onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Entity Profile</Link>
            </div>

            <div className="text-[10px] font-mono text-[var(--text-muted)]">
              DOAB • Civic Life-Safety & Dispatch Infrastructure
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
