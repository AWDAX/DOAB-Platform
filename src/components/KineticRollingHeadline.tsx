import { useState, useEffect } from 'react';

interface KineticRollingHeadlineProps {
  className?: string;
  phrases?: string[];
}

const DEFAULT_PHRASES = [
  "Predicting urban flood risk one hour ahead.",
  "Safe navigation for riders & commuters.",
  "Real-time dual-climate GIS telemetry.",
  "Probabilistic waterlog corridor models.",
  "Commercial fleet dispatch risk routing."
];

export default function KineticRollingHeadline({ 
  className = '',
  phrases = DEFAULT_PHRASES
}: KineticRollingHeadlineProps) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrevIndex(index);
      setAnimating(true);
      setIndex((prev) => (prev + 1) % phrases.length);

      const endTimer = setTimeout(() => {
        setAnimating(false);
        setPrevIndex(null);
      }, 700);

      return () => clearTimeout(endTimer);
    }, 3600);

    return () => clearInterval(timer);
  }, [index, phrases.length]);

  const current = phrases[index] || phrases[0];
  const previous = prevIndex !== null ? phrases[prevIndex] : null;

  return (
    <span className={`inline-grid grid-cols-1 grid-rows-1 relative overflow-hidden align-bottom py-1.5 -my-1.5 leading-[1.25] ${className}`}>
      {/* Permanent baseline sizer to ensure rock-solid layout stability */}
      <span className="invisible opacity-0 select-none pointer-events-none col-start-1 row-start-1 whitespace-nowrap py-1 leading-[1.25]">
        {phrases[0]}
      </span>

      {/* Outgoing Phrase: Slides UP smoothly (-115%) and fades with soft blur */}
      {animating && previous && (
        <span
          className="kinetic-phrase-gradient col-start-1 row-start-1 whitespace-nowrap will-change-transform py-1 leading-[1.25]"
          style={{
            animation: 'kineticWordRollUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {previous}
        </span>
      )}

      {/* Incoming Phrase: Rises smoothly from BOTTOM (115% -> 0%) into position */}
      <span
        className="kinetic-phrase-gradient col-start-1 row-start-1 whitespace-nowrap will-change-transform py-1 leading-[1.25]"
        style={animating ? {
          animation: 'kineticWordRollIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        } : undefined}
      >
        {current}
      </span>
    </span>
  );
}
