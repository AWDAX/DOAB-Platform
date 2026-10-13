import { Link, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Sparkles } from 'lucide-react';
import { playClick } from '../utils/soundFx';

interface NotFoundPageProps {
  envMode?: 'flood' | 'drought';
}

export default function NotFoundPage({ envMode = 'flood' }: NotFoundPageProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    playClick();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Subtle Radar Gradients */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 dark:opacity-20">
        <div className="w-[500px] h-[500px] rounded-full border border-[var(--color-brand-accent)]/20 animate-ping [animation-duration:8s]" />
        <div className="absolute w-[340px] h-[340px] rounded-full border border-[var(--color-brand-accent)]/30" />
        <div className="absolute w-[180px] h-[180px] rounded-full border border-dashed border-[var(--color-brand-accent)]/40" />
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 max-w-lg w-full bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-color)] rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
        {/* Status Header Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-brand-accent)]/10 border border-[var(--color-brand-accent)]/25 text-[var(--color-brand-accent)] text-xs font-mono font-medium tracking-wider mb-6">
          <Compass className="w-3.5 h-3.5 animate-pulse" />
          <span>CIVIC GRID // ERROR 404</span>
        </div>

        {/* Large Aesthetic Coordinate Display */}
        <div className="relative my-2">
          <h1 className="text-7xl sm:text-8xl font-black font-mono tracking-tighter text-[var(--text-main)] opacity-90 select-none">
            4<span className="text-[var(--color-brand-accent)]">0</span>4
          </h1>
          <div className="text-[11px] font-mono tracking-widest text-[var(--text-muted)] uppercase mt-1">
            Sector Not Found in Tactical Database
          </div>
        </div>

        {/* Description */}
        <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-md mx-auto my-5 leading-relaxed">
          The requested coordinate or navigational link is outside mapped civic operational boundaries.
          {envMode === 'flood'
            ? ' Flood hazard and drainage telemetry remain active on mapped zones.'
            : ' Water deficit and replenishment monitoring continue across verified grids.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/80 hover:bg-[var(--text-main)]/5 text-[var(--text-main)] text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            onClick={() => playClick()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--color-brand-accent)] hover:opacity-90 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[var(--color-brand-accent)]/20"
          >
            <Compass className="w-4 h-4" />
            <span>Civic Command Map</span>
          </Link>

          <Link
            to="/assistant"
            onClick={() => playClick()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/5 hover:bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)] text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </Link>
        </div>

        {/* Micro Telemetry Footer */}
        <div className="pt-8 mt-8 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>SYSTEM: DOAB SENTINEL</span>
          <span>LAT/LNG: [UNMAPPED]</span>
        </div>
      </div>
    </div>
  );
}
