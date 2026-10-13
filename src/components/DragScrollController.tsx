import React, { useState, useEffect, useRef } from 'react';
import { playClick } from '../utils/soundFx';
import ProgressRing from './ProgressRing';

/**
 * DragScrollController
 * Full reproduction of the Portfolio's signature Draggable Scroll System from SAHNIRMAAN:
 * - Diagonal -45deg drag track
 * - Tactile drag-to-rotate inertia physics loop (0.14 damping factor)
 * - Bidirectional Scroll-to-Top <-> Scroll-to-Bottom mode toggle on drag snap
 * - Reversible endpoint target with magnetic snap (>75%)
 * - Auto-reset to top mode on reaching page bottom
 * - Pure luxury monochrome obsidian & porcelain theme
 */
export default function DragScrollController() {
  const [scrollMode, setScrollMode] = useState<'top' | 'bottom'>('bottom');
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isSnapConfirm, setIsSnapConfirm] = useState(false);
  const [showDot, setShowDot] = useState(false);
  const [showTooltipOnMobile, setShowTooltipOnMobile] = useState(false);

  const btnRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const dragRingRef = useRef<{ setProgress: (value: number) => void } | null>(null);

  // Physics state refs to prevent re-render overhead during high-frequency drag ticks
  const stateRef = useRef({
    isDragging: false,
    isAnimating: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    maxDragDistance: 136,
    scrollMode: 'bottom' as 'top' | 'bottom'
  });

  stateRef.current.scrollMode = scrollMode;

  const updateRing = () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const max = docHeight - winHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const targetProgress = stateRef.current.scrollMode === 'top' ? progress : 1 - progress;
    dragRingRef.current?.setProgress(targetProgress);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (stateRef.current.isDragging || stateRef.current.isAnimating) return;

      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const isNearBottom = winHeight + scrollY >= docHeight - 180;

      if (stateRef.current.scrollMode === 'bottom' && isNearBottom) {
        setScrollMode('top');
      }

      let shouldShow = false;
      if (stateRef.current.scrollMode === 'top') {
        shouldShow = scrollY > 300 && !isNearBottom;
      } else {
        shouldShow = scrollY > 300 && scrollY < (docHeight - winHeight - 300);
      }

      setIsVisible(shouldShow);
      updateRing();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    updateRing();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getMaxDrag = () => {
    if (window.innerWidth <= 768) return 104;
    if (window.innerWidth <= 1024) return 120;
    return 136;
  };

  const stopPhysicsLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const tickPhysics = () => {
    const s = stateRef.current;
    const btn = btnRef.current;
    if (!btn) return;

    const dx = s.targetX - s.currentX;
    const dy = s.targetY - s.currentY;

    // Smooth damping catch-up (0.14 factor for fluid inertia)
    s.currentX += dx * 0.14;
    s.currentY += dy * 0.14;

    btn.style.transform = `translate(${s.currentX}px, ${s.currentY}px)`;

    // If returning back and close to 0, stop loop
    if (s.isAnimating && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      s.currentX = 0;
      s.currentY = 0;
      s.targetX = 0;
      s.targetY = 0;
      btn.style.transform = 'translate(0px, 0px)';
      s.isAnimating = false;
      setIsDragging(false);
      stopPhysicsLoop();
      return;
    }

    if (s.isDragging || s.isAnimating) {
      animFrameRef.current = requestAnimationFrame(tickPhysics);
    } else {
      stopPhysicsLoop();
    }
  };

  const startPhysicsLoop = () => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(tickPhysics);
    }
  };

  const handlePointerStart = (e: React.MouseEvent | React.TouchEvent) => {
    const s = stateRef.current;
    if (s.isAnimating) return;

    setShowTooltipOnMobile(false);
    s.maxDragDistance = getMaxDrag();

    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
    s.startX = pageX;
    s.startY = pageY;
    s.isDragging = false;
    s.currentX = 0;
    s.currentY = 0;
    s.targetX = 0;
    s.targetY = 0;

    const onPointerMove = (moveEvent: any) => {
      const pX = moveEvent.touches ? moveEvent.touches[0].pageX : moveEvent.pageX;
      const pY = moveEvent.touches ? moveEvent.touches[0].pageY : moveEvent.pageY;
      const diffX = pX - s.startX;
      const diffY = pY - s.startY;

      if (!s.isDragging && (Math.abs(diffX) > 5 || Math.abs(diffY) > 5)) {
        s.isDragging = true;
        setIsDragging(true);
        startPhysicsLoop();
      }

      if (s.isDragging) {
        if (moveEvent.cancelable) moveEvent.preventDefault();

        // Project cursor movement onto diagonal vector (-0.7071, -0.7071)
        let dragDistance = -0.7071 * (diffX + diffY);

        // Magnetic snap if past 75%
        if (dragDistance > s.maxDragDistance * 0.75) {
          dragDistance = s.maxDragDistance;
        } else {
          dragDistance = Math.max(0, dragDistance);
        }

        s.targetX = dragDistance * -0.7071;
        s.targetY = dragDistance * -0.7071;

        const progress = dragDistance / s.maxDragDistance;
        setIsHighlighted(progress > 0.5);
      }
    };

    const onPointerEnd = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerEnd);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerEnd);
      window.removeEventListener('touchcancel', onPointerEnd);

      if (s.isDragging) {
        s.isAnimating = true;
        setIsHighlighted(false);

        const dragDist = s.targetX / -0.7071;
        const progress = dragDist / s.maxDragDistance;

        if (progress > 0.5) {
          const nextMode: 'top' | 'bottom' = s.scrollMode === 'top' ? 'bottom' : 'top';
          s.scrollMode = nextMode;
          setScrollMode(nextMode);
          setIsSnapConfirm(true);
          setShowDot(true);
          playClick();
          updateRing();
          setTimeout(() => setIsSnapConfirm(false), 400);
          setTimeout(() => setShowDot(false), 800);
        }

        s.targetX = 0;
        s.targetY = 0;
      } else {
        // Normal click execution
        playClick();
        if (s.scrollMode === 'top') {
          if ((window as any).lenis) {
            (window as any).lenis.scrollTo(0);
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          const targetY = document.documentElement.scrollHeight;
          if ((window as any).lenis) {
            (window as any).lenis.scrollTo(targetY);
          } else {
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }

        if (window.matchMedia('(pointer: coarse)').matches) {
          setShowTooltipOnMobile(true);
          setTimeout(() => setShowTooltipOnMobile(false), 3500);
        }
      }

      s.isDragging = false;
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerEnd);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerEnd);
    window.addEventListener('touchcancel', onPointerEnd);
  };

  return (
    <>
      {/* Diagonal Drag Track */}
      <div
        ref={trackRef}
        aria-hidden="true"
        className={`fixed bottom-6 right-6 w-11 h-[180px] rounded-full z-[998] transition-all duration-350 pointer-events-none flex flex-col justify-between items-center py-2 select-none bg-white/85 dark:bg-[#0f0f14]/85 border border-slate-300/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl ${
          isDragging
            ? 'opacity-100 scale-100 border-amber-600/80 dark:border-amber-400/80 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.35)]'
            : 'opacity-0 scale-95 translateY-2.5'
        }`}
        style={{
          transformOrigin: 'center calc(100% - 22px)',
          transform: isDragging ? 'rotate(-45deg) translateY(0) scale(1)' : 'rotate(-45deg) translateY(10px) scale(0.95)'
        }}
      >
        {/* Top Endpoint Target */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            isHighlighted
              ? 'bg-amber-600 dark:bg-amber-400 text-white dark:text-slate-950 scale-115 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'text-slate-400 dark:text-slate-500'
          }`}
          title="Drag here to reverse scroll direction"
        >
          <svg
            className="w-3.5 h-3.5 transition-transform duration-300"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: scrollMode === 'top' ? 'rotate(225deg)' : 'rotate(45deg)'
            }}
          >
            <path d="M12 8L16 14H8L12 8Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
            <circle cx="12" cy="5" r="1.5" className="fill-amber-600 dark:fill-amber-400" />
          </svg>
        </div>

        {/* Center Track Indicator */}
        <div className={`transition-all duration-200 ${isHighlighted ? 'text-amber-600 dark:text-amber-400 scale-110 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]' : 'text-slate-400 dark:text-slate-600'}`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>

        {/* Spacer */}
        <div className="w-7 h-7" />
      </div>

      {/* Main Interactive Drag Button */}
      <div
        ref={btnRef}
        role="button"
        tabIndex={0}
        aria-label={scrollMode === 'bottom' ? 'Scroll to bottom (drag diagonally to flip)' : 'Scroll to top (drag diagonally to flip)'}
        onMouseDown={handlePointerStart}
        onTouchStart={handlePointerStart}
        className={`group fixed bottom-6 right-6 z-[999] w-11 h-11 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-[opacity,background-color] duration-300 bg-white/90 dark:bg-[#141418]/90 border border-slate-300 dark:border-white/20 shadow-lg backdrop-blur-md text-slate-950 dark:text-white ${
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${
          isDragging ? 'shadow-[0_0_20px_rgba(245,158,11,0.4)] border-amber-600 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-400/15' : ''
        } ${
          isSnapConfirm ? 'scale-120 transition-transform duration-300 shadow-[0_0_24px_8px_rgba(245,158,11,0.55)]' : ''
        }`}
      >
        <ProgressRing
          ref={dragRingRef}
          size={50}
          strokeWidth={1.75}
          className={`absolute -inset-[3px] transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Tooltip Card */}
        <div
          className={`absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-white/95 dark:bg-[#141418]/95 border border-slate-300/80 dark:border-white/15 shadow-xl backdrop-blur-md rounded-lg px-3 py-1.5 whitespace-nowrap text-right flex flex-col gap-0.5 pointer-events-none transition-all duration-250 ${
            isDragging
              ? 'opacity-0 translate-x-2'
              : (showTooltipOnMobile ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0')
          }`}
        >
          <span className="text-[11px] font-bold text-slate-950 dark:text-white tracking-wide uppercase font-mono">
            {scrollMode === 'bottom' ? 'Scroll to Bottom' : 'Scroll to Top'}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-sans flex items-center justify-end gap-1">
            (Drag-Diagonally)
            <svg className="w-3 h-2.5 stroke-current transition-transform duration-400 group-hover:rotate-180" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 4 9 C 6 4, 18 4, 20 9" />
              <path d="M 16 9 h 4 v -4" />
              <path d="M 20 15 C 18 20, 6 20, 4 15" />
              <path d="M 8 15 h -4 v 4" />
            </svg>
          </span>
        </div>

        {/* Triangle Arc Reactor SVG with Golden Glow Dot */}
        <svg
          className="w-4 h-4 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: isDragging
              ? 'rotate(-45deg)'
              : (scrollMode === 'bottom' ? 'rotate(180deg)' : 'rotate(0deg)')
          }}
        >
          <path d="M12 7.5L18.5 17H5.5L12 7.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          <circle 
            cx="12" 
            cy="3.5" 
            r="2" 
            className={`fill-amber-600 dark:fill-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] transition-all duration-300 ${
              isDragging || showDot ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`} 
          />
        </svg>
      </div>
    </>
  );
}
