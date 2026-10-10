import { useState, useEffect } from 'react';
import { DOABLogoMark } from './BrandLogo';

// In-memory flag that resets on every page load/reload,
// but stays true during client-side SPA navigation
export let isInitialSplashFinished = false;

export default function SplashLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const hasVisited = typeof window !== 'undefined' && sessionStorage.getItem('doab_has_visited');
    const returning = Boolean(hasVisited);
    setIsReturning(returning);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('doab_has_visited', 'true');
    }

    // Returning user: fast (850ms) yet silky smooth
    // First-time visit: majestic standard (1600ms)
    const drawDuration = returning ? 850 : 1600;
    const fadeDuration = returning ? 450 : 550;

    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
      isInitialSplashFinished = true;
    }, drawDuration);

    const unmountTimer = setTimeout(() => {
      setIsVisible(false);
    }, drawDuration + fadeDuration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-main)]/95 backdrop-blur-xl transition-all ${
        isReturning ? 'duration-500' : 'duration-600'
      } ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut 
          ? 'opacity-0 scale-[1.02] pointer-events-none' 
          : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Subtle radial ambient aura for luxurious depth */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -m-10 rounded-full bg-sky-500/15 blur-3xl pointer-events-none"
        />

        <div className="relative h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center">
          <DOABLogoMark 
            className="w-full h-full drop-shadow-[0_8px_24px_rgba(2,132,199,0.25)]" 
            isAnimating={true}
            duration={isReturning ? 0.85 : 1.6}
          />
        </div>

        <div 
          className="mt-6 text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-[var(--text-main)]/90 transition-all duration-500"
          style={{ 
            opacity: isFadingOut ? 0 : 1,
            transform: isFadingOut ? 'translateY(6px)' : 'translateY(0)'
          }}
        >
          DOAB
        </div>
      </div>
    </div>
  );
}
