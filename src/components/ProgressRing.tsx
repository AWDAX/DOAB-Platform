import { forwardRef, useImperativeHandle, useRef } from 'react';

/**
 * ProgressRing — minimal monochrome circular readout (obsidian & porcelain).
 * Track and progress arcs are pure slate/white neutrals so they always follow
 * the active theme. The ring exposes an imperative `setProgress(0..1)` via the
 * forwarded ref so the parent can drive it straight from a scroll handler
 * without re-rendering the React tree on every frame.
 */
const ProgressRing = forwardRef(function ProgressRing(
  { size = 44, strokeWidth = 1.75, className = '' }: { size?: number; strokeWidth?: number; className?: string; children?: React.ReactNode },
  ref: React.Ref<{ setProgress: (value: number) => void }>
) {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useImperativeHandle(ref, () => ({
    setProgress: (value: number) => {
      if (!circleRef.current || typeof value !== 'number') return;
      const p = Math.min(1, Math.max(0, value));
      circleRef.current.style.strokeDashoffset = String(circumference * (1 - p));
    },
  }));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none -rotate-90 ${className || ''}`}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-200/40 dark:text-white/[0.06]"
      />
      <circle
        ref={circleRef}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        className="text-slate-950 dark:text-white"
        style={{ transition: 'stroke-dashoffset 60ms linear' }}
      />
    </svg>
  );
});

export default ProgressRing;
