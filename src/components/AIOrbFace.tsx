import { useState, useEffect, useRef } from 'react';

export interface AIOrbFaceProps {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'streaming' | 'done' | 'error' | 'smile' | 'happy';
  size?: number;
  gaze?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * AI Orb Face (Combining Siri Orb Conic Gradients + Expressive AI Face)
 */
export default function AIOrbFace({
  state = 'idle',
  size = 80,
  gaze = true,
  className = '',
  'aria-label': ariaLabel
}: AIOrbFaceProps) {
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isOccasionalSmile, setIsOccasionalSmile] = useState(false);
  const [isEventSmile, setIsEventSmile] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);

  // Natural Blink Cadence
  useEffect(() => {
    let blinkTimer: any;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        // Random interval between 2.5s and 5.5s
        blinkTimer = setTimeout(triggerBlink, 2500 + Math.random() * 3000);
      }, 160);
    };

    blinkTimer = setTimeout(triggerBlink, 2800);
    return () => clearTimeout(blinkTimer);
  }, []);

  // Micro-Smile
  useEffect(() => {
    if (state !== 'idle') {
      setIsOccasionalSmile(false);
      return;
    }
    let smileTimer: any;
    let cancelTimeout: any;

    const triggerSmile = () => {
      setIsOccasionalSmile(true);
      cancelTimeout = setTimeout(() => {
        setIsOccasionalSmile(false);
        smileTimer = setTimeout(triggerSmile, 180000 + Math.random() * 120000);
      }, 1200);
    };

    smileTimer = setTimeout(triggerSmile, 120000 + Math.random() * 60000);
    return () => {
      clearTimeout(smileTimer);
      clearTimeout(cancelTimeout);
    };
  }, [state]);

  // Listen for Global Smile Events
  useEffect(() => {
    const handleSmile = () => setIsEventSmile(true);
    const handleUnsmile = () => setIsEventSmile(false);

    window.addEventListener('swatva:ai-smile', handleSmile);
    window.addEventListener('swatva:ai-unsmile', handleUnsmile);
    return () => {
      window.removeEventListener('swatva:ai-smile', handleSmile);
      window.removeEventListener('swatva:ai-unsmile', handleUnsmile);
    };
  }, []);

  // Pointer Gaze Tracking with Smooth Spring Physics
  useEffect(() => {
    if (!gaze || state === 'thinking' || state === 'error') {
      if (state === 'thinking') {
        setEyePos({ x: -4.5, y: -4.5 });
      } else {
        setEyePos({ x: 0, y: 0 });
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      const orbCenterX = rect.left + rect.width / 2;
      const orbCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - orbCenterX;
      const deltaY = e.clientY - orbCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxOffset = 5.5;

      if (distance === 0) {
        setEyePos({ x: 0, y: 0 });
      } else {
        const factor = Math.min(distance / 300, 1);
        const normX = (deltaX / distance) * maxOffset * factor;
        const normY = (deltaY / distance) * maxOffset * factor;
        setEyePos({ x: normX, y: normY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gaze, state]);

  const isSmilingActive = state === 'smile' || state === 'happy' || isOccasionalSmile || isEventSmile;

  // State-Driven Atmosphere & Micro-animations (Scaled appropriately for message avatars and FAB)
  const getOrbAura = () => {
    if (size <= 32) {
      return 'shadow-2xs border border-[var(--border-color)]';
    }
    const baseShadow = 'shadow-[0_4px_14px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]';
    switch (state) {
      case 'listening':
      case 'speaking':
      case 'done':
      case 'happy':
      case 'smile':
        return `${baseShadow} scale-105`;
      default:
        return isSmilingActive ? `${baseShadow} scale-105` : baseShadow;
    }
  };

  const getRotationDuration = () => {
    switch (state) {
      case 'thinking':
        return '4s';
      case 'speaking':
        return '5s';
      case 'listening':
        return '6s';
      case 'streaming':
        return '7s';
      default:
        return '12s';
    }
  };

  const getOrbShell = () => {
    switch (state) {
      case 'speaking':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#e0f2fe,var(--color-brand-accent),#bae6fd,#ffffff)]';
      case 'listening':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#f0f9ff,#e0f2fe,#f0f9ff,#ffffff)]';
      case 'thinking':
        return 'bg-[conic-gradient(from_0deg,#fafafa,#f0f9ff,#e0f2fe,#f0f9ff,#fafafa)]';
      case 'streaming':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#f0f9ff,#e0f2fe,#f0f9ff,#ffffff)]';
      case 'done':
      case 'happy':
      case 'smile':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#e0f2fe,#bae6fd,#e0f2fe,#ffffff)]';
      case 'error':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fb7185,#be123c,#fb7185,#ffffff)]';
      default:
        return 'bg-[conic-gradient(from_0deg,#ffffff,#f0f9ff,#e0f2fe,#f0f9ff,#ffffff)]';
    }
  };

  const eyeScaleY = isBlinking ? 0.08 : state === 'listening' ? 1.3 : state === 'speaking' ? 1.15 : state === 'thinking' ? 0.45 : state === 'streaming' ? 0.75 : isSmilingActive ? 0.85 : 1;

  return (
    <div
      ref={orbRef}
      role="img"
      aria-label={ariaLabel || `AI Assistant is ${state}`}
      className={`relative rounded-[50%_50%_2px_50%] flex items-center justify-center select-none transition-all duration-300 overflow-hidden ${getOrbAura()} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* 1. Layered Animated Conic Gradients */}
      <div 
        className={`absolute inset-0 rounded-[50%_50%_2px_50%] pointer-events-none opacity-80 transition-transform ${getOrbShell()}`}
        style={{
          animation: `spin ${getRotationDuration()} linear infinite`,
          filter: 'blur(3px)'
        }}
      />

      {/* 2. Inner Radial Depth Core */}
      <div 
        className="absolute inset-1 rounded-[50%_50%_2px_50%] pointer-events-none bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#f8fafc_65%,#f1f5f9_100%)]"
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.06)'
        }}
      />

      {/* 3. Outer Atmospheric Rim */}
      <div 
        className="absolute inset-0 rounded-[50%_50%_2px_50%] border border-black/15 dark:border-white/20 pointer-events-none z-20"
      />

      {/* 4. Expressive Face SVG Layer with Gaze Cursor Tracking */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full p-2 relative z-10 transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${eyePos.x}px, ${eyePos.y}px)`
        }}
      >
        {state === 'done' ? (
          <g className="stroke-neutral-950" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M 30 48 Q 38 38 46 48" />
            <path d="M 54 48 Q 62 38 70 48" />
            <path d="M 40 64 Q 50 74 60 64" />
          </g>
        ) : state === 'error' ? (
          <g stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" fill="none">
            <circle cx="38" cy="46" r="8" strokeDasharray="3 3" />
            <circle cx="62" cy="46" r="8" strokeDasharray="3 3" />
            <path d="M 42 66 Q 50 60 58 66" />
          </g>
        ) : (
          <g>
            <ellipse
              cx="38"
              cy="46"
              rx={state === 'thinking' ? 6 : 5.5}
              ry={5.5 * eyeScaleY}
              className="transition-all duration-150 fill-neutral-950"
            />
            <ellipse
              cx="62"
              cy="46"
              rx={state === 'thinking' ? 6 : 5.5}
              ry={5.5 * eyeScaleY}
              className="transition-all duration-150 fill-neutral-950"
            />
            {state === 'listening' ? (
              <ellipse cx="50" cy="65" rx="3.5" ry="3.5" className="fill-neutral-950" opacity="0.95" />
            ) : state === 'speaking' ? (
              <ellipse cx="50" cy="64" rx="4.5" ry="3.8" className="fill-neutral-950 animate-pulse" opacity="0.95" />
            ) : state === 'thinking' ? (
              <path d="M 46 64 Q 50 66 55 63" className="stroke-neutral-950" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
            ) : state === 'streaming' ? (
              <path d="M 44 65 Q 50 69 56 65" className="stroke-neutral-950" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
            ) : isSmilingActive ? (
              <path d="M 41 62 Q 50 71 59 62" className="stroke-neutral-950" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.95" />
            ) : (
              <path d="M 45 64 Q 50 67 55 64" className="stroke-neutral-950" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
