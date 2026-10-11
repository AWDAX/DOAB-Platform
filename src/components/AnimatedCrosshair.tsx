/**
 * AnimatedCrosshair
 * Precision HUD-inspired animated SVG crosshair icon for maps, GPS tracking, and spatial targeting.
 * 
 * Features:
 * - Ultra-crisp 24x24 vector reticle geometry compatible with Lucide icon metrics
 * - Smooth CSS keyframe-based GPU-accelerated micro-animations
 * - Dynamic GPS tracking states:
 *   - `locating`: continuous radar scanning rotation + sonar pulse waves + optical focus breathing
 *   - `active` (locked): steady reticle lock with pulsing center beacon and outer lock brackets
 *   - `idle`: minimalist, elegant crosshair with interactive hover snap and micro-rotations
 * - Theme-aware via `currentColor` and full support for Tailwind color classes
 * - Respects `prefers-reduced-motion`
 *
 * @param {Object} props
 * @param {number} [props.size=16] - Icon dimension in pixels
 * @param {boolean} [props.locating=false] - Whether GPS is actively acquiring / locating
 * @param {boolean} [props.active=false] - Whether map is actively locked to current GPS position
 * @param {number} [props.strokeWidth=1.75] - Base stroke thickness
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.colorClass=''] - Specific stroke/fill color classes
 */
interface AnimatedCrosshairProps {
  size?: number;
  locating?: boolean;
  active?: boolean;
  strokeWidth?: number;
  className?: string;
  colorClass?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export default function AnimatedCrosshair({
  size = 16,
  locating = false,
  active = false,
  strokeWidth = 1.75,
  className = '',
  colorClass = '',
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel
}: AnimatedCrosshairProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`crosshair-svg-root select-none overflow-visible inline-block transition-transform duration-300 ${locating ? 'crosshair-locating' : ''} ${active ? 'crosshair-active' : ''} ${className}`}
      aria-hidden={ariaLabel ? undefined : ariaHidden}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <style>{`
        @keyframes crosshair-spin-radar {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes crosshair-ping-wave {
          0% {
            r: 2px;
            opacity: 0.95;
            stroke-width: 1.6px;
          }
          50% {
            opacity: 0.55;
          }
          100% {
            r: 9.5px;
            opacity: 0;
            stroke-width: 0.6px;
          }
        }
        @keyframes crosshair-focus-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.12);
            opacity: 1;
          }
        }
        @keyframes crosshair-center-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.35);
            opacity: 0.85;
          }
        }
        @keyframes crosshair-reticle-recoil {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.92);
          }
        }

        .crosshair-svg-root {
          transform-origin: 12px 12px;
        }

        .crosshair-outer-ring {
          transform-origin: 12px 12px;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        }

        .crosshair-inner-ring {
          transform-origin: 12px 12px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .crosshair-ticks {
          transform-origin: 12px 12px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .crosshair-center-dot {
          transform-origin: 12px 12px;
          transition: transform 0.2s ease;
        }

        /* Hover interaction when inside button or parent group */
        button:hover .crosshair-outer-ring,
        .group:hover .crosshair-outer-ring,
        .crosshair-svg-root:hover .crosshair-outer-ring {
          transform: rotate(45deg);
        }

        button:hover .crosshair-inner-ring,
        .group:hover .crosshair-inner-ring,
        .crosshair-svg-root:hover .crosshair-inner-ring {
          transform: scale(0.95);
        }

        button:active .crosshair-svg-root,
        .crosshair-svg-root:active {
          transform: scale(0.9);
        }

        /* Active GPS Locating State */
        .crosshair-locating .crosshair-outer-ring {
          animation: crosshair-spin-radar 2.4s linear infinite;
        }

        .crosshair-locating .crosshair-inner-ring {
          animation: crosshair-focus-breathe 1.8s ease-in-out infinite;
        }

        .crosshair-locating .crosshair-ticks {
          animation: crosshair-reticle-recoil 1.8s ease-in-out infinite;
        }

        .crosshair-locating .crosshair-center-dot {
          animation: crosshair-center-pulse 1.2s ease-in-out infinite;
        }

        /* Active GPS Locked State */
        .crosshair-active .crosshair-outer-ring {
          transform: rotate(45deg);
        }

        .crosshair-active .crosshair-center-dot {
          animation: crosshair-center-pulse 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .crosshair-outer-ring,
          .crosshair-inner-ring,
          .crosshair-ticks,
          .crosshair-center-dot,
          .crosshair-sonar-pulse {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* 1. Radar Sonar Expanding Ping Ring (Visible when locating or locked) */}
      {(locating || active) && (
        <circle
          cx="12"
          cy="12"
          r="2"
          stroke="currentColor"
          fill="none"
          className={`crosshair-sonar-pulse ${colorClass}`}
          style={{
            transformOrigin: '12px 12px',
            animation: locating
              ? 'crosshair-ping-wave 1.6s cubic-bezier(0, 0, 0.2, 1) infinite'
              : 'crosshair-ping-wave 2.4s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
        />
      )}

      {/* 2. Outer Precision HUD Calibration Arcs / Quadrant Brackets */}
      <g
        className={`crosshair-outer-ring ${colorClass}`}
        stroke="currentColor"
        strokeWidth={Math.max(1.2, strokeWidth * 0.8)}
        strokeLinecap="round"
      >
        {/* Top-Left Arc */}
        <path d="M 5.2 8.5 A 7 7 0 0 1 8.5 5.2" />
        {/* Top-Right Arc */}
        <path d="M 15.5 5.2 A 7 7 0 0 1 18.8 8.5" />
        {/* Bottom-Right Arc */}
        <path d="M 18.8 15.5 A 7 7 0 0 1 15.5 18.8" />
        {/* Bottom-Left Arc */}
        <path d="M 8.5 18.8 A 7 7 0 0 1 5.2 15.5" />
      </g>

      {/* 3. Inner Optical Target Circle */}
      <circle
        cx="12"
        cy="12"
        r="5.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className={`crosshair-inner-ring ${colorClass}`}
      />

      {/* 4. Cardinal Crosshair Reticle Needles (North, South, East, West) */}
      <g
        className={`crosshair-ticks ${colorClass}`}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        {/* North Tick */}
        <line x1="12" y1="2" x2="12" y2="5.5" />
        {/* South Tick */}
        <line x1="12" y1="18.5" x2="12" y2="22" />
        {/* West Tick */}
        <line x1="2" y1="12" x2="5.5" y2="12" />
        {/* East Tick */}
        <line x1="18.5" y1="12" x2="22" y2="12" />
      </g>

      {/* 5. Center Bullseye Target Bead */}
      <circle
        cx="12"
        cy="12"
        r="1.4"
        fill="currentColor"
        className={`crosshair-center-dot ${colorClass}`}
      />
    </svg>
  );
}
