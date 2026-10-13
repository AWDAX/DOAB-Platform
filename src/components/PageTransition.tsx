import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * Resets window and document scroll position synchronously before paint.
 * DOAB zero-jerk standard.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const resetScroll = () => {
      if ((window as any).lenis) {
        (window as any).lenis.scrollTo(0, { immediate: true });
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const root = document.getElementById('root');
      if (root) root.scrollTop = 0;
      const main = document.querySelector('main');
      if (main) main.scrollTop = 0;
    };

    resetScroll();
    // Re-verify on next micro-tick and animation frame to counteract any browser scroll restoration
    requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 20);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

/**
 * PageTransition
 * High-performance, zero-jerk route transition using hardware-accelerated CSS.
 * Prevents layout collapses and height jumps that occur during exit animations.
 */
export default function PageTransition({ 
  children, 
  className = "w-full h-full flex-1 flex flex-col min-h-0" 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`route-transition ${className}`}>
      {children}
    </div>
  );
}
