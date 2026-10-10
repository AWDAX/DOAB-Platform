import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users2, 
  ArrowUpRight, 
  X,
  ArrowLeft,
  Route as RouteIcon,
  ShieldCheck,
  Radio,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { TEAM_MEMBERS, PLATFORM_STATS, CORE_PILLARS, type TeamMember } from '../data/team';
import { playClick } from '../utils/soundFx';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';
import EnvToggle from '../components/EnvToggle';
import Tooltip from '../components/Tooltip';
import FooterParticles from '../components/FooterParticles';

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

interface TeamPageProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  envMode: 'flood' | 'drought';
  toggleEnvMode: () => void;
}

export default function TeamPage({ isDarkMode, toggleTheme, envMode, toggleEnvMode }: TeamPageProps) {
  const navigate = useNavigate();
  const [lightboxMember, setLightboxMember] = useState<TeamMember | null>(null);
  const [lightboxTilt, setLightboxTilt] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;
      setScrolled(scrollPos > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxMember) {
      setLightboxTilt({ x: 0, y: 0 });
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClick();
        setLightboxMember(null);
        setLightboxTilt({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
        if (idx !== -1) {
          playClick();
          setLightboxMember(TEAM_MEMBERS[(idx - 1 + TEAM_MEMBERS.length) % TEAM_MEMBERS.length]);
          setLightboxTilt({ x: 0, y: 0 });
        }
      } else if (e.key === 'ArrowRight') {
        const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
        if (idx !== -1) {
          playClick();
          setLightboxMember(TEAM_MEMBERS[(idx + 1) % TEAM_MEMBERS.length]);
          setLightboxTilt({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxMember]);

  const handleLightboxMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setLightboxTilt({
      x: Math.max(-1, Math.min(1, x)) * 10,
      y: Math.max(-1, Math.min(1, y)) * -10,
    });
  };

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    if (!lightboxMember || !e.changedTouches || !e.changedTouches[0]) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 60) {
      const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
      if (idx !== -1) {
        playClick();
        if (deltaX < 0) {
          setLightboxMember(TEAM_MEMBERS[(idx + 1) % TEAM_MEMBERS.length]);
        } else {
          setLightboxMember(TEAM_MEMBERS[(idx - 1 + TEAM_MEMBERS.length) % TEAM_MEMBERS.length]);
        }
        setLightboxTilt({ x: 0, y: 0 });
      }
    }
  };

  const handleBack = () => {
    playClick();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 relative bg-[var(--bg-main)] text-[var(--text-main)] overflow-x-clip selection:bg-[var(--color-brand-accent)] selection:text-white">
      {/* Monumental Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden">
        <span className="text-[18vw] font-black tracking-tighter text-[var(--text-main)]/[0.03] leading-none font-mono">
          DOAB CREW
        </span>
      </div>

      {/* Floating Morphing Header Bar */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled 
          ? 'py-2.5 bg-[var(--bg-card)]/90 backdrop-blur-xl border-b border-[var(--border-color)] shadow-sm' 
          : 'py-4 bg-transparent border-b border-transparent'
      }`}>
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] shadow-2xs hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

          <Link to="/" onClick={() => playClick()} className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <span className="font-bold text-sm tracking-tight text-[var(--text-main)]">DOAB</span>
          </Link>

          <div className="flex items-center gap-2">
            <Tooltip content={envMode === 'flood' ? "Drought" : "Flood"} shortcut="Shift+E" position="bottom">
              <EnvToggle envMode={envMode} toggleEnvMode={toggleEnvMode} />
            </Tooltip>

            <Tooltip content={isDarkMode ? "Light" : "Dark"} shortcut="Shift+T" position="bottom">
              <ThemeToggle darkMode={isDarkMode} toggleTheme={toggleTheme} />
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 pt-10 pb-16 relative z-10 flex flex-col items-center">
        <div id="tour-team-header" className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-mono font-bold text-[var(--text-muted)] mb-3 shadow-2xs">
            <Users2 className="h-3.5 w-3.5 text-[var(--color-brand-accent)]" />
            <span>Team Contrarians · Architects & Engineering</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)] mb-3">
            The Team Behind DOAB
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-lg mx-auto">
            Building life-safety civic infrastructure, predictive hydrological telemetry, and decentralized emergency dispatch routing for Indian cities.
          </p>
        </div>

        {/* Team Members Grid */}
        <div id="tour-team-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-6xl mx-auto mb-16">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.id}
              onClick={() => { playClick(); setLightboxMember(member); }}
              className="neo-glass-card rounded-2xl border border-[var(--border-color)] p-5 flex flex-col justify-between cursor-pointer group hover:border-[var(--text-main)]/40 hover:-translate-y-1 transition-all duration-200 shadow-2xs"
            >
              <div>
                {/* Avatar & Role Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="relative">
                    <img
                      src={member.avatar || member.fallbackAvatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-2xl object-cover border border-[var(--border-color)] bg-[var(--bg-main)] shadow-2xs group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = member.fallbackAvatar;
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">
                    {member.role}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-[var(--text-main)] tracking-tight group-hover:text-[var(--color-brand-accent)] transition-colors">
                  {member.name}
                </h3>
                <div className="text-xs font-semibold text-[var(--color-brand-accent)] mt-0.5">
                  {member.title}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1 mb-3">
                  {member.domain}
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3 mb-4">
                  {member.bio}
                </p>
              </div>

              <div>
                {/* Skill Tags */}
                <div className="flex flex-wrap gap-1 mb-3.5 pt-3 border-t border-[var(--border-color)]">
                  {member.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-main)]">
                  <span>View Full Profile</span>
                  <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Facts Row */}
        <div id="tour-team-stats" className="w-full max-w-5xl mx-auto mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORM_STATS.map((stat, i) => (
              <div key={i} className="neo-glass-card p-5 rounded-2xl border border-[var(--border-color)] text-center shadow-2xs">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  {stat.label}
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
                  {stat.value}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                  {stat.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Pillars */}
        <div id="tour-team-pillars" className="w-full max-w-5xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
              Architectural Pillars
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CORE_PILLARS.map((pillar, idx) => (
              <div key={idx} className="neo-glass-card p-6 rounded-2xl border border-[var(--border-color)] shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="h-9 w-9 rounded-xl bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                    {idx === 0 ? <Radio className="h-4.5 w-4.5" /> : idx === 1 ? <RouteIcon className="h-4.5 w-4.5" /> : <ShieldCheck className="h-4.5 w-4.5" />}
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text-main)] mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Lightbox Member Modal */}
      {lightboxMember && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => { playClick(); setLightboxMember(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleLightboxMouseMove}
            onMouseLeave={() => setLightboxTilt({ x: 0, y: 0 })}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
            style={{
              transform: `perspective(1000px) rotateX(${lightboxTilt.y}deg) rotateY(${lightboxTilt.x}deg)`
            }}
            className="relative w-full max-w-md neo-glass-card rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden p-5 sm:p-7 flex flex-col transition-transform duration-150 max-h-[88dvh] overflow-y-auto"
          >
            {/* Header / Close */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--border-color)]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Team Member Profile
              </span>
              <button
                type="button"
                onClick={() => { playClick(); setLightboxMember(null); }}
                className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Member Details */}
            <div className="flex items-start gap-4 mb-4">
              <img
                src={lightboxMember.avatar || lightboxMember.fallbackAvatar}
                alt={lightboxMember.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl object-cover border border-[var(--border-color)] bg-[var(--bg-main)] shadow-sm shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = lightboxMember.fallbackAvatar;
                }}
              />
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)] inline-block mb-1">
                  {lightboxMember.role}
                </span>
                <h2 className="text-lg font-extrabold text-[var(--text-main)] tracking-tight">
                  {lightboxMember.name}
                </h2>
                <div className="text-xs font-semibold text-[var(--color-brand-accent)]">
                  {lightboxMember.title}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border-color)]">
              Domain: {lightboxMember.domain}
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              {lightboxMember.bio}
            </p>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {lightboxMember.tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)]">
                  {tag}
                </span>
              ))}
            </div>

            {/* Social Links & Nav Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                {lightboxMember.github && (
                  <a
                    href={lightboxMember.github}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
                  >
                    <GithubIcon className="h-4 w-4" />
                  </a>
                )}
                {lightboxMember.linkedin && (
                  <a
                    href={lightboxMember.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
                  >
                    <LinkedinIcon className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
                    if (idx !== -1) {
                      playClick();
                      setLightboxMember(TEAM_MEMBERS[(idx - 1 + TEAM_MEMBERS.length) % TEAM_MEMBERS.length]);
                    }
                  }}
                  className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                  title="Previous Member (Left Arrow)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
                    if (idx !== -1) {
                      playClick();
                      setLightboxMember(TEAM_MEMBERS[(idx + 1) % TEAM_MEMBERS.length]);
                    }
                  }}
                  className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                  title="Next Member (Right Arrow)"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer */}
      <footer className="relative border-t border-[var(--border-color)] bg-[var(--bg-card)]/90 pt-8 pb-10 px-4 sm:px-6">
        {/* Absolute Centered Top-Border Scroll-to-Top Button (SWATVA Standard) */}
        <button 
          type="button" 
          onClick={() => {
            playClick();
            window.dispatchEvent(new CustomEvent('doab-trigger-particle-dissolve'));
            setTimeout(() => {
              if ((window as any).lenis) {
                (window as any).lenis.scrollTo(0, { duration: 1.2 });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                document.body.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }, 320);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('doab-reset-particles'));
            }, 1600);
          }} 
          className="footer-scroll-top"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <img
            src="/cursors/scroll-up.svg"
            className="scroll-up-img pointer-events-none"
            alt="Scroll to top"
            width="17"
            height="17"
          />
        </button>

        <div className="max-w-[1400px] mx-auto flex flex-col items-center">
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
              <Link to="/" onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Operations Grid</Link>
              <Link to="/routes/best" onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Safe Routes</Link>
              <Link to="/notifications" onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Alerts</Link>
              <Link to="/team" onClick={() => playClick()} className="text-[var(--text-main)] font-bold">Team</Link>
              <Link to="/profile" onClick={() => playClick()} className="hover:text-[var(--text-main)] transition-colors">Entity Profile</Link>
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
