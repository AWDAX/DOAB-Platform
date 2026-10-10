import { Route as RouteIcon, ShieldCheck, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';

export default function BestRoutesPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div id="tour-best-header">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <RouteIcon className="h-6 w-6 text-[var(--color-brand-accent)]" />
            Safe Computed Paths
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Ward-level risk model avoiding flooded arteries & high waterlog corridors.</p>
        </div>

        {/* Route Carousel Switcher */}
        <div id="tour-best-switcher" className="flex items-center gap-2 self-start sm:self-auto bg-[var(--bg-main)] p-1.5 rounded-2xl border border-[var(--border-color)]">
          <button className="p-1.5 rounded-xl hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-semibold px-2.5 text-[var(--text-main)]">Route 1 of 3</span>
          <button className="p-1.5 rounded-xl hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Desktop Table View (md+) */}
      <div id="tour-best-table" className="hidden md:block neo-glass-card rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-sm w-full mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-main)]/70 border-b border-[var(--border-color)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
                <th className="py-4 px-6 whitespace-nowrap">Route Designation</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Distance</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Est. Time</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Risk Probability</th>
                <th className="py-4 px-6 whitespace-nowrap text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[var(--border-color)]">
              {/* Route 1: Optimal Safe Route */}
              <tr className="bg-[var(--bg-card)] hover:bg-[var(--bg-main)]/40 transition-colors">
                <td className="py-4.5 px-6 font-semibold text-[var(--text-main)] flex items-center gap-3">
                  <ShieldCheck className="h-4.5 w-4.5 text-[var(--text-main)] shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span>Via Outer Bypass Corridor</span>
                      <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">Optimal</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-normal block mt-0.5">Dashed line focus on telemetry layer</span>
                  </div>
                </td>
                <td className="py-4.5 px-6 tabular-nums font-mono text-[var(--text-main)] text-center">12.5 km</td>
                <td className="py-4.5 px-6 tabular-nums font-mono text-[var(--text-main)] text-center">32 mins</td>
                <td className="py-4.5 px-6 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full mono-badge text-[10px] border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)]">
                    Low Risk (4.2%)
                  </span>
                </td>
                <td id="tour-best-engage" className="py-4.5 px-6 text-right">
                  <button className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-xs hover:opacity-90 transition-opacity shadow-xs cursor-pointer">
                    Engage Route
                  </button>
                </td>
              </tr>

              {/* Route 2: Alternate Route */}
              <tr className="bg-[var(--bg-card)]/60 hover:bg-[var(--bg-main)]/40 transition-colors">
                <td className="py-4.5 px-6 font-medium text-[var(--text-main)] flex items-center gap-3">
                  <ShieldAlert className="h-4.5 w-4.5 text-[var(--text-muted)] shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span>Via Central Ring Express</span>
                      <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">Alternate</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-normal block mt-0.5">Stroked faded line overlay</span>
                  </div>
                </td>
                <td className="py-4.5 px-6 tabular-nums font-mono text-[var(--text-main)] text-center">9.8 km</td>
                <td className="py-4.5 px-6 tabular-nums font-mono text-[var(--text-main)] text-center">44 mins</td>
                <td className="py-4.5 px-6 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full mono-badge text-[10px] border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                    Moderate Risk (48.0%)
                  </span>
                </td>
                <td className="py-4.5 px-6 text-right">
                  <button className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-main)] bg-[var(--bg-card)] rounded-xl font-semibold text-xs hover:bg-[var(--bg-main)] transition-colors cursor-pointer">
                    Switch Alternate
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards View (<md) */}
      <div className="md:hidden space-y-3.5">
        {/* Route 1 Card */}
        <div className="p-4 rounded-2xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[var(--text-main)] shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-[var(--text-main)]">Via Outer Bypass Corridor</h2>
                  <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">Optimal</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Dashed line focus on telemetry layer</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[var(--bg-main)]/70 border border-[var(--border-color)] text-center font-mono">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Distance</span>
              <span className="text-xs font-bold text-[var(--text-main)]">12.5 km</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Est. Time</span>
              <span className="text-xs font-bold text-[var(--text-main)]">32 mins</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Risk</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">4.2%</span>
            </div>
          </div>

          <button className="w-full py-2.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-xs active:scale-[0.99] transition-transform shadow-xs cursor-pointer">
            Engage Optimal Route
          </button>
        </div>

        {/* Route 2 Card */}
        <div className="p-4 rounded-2xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)]/70 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-[var(--text-main)]">Via Central Ring Express</h2>
                  <span className="mono-badge text-[9px] px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">Alternate</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Stroked faded line overlay</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[var(--bg-main)]/70 border border-[var(--border-color)] text-center font-mono">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Distance</span>
              <span className="text-xs font-bold text-[var(--text-main)]">9.8 km</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Est. Time</span>
              <span className="text-xs font-bold text-[var(--text-main)]">44 mins</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Risk</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">48.0%</span>
            </div>
          </div>

          <button className="w-full py-2.5 border border-[var(--border-color)] text-[var(--text-main)] bg-[var(--bg-card)] rounded-xl font-semibold text-xs active:scale-[0.99] transition-transform cursor-pointer">
            Switch Alternate Route
          </button>
        </div>
      </div>
    </div>
  );
}
