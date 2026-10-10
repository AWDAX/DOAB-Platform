import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import EnvToggle from './EnvToggle';

interface MinimalBrandHeaderProps {
  onBack?: () => void;
  backLabel?: string;
  brandLabel?: string;
  className?: string;
  isLoader?: boolean;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  envMode?: 'flood' | 'drought';
  toggleEnvMode?: () => void;
}

export default function MinimalBrandHeader({
  onBack,
  backLabel = 'Back to Home',
  brandLabel = 'DOAB',
  className = '',
  isLoader = false,
  isDarkMode: propDarkMode,
  toggleTheme: propToggleTheme,
  envMode: propEnvMode,
  toggleEnvMode: propToggleEnvMode,
}: MinimalBrandHeaderProps) {
  const navigate = useNavigate();

  // Internal state if not passed from parent
  const [internalDarkMode, setInternalDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });

  const [internalEnvMode, setInternalEnvMode] = useState<'flood' | 'drought'>(() => {
    return (localStorage.getItem('doab_env_mode') as 'flood' | 'drought') || 'flood';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setInternalDarkMode(document.documentElement.classList.contains('dark'));
      setInternalEnvMode(document.documentElement.classList.contains('theme-drought') ? 'drought' : 'flood');
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const activeDarkMode = propDarkMode !== undefined ? propDarkMode : internalDarkMode;
  const activeEnvMode = propEnvMode !== undefined ? propEnvMode : internalEnvMode;

  const handleToggleTheme = () => {
    if (propToggleTheme) {
      propToggleTheme();
    } else {
      const nextDark = !activeDarkMode;
      setInternalDarkMode(nextDark);
      if (nextDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  const handleToggleEnv = () => {
    if (propToggleEnvMode) {
      propToggleEnvMode();
    } else {
      const nextEnv = activeEnvMode === 'flood' ? 'drought' : 'flood';
      setInternalEnvMode(nextEnv);
      if (nextEnv === 'drought') {
        document.documentElement.classList.add('theme-drought');
        localStorage.setItem('doab_env_mode', 'drought');
      } else {
        document.documentElement.classList.remove('theme-drought');
        localStorage.setItem('doab_env_mode', 'flood');
      }
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-3.5 sm:px-8 md:px-12 py-3 sm:py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/80 dark:bg-[var(--bg-card)]/80 backdrop-blur-xl transition-all pt-[max(0.75rem,env(safe-area-inset-top))] ${className}`}
    >
      {/* Left: Back Button */}
      <div className="flex items-center z-10 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          className="my-0.5 ml-0.5 sm:ml-0 px-3.5 sm:px-4 py-1.5 min-h-[38px] sm:min-h-[40px] rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 bg-transparent border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] cursor-pointer shadow-xs active:scale-95 flex-shrink-0"
          title={backLabel}
          aria-label={backLabel}
        >
          <ArrowLeft size={14} className="flex-shrink-0" />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="inline sm:hidden">Back</span>
        </button>
      </div>

      {/* Center: Brand Mark */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-10">
        <Link
          to="/"
          className="pointer-events-auto flex items-center justify-center cursor-pointer group my-0.5"
          title={brandLabel}
          aria-label={brandLabel}
        >
          <div className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center flex-shrink-0">
            <BrandLogo size="md" isLoader={isLoader} animateOnHover />
          </div>
        </Link>
      </div>

      {/* Right: Environment & Theme Controls */}
      <div className="flex items-center gap-2 z-10 my-0.5 mr-0.5 sm:mr-0 flex-shrink-0">
        <EnvToggle envMode={activeEnvMode} toggleEnvMode={handleToggleEnv} />
        <ThemeToggle darkMode={activeDarkMode} toggleTheme={handleToggleTheme} />
      </div>
    </header>
  );
}
