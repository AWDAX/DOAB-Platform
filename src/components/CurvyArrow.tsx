import { useEffect, useRef, useState } from 'react';

interface CurvyArrowProps {
  direction?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  label?: string;
  hoverOnly?: boolean;
  active?: boolean;
  visible?: boolean;
  revealDuration?: number;
}

export default function CurvyArrow({ 
  direction = 'top-left',
  className = '',
  label = '',
  hoverOnly = false,
  active = false,
  visible,
  revealDuration = 1000
}: CurvyArrowProps) {
  const [inView, setInView] = useState(false);
  const arrowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hoverOnly) return;
    if (visible !== undefined) return;
    const el = arrowRef.current?.parentElement || arrowRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hoverOnly, visible]);

  const isVisible = visible !== undefined
    ? visible
    : active || (hoverOnly ? false : inView);

  const getDirectionTransform = () => {
    switch (direction) {
      case 'top-right':
        return 'scaleX(-1) rotate(2deg)';
      case 'bottom-left':
        return 'scaleY(-1) rotate(-2deg)';
      case 'bottom-right':
        return 'scale(-1) rotate(2deg)';
      default:
        return 'rotate(-2deg)';
    }
  };

  return (
    <span 
      ref={arrowRef}
      style={{ transitionDuration: `${revealDuration}ms` }}
      className={`absolute hidden sm:inline-flex flex-col items-center select-none pointer-events-none text-[var(--text-main)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] z-20 ${
        hoverOnly 
          ? 'opacity-0 group-hover:opacity-100' 
          : (isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none')
      } ${className}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes seamlessDashMarch {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -24;
          }
        }

        @keyframes arrowheadPopIn {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          60% {
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .arrow-flowing-trail {
          stroke-dasharray: 6 6;
          animation: seamlessDashMarch 1.4s linear infinite;
        }

        .arrowhead-pulsing {
          transform-origin: 32px 58px;
          animation: arrowheadPopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Hand-drawn badge label */}
      {label && (
        <span 
          style={{ transform: getDirectionTransform() }}
          className="text-[11px] font-mono tracking-wider font-semibold whitespace-nowrap px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]/90 backdrop-blur-md text-[var(--text-main)] shadow-xs mb-1.5"
        >
          {label}
        </span>
      )}

      {/* SVG Hand-Drawn Flowing Curvy Arrow */}
      <svg
        width="46"
        height="64"
        viewBox="0 0 46 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: getDirectionTransform() }}
        className="overflow-visible"
      >
        <path
          d="M6 4C6 4 14 18 22 28C30 38 34 46 32 56"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="arrow-flowing-trail opacity-80"
        />
        <path
          d="M26 48L32 58L38 46"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="arrowhead-pulsing"
        />
      </svg>
    </span>
  );
}
