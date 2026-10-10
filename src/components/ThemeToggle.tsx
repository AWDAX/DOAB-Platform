import { useState } from 'react';
import { playClick } from '../utils/soundFx';

interface ThemeToggleProps {
  darkMode: boolean;
  toggleTheme: () => void;
  className?: string;
}

/**
 * Minimalist Circular Theme Toggle
 * Refined circular enclosure with subtle hairline border and smooth 360° spin physics.
 */
export default function ThemeToggle({ darkMode, toggleTheme, className = '' }: ThemeToggleProps) {
  const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    setRotation(prev => prev + 360);
    playClick();
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shadow-2xs backdrop-blur-md focus:outline-none focus:ring-0 active:outline-none group shrink-0 ${className}`}
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle dark/light theme"
    >
      <div
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        className="flex items-center justify-center"
      >
        {darkMode ? (
          /* Minimalist Outline Sun Icon */
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-[var(--color-brand-accent)]"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          /* Minimalist Outline Moon Icon */
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-[var(--color-brand-accent)]"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </div>
    </button>
  );
}
