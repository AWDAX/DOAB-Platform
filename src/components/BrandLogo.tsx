import { useState } from 'react';
import { motion } from 'framer-motion';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoader?: boolean;
  className?: string;
  animateOnHover?: boolean;
}

export function DOABLogoMark({ 
  className = "w-full h-full", 
  isAnimating = false,
  duration = 0.8
}: { 
  className?: string; 
  isAnimating?: boolean; 
  duration?: number;
}) {
  const outerDuration = duration;
  const innerDuration = duration * 0.85;
  const fillDelay = duration * 0.55;
  const fillDuration = duration * 0.45;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="doabBrandGradGlobal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>

      {/* SVG Path Stroke Drawing Animation (Dynamic Vector Tracer) */}
      {isAnimating ? (
        <g>
          {/* Outer Contour Drawing */}
          <motion.path
            d="M22 14 H50 C69.8823 14 86 30.1177 86 50 C86 69.8823 69.8823 86 50 86 H22 C19.7909 86 18 84.2091 18 82 V18 C18 15.7909 19.7909 14 22 14 Z"
            fill="url(#doabBrandGradGlobal)"
            stroke="url(#doabBrandGradGlobal)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, fillOpacity: 0 }}
            animate={{ pathLength: 1, fillOpacity: 1 }}
            transition={{ 
              pathLength: { duration: outerDuration, ease: "easeInOut" },
              fillOpacity: { duration: fillDuration, delay: fillDelay, ease: "easeOut" }
            }}
          />
          {/* Inner Contour Drawing */}
          <motion.path
            d="M32 28 H49 C61.1503 28 71 37.8497 71 50 C71 62.1503 61.1503 72 49 72 H32 Z"
            fill="var(--bg-card)"
            stroke="url(#doabBrandGradGlobal)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, fillOpacity: 0 }}
            animate={{ pathLength: 1, fillOpacity: 1 }}
            transition={{ 
              pathLength: { duration: innerDuration, delay: duration * 0.15, ease: "easeInOut" },
              fillOpacity: { duration: fillDuration, delay: fillDelay, ease: "easeOut" }
            }}
          />
        </g>
      ) : (
        /* Static Final-State Vector Mark */
        <path 
          fill="url(#doabBrandGradGlobal)"
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M22 14C19.7909 14 18 15.7909 18 18V82C18 84.2091 19.7909 86 22 86H50C69.8823 86 86 69.8823 86 50C86 30.1177 69.8823 14 50 14H22ZM32 28H49C61.1503 28 71 37.8497 71 50C71 62.1503 61.1503 72 49 72H32V28Z"
        />
      )}
    </svg>
  );
}

export default function BrandLogo({ 
  size = 'md', 
  isLoader = false, 
  className = '',
  animateOnHover = true
}: BrandLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverKey, setHoverKey] = useState(0);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-7.5 w-7.5',
    lg: 'h-9.5 w-9.5',
    xl: 'h-13 w-13'
  };

  const handleMouseEnter = () => {
    if (animateOnHover) {
      setIsHovered(true);
      setHoverKey((prev) => prev + 1);
    }
  };

  const handleMouseLeave = () => {
    if (animateOnHover) {
      setIsHovered(false);
    }
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center shrink-0 select-none transition-transform duration-200 group-hover:scale-105 ${sizeClasses[size]} ${className}`}
    >
      {isLoader ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <DOABLogoMark className="w-full h-full" isAnimating={true} />
        </div>
      ) : (
        <DOABLogoMark 
          key={isHovered ? `hover-${hoverKey}` : 'static'}
          className="w-full h-full transition-transform duration-300" 
          isAnimating={isHovered} 
        />
      )}
    </div>
  );
}
