import { Droplets, RefreshCw, SunMedium } from 'lucide-react';
import type { LiveHazardCopy } from '../i18n/liveHazardCopy';
import type { LiveHazardState } from '../hooks/useLiveHazards';
import type { HazardCell, HazardLevel } from '../lib/liveHazards';

interface Props {
  copy: LiveHazardCopy;
  floodOn: boolean;
  droughtOn: boolean;
  onToggleFlood: () => void;
  onToggleDrought: () => void;
  onShowIndia: () => void;
  onFocusPlace: (lat: number, lng: number) => void;
  state: LiveHazardState;
}

function toggleClass(active: boolean): string {
  return `flex-1 min-h-11 flex items-center justify-center gap-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
    active
      ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]'
      : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
  }`;
}

function isLevel(value: HazardCell['flood']): value is HazardLevel {
  return value === 'elevated' || value === 'high' || value === 'severe';
}

const LEVEL_ORDER: Record<HazardLevel, number> = { severe: 0, high: 1, elevated: 2 };

export function LiveHazardControls({
  copy,
  floodOn,
  droughtOn,
  onToggleFlood,
  onToggleDrought,
  onShowIndia,
  onFocusPlace,
  state,
}: Props) {
  const statusText =
    state.status === 'error'
      ? state.error || copy.status.error
      : state.status === 'loading'
        ? copy.status.loading
        : state.status === 'ready'
          ? copy.status.ready
          : copy.status.idle;

  const floodCells = floodOn ? state.cells.filter((cell) => isLevel(cell.flood)) : [];
  const droughtCells = droughtOn ? state.cells.filter((cell) => isLevel(cell.drought)) : [];
  const listed = [...floodCells.map((cell) => ({ cell, kind: 'flood' as const })), ...droughtCells.map((cell) => ({ cell, kind: 'drought' as const }))]
    .sort((a, b) => {
      const left = a.kind === 'flood' ? a.cell.flood : a.cell.drought;
      const right = b.kind === 'flood' ? b.cell.flood : b.cell.drought;
      return LEVEL_ORDER[left as HazardLevel] - LEVEL_ORDER[right as HazardLevel];
    });

  return (
    <section
      aria-label={copy.title}
      className="neo-glass-card p-3 sm:p-4 rounded-2xl flex flex-col gap-2.5 pointer-events-auto shadow-lg backdrop-blur-xl border border-[var(--border-color)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold text-[var(--text-main)]">{copy.title}</h2>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={state.reload}
          disabled={state.status === 'loading'}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50 cursor-pointer"
          aria-label={copy.refresh}
          title={copy.refresh}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state.status === 'loading' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2">
        <button type="button" aria-pressed={floodOn} onClick={onToggleFlood} className={toggleClass(floodOn)}>
          <Droplets className="h-3.5 w-3.5" />
          <span>{copy.flood.label}</span>
        </button>
        <button type="button" aria-pressed={droughtOn} onClick={onToggleDrought} className={toggleClass(droughtOn)}>
          <SunMedium className="h-3.5 w-3.5" />
          <span>{copy.drought.label}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{copy.floodCount}</div>
          <div className="font-mono text-sm font-bold tabular-nums text-[var(--text-main)]">{floodCells.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{copy.droughtCount}</div>
          <div className="font-mono text-sm font-bold tabular-nums text-[var(--text-main)]">{droughtCells.length}</div>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed" role="status" aria-live="polite">
        {statusText}
        {state.status === 'ready' && state.updatedAt && (
          <span className="font-mono">
            {' '}
            | {copy.updated} {state.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </p>

      {state.status === 'ready' && listed.length === 0 && (
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{copy.noFlags}</p>
      )}

      {listed.length > 0 && (
        <ul className="flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
          {listed.map(({ cell, kind }) => {
            const level = kind === 'flood' ? cell.flood : cell.drought;
            return (
              <li key={`${kind}-${cell.key}`}>
                <button
                  type="button"
                  onClick={() => onFocusPlace(cell.lat, cell.lng)}
                  className="w-full min-h-11 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-main)] cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[var(--text-main)] truncate">{cell.name}</span>
                    <span className="block text-[10px] text-[var(--text-muted)] truncate">{cell.state}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-mono font-bold text-[var(--text-muted)]">
                    {kind === 'flood' ? copy.floodCount : copy.droughtCount} {level ? copy.levels[level] : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onShowIndia}
        className="min-h-11 w-full rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-main)] cursor-pointer"
      >
        {copy.viewIndia}
      </button>

      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{copy.source}</p>
    </section>
  );
}
