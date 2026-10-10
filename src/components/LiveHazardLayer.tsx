import { Fragment, useCallback, useEffect } from 'react';
import { Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { HazardCell, HazardLevel, HazardOutcome, ViewBounds } from '../lib/liveHazards';
import type { LiveHazardCopy } from '../i18n/liveHazardCopy';

// Flood uses the aqua/cerulean/deep-oceanic flood tokens; drought uses the amber drought tokens
// (UI_DESIGN_SYSTEM.md section 1). Opacity rises with severity so the most severe cells stand out.
const FLOOD_COLOR: Record<HazardLevel, string> = { elevated: '#38BDF8', high: '#0284C7', severe: '#0C4A6E' };
const DROUGHT_COLOR: Record<HazardLevel, string> = { elevated: '#FCD34D', high: '#F59E0B', severe: '#78350F' };
const FILL_OPACITY: Record<HazardLevel, number> = { elevated: 0.28, high: 0.4, severe: 0.55 };
const RADIUS_M: Record<HazardLevel, number> = { elevated: 42000, high: 68000, severe: 90000 };

export function ViewportWatcher({ onChange }: { onChange: (bounds: ViewBounds) => void }) {
  const map = useMap();

  const emit = useCallback(() => {
    const bounds = map.getBounds();
    onChange({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    });
  }, [map, onChange]);

  useMapEvents({ moveend: emit });
  useEffect(() => {
    emit();
  }, [emit]);
  return null;
}

function levelOf(outcome: HazardOutcome): HazardLevel | null {
  return outcome === 'elevated' || outcome === 'high' || outcome === 'severe' ? outcome : null;
}

function formatMm(value: number | null, copy: LiveHazardCopy): string {
  return value === null ? copy.popup.unavailable : `${value.toFixed(1)} ${copy.popup.unit}`;
}

function formatSoil(value: number | null, copy: LiveHazardCopy): string {
  return value === null ? copy.popup.unavailable : `${Math.round(value * 100)}%`;
}

function describeLevel(outcome: HazardOutcome, copy: LiveHazardCopy): string {
  if (outcome === null) return copy.levels.unavailable;
  if (outcome === 'none') return copy.levels.none;
  return copy.levels[outcome];
}

interface LayerProps {
  cells: HazardCell[];
  showFlood: boolean;
  showDrought: boolean;
  copy: LiveHazardCopy;
}

export function LiveHazardMarkers({ cells, showFlood, showDrought, copy }: LayerProps) {
  return (
    <>
      {cells.map((cell) => {
        const droughtLevel = showDrought ? levelOf(cell.drought) : null;
        const floodLevel = showFlood ? levelOf(cell.flood) : null;
        if (!droughtLevel && !floodLevel) return null;

        return (
          <Fragment key={cell.key}>
            {droughtLevel && (
              <Circle
                center={[cell.lat, cell.lng]}
                radius={RADIUS_M[droughtLevel]}
                pathOptions={{
                  color: DROUGHT_COLOR[droughtLevel],
                  weight: 1.5,
                  dashArray: '4, 4',
                  fillColor: DROUGHT_COLOR[droughtLevel],
                  fillOpacity: FILL_OPACITY[droughtLevel],
                }}
              >
                <Popup>
                  <CellPopup cell={cell} copy={copy} kind="drought" />
                </Popup>
              </Circle>
            )}
            {floodLevel && (
              <Circle
                center={[cell.lat, cell.lng]}
                radius={Math.round(RADIUS_M[floodLevel] * 0.72)}
                pathOptions={{
                  color: FLOOD_COLOR[floodLevel],
                  weight: 1.5,
                  fillColor: FLOOD_COLOR[floodLevel],
                  fillOpacity: FILL_OPACITY[floodLevel],
                }}
              >
                <Popup>
                  <CellPopup cell={cell} copy={copy} kind="flood" />
                </Popup>
              </Circle>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function CellPopup({ cell, copy, kind }: { cell: HazardCell; copy: LiveHazardCopy; kind: 'flood' | 'drought' }) {
  const outcome = kind === 'flood' ? cell.flood : cell.drought;
  const place = cell.name ? `${cell.name}, ${cell.state}` : `${cell.lat.toFixed(2)}, ${cell.lng.toFixed(2)}`;
  return (
    <div className="text-xs leading-relaxed min-w-[13rem]">
      <div className="font-bold">{place}</div>
      <div className="mb-1">{kind === 'flood' ? copy.flood.label : copy.drought.label}</div>
      <div className="font-mono mb-1.5">{describeLevel(outcome, copy)}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {kind === 'flood' ? (
          <>
            <dt>{copy.popup.rain24h}</dt>
            <dd className="font-mono text-right">{formatMm(cell.rain24h, copy)}</dd>
            <dt>{copy.popup.rainNext6h}</dt>
            <dd className="font-mono text-right">{formatMm(cell.rainNext6h, copy)}</dd>
          </>
        ) : (
          <>
            <dt>{copy.popup.soil}</dt>
            <dd className="font-mono text-right">{formatSoil(cell.soilMoisture, copy)}</dd>
            <dt>{copy.popup.rain30d}</dt>
            <dd className="font-mono text-right">{formatMm(cell.rain30d, copy)}</dd>
          </>
        )}
      </dl>
      <div className="mt-1.5 text-[10px] opacity-75">{copy.popup.notAnOfficialAlert}</div>
    </div>
  );
}
