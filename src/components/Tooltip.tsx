import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

/**
 * Portal-Backed Viewport-Clamped Monospace Tooltip
 * Renders into document.body at z-[99999] with strict pixel edge-clamping and auto-flipping,
 * ensuring tooltips NEVER overflow or cut off near screen edges or corners.
 */
export default function Tooltip({
  content,
  shortcut,
  position = 'bottom',
  children,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ 
    top: 0, 
    left: 0 
  });
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    
    // Viewport dimensions & boundary safety padding
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const PADDING = 10; // minimum margin from screen edges
    const gap = 7;

    // Get measured tooltip size from DOM node or fallback
    const tooltipWidth = tooltipRef.current?.offsetWidth || 95;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 24;

    let targetPos = position;

    // Auto-flip vertical if tight against viewport boundary
    if (targetPos === 'bottom' && rect.bottom + gap + tooltipHeight > viewportHeight - PADDING) {
      if (rect.top - gap - tooltipHeight >= PADDING) {
        targetPos = 'top';
      }
    } else if (targetPos === 'top' && rect.top - gap - tooltipHeight < PADDING) {
      if (rect.bottom + gap + tooltipHeight <= viewportHeight - PADDING) {
        targetPos = 'bottom';
      }
    }

    // Auto-flip horizontal if tight against viewport boundary
    if (targetPos === 'right' && rect.right + gap + tooltipWidth > viewportWidth - PADDING) {
      if (rect.left - gap - tooltipWidth >= PADDING) {
        targetPos = 'left';
      }
    } else if (targetPos === 'left' && rect.left - gap - tooltipWidth < PADDING) {
      if (rect.right + gap + tooltipWidth <= viewportWidth - PADDING) {
        targetPos = 'right';
      }
    }

    let top = 0;
    let left = 0;

    switch (targetPos) {
      case 'top':
        top = rect.top - gap - tooltipHeight;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;

      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;

      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - gap - tooltipWidth;
        break;

      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
    }

    // STRICT SCREEN CLAMPING: Tooltip will NEVER overflow left, right, top, or bottom
    const clampedTop = Math.max(PADDING, Math.min(top, viewportHeight - PADDING - tooltipHeight));
    const clampedLeft = Math.max(PADDING, Math.min(left, viewportWidth - PADDING - tooltipWidth));

    setCoords({ top: clampedTop, left: clampedLeft });
  }, [position]);

  const handleMouseEnter = () => {
    calculatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleFocus = () => {
    calculatePosition();
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  // Re-calculate accurately once tooltip DOM node renders to account for exact rendered width
  useLayoutEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center justify-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isVisible && (
            <div
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
                pointerEvents: 'none',
              }}
              className="select-none pointer-events-none"
            >
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, scale: 0.92, y: position === 'top' ? 2 : -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: position === 'top' ? 2 : -2 }}
                transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-[10px] font-mono uppercase font-bold tracking-tight border border-white/20 dark:border-black/20 shadow-xl backdrop-blur-md whitespace-nowrap">
                  <span>{content}</span>
                  {shortcut && (
                    <kbd className="shrink-0 px-1 py-0.2 rounded bg-white/20 dark:bg-black/15 text-[8.5px] font-mono font-bold border border-white/20 dark:border-black/20">
                      {shortcut}
                    </kbd>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
