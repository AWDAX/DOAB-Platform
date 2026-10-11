/**
 * ClimateDualWaveSvg
 * Interactive Dual-Climate Water Flow & Desert Dunes Vector Artwork
 * 
 * Concept:
 * - Flood mode: Organic dynamic flowing hydro-topographic contours, cascading water waves, droplet ripples.
 * - Drought mode: Wind-sculpted arid sand dunes, thermal shimmer curves, radiating sun heatlines.
 * - Monochromatic & accent aesthetic: respects theme ('currentColor' + amber/cyan accents) with crisp thin strokes.
 */
interface ClimateDualWaveSvgProps {
  envMode: 'flood' | 'drought';
  className?: string;
}

export default function ClimateDualWaveSvg({ envMode = 'flood', className = '' }: ClimateDualWaveSvgProps) {
  const isFlood = envMode === 'flood';

  return (
    <div className={`pointer-events-none select-none flex items-center justify-center relative w-full overflow-visible ${className}`}>
      <style>{`
        @keyframes hydroFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -120; }
        }
        @keyframes duneDrift {
          0% { transform: translateX(0); }
          50% { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
        @keyframes ambientShimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.95; }
        }

        .climate-flow-line {
          stroke-dasharray: 8 6;
          animation: hydroFlow 12s linear infinite;
        }

        .climate-dune-ridge {
          animation: duneDrift 8s ease-in-out infinite;
        }

        .climate-glow {
          filter: drop-shadow(0 0 16px var(--color-brand-accent));
        }
      `}</style>

      <svg
        viewBox="0 0 900 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-4xl h-auto overflow-visible text-[var(--text-main)] transition-all duration-700"
        aria-hidden="true"
      >
        <defs>
          {/* Subtle Ambient Radial Backlight */}
          <radialGradient id="climateCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity="0.14" />
            <stop offset="60%" stopColor="var(--color-brand-accent)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Stroke Gradient */}
          <linearGradient id="streamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--border-color)" stopOpacity="0.3" />
            <stop offset="30%" stopColor="var(--color-brand-accent)" stopOpacity="0.85" />
            <stop offset="70%" stopColor="var(--text-main)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--border-color)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Ambient Center Glow Background */}
        <ellipse cx="450" cy="180" rx="360" ry="130" fill="url(#climateCenterGlow)" />

        {isFlood ? (
          /* ── MONSOON: FLOWING WATER STREAMS & HYDROGRAPHIC TOPOGRAPHY ── */
          <g className="transition-opacity duration-500">
            {/* Background Soft River Waves */}
            <path
              d="M 50 130 C 200 90, 320 180, 450 140 C 580 100, 720 190, 850 150"
              stroke="url(#streamGrad)"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
            <path
              d="M 60 160 C 190 120, 310 210, 450 170 C 590 130, 700 220, 840 180"
              stroke="url(#streamGrad)"
              strokeWidth="2"
              strokeOpacity="0.6"
            />

            {/* Primary Flowing River Channel (with animated dash offset) */}
            <path
              d="M 40 200 C 180 150, 300 240, 450 190 C 600 140, 720 250, 860 200"
              stroke="var(--color-brand-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="climate-flow-line"
            />
            <path
              d="M 40 208 C 180 158, 300 248, 450 198 C 600 148, 720 258, 860 208"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />

            {/* Lower Elevation Bypass Stream */}
            <path
              d="M 70 240 C 220 200, 340 270, 450 230 C 560 190, 680 270, 830 240"
              stroke="url(#streamGrad)"
              strokeWidth="1.8"
              strokeOpacity="0.75"
            />
            <path
              d="M 100 270 C 250 240, 360 290, 450 260 C 540 230, 660 290, 800 260"
              stroke="var(--border-color)"
              strokeWidth="1.2"
              strokeDasharray="4 6"
            />

            {/* Concentric Water Droplet Ripple Center */}
            <g transform="translate(450, 190)" className="climate-glow">
              <circle r="4" fill="var(--color-brand-accent)" />
              <circle r="14" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeOpacity="0.8" />
              <circle r="26" stroke="var(--color-brand-accent)" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
              <circle r="42" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.25" />
            </g>

            {/* Secondary Ripple Node */}
            <g transform="translate(260, 195)">
              <circle r="2.5" fill="currentColor" strokeOpacity="0.7" />
              <circle r="10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            </g>
            <g transform="translate(640, 185)">
              <circle r="2.5" fill="currentColor" strokeOpacity="0.7" />
              <circle r="10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            </g>
          </g>
        ) : (
          /* ── DROUGHT: ARID DESERT DUNES & THERMAL SHIMMER CONTOURS ── */
          <g className="transition-opacity duration-500">
            {/* Radiating Thermal Sun / Solar Shimmer Arc */}
            <g transform="translate(450, 120)" className="climate-glow">
              <circle r="6" fill="var(--color-brand-accent)" />
              <circle r="20" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="6 4" />
              <circle r="36" stroke="var(--color-brand-accent)" strokeWidth="1" strokeOpacity="0.4" />
              {/* Radiating heatline rays */}
              <line x1="0" y1="-26" x2="0" y2="-44" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="26" y1="-14" x2="42" y2="-22" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="-26" y1="-14" x2="-42" y2="-22" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Upper Sand Dune Crest 1 */}
            <path
              d="M 30 180 Q 220 130, 450 170 T 870 160"
              stroke="url(#streamGrad)"
              strokeWidth="2"
              strokeOpacity="0.5"
              className="climate-dune-ridge"
            />

            {/* Primary Wind-Sculpted Razor Dune Ridge */}
            <path
              d="M 40 215 C 200 170, 320 240, 450 200 C 580 160, 710 240, 860 195"
              stroke="var(--color-brand-accent)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Arid ripple hatching under the main dune */}
            <path
              d="M 40 223 C 200 178, 320 248, 450 208 C 580 168, 710 248, 860 203"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeOpacity="0.6"
              strokeDasharray="5 5"
            />

            {/* Foreground Sweeping Arid Dune Basin */}
            <path
              d="M 60 260 Q 280 210, 450 245 T 840 235"
              stroke="url(#streamGrad)"
              strokeWidth="2"
              strokeOpacity="0.8"
            />
            <path
              d="M 90 285 Q 260 250, 450 275 T 810 265"
              stroke="var(--border-color)"
              strokeWidth="1.4"
              strokeDasharray="4 6"
            />

            {/* Dry Cracked Earth / Topography Hatchings */}
            <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round">
              <line x1="380" y1="230" x2="400" y2="245" />
              <line x1="400" y1="245" x2="425" y2="240" />
              <line x1="400" y1="245" x2="395" y2="260" />

              <line x1="510" y1="225" x2="530" y2="240" />
              <line x1="530" y1="240" x2="550" y2="235" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
