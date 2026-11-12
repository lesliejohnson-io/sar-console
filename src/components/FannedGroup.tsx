import { MARKER } from '../data/mapGeometry';
import { UnitMarker } from './UnitMarker';

/**
 * A group marker, opened.
 *
 * No Figma frame covers this state, so it is built from the pieces that do
 * exist: a `surface/panel` tray in `border/subtle`, holding the same 52 x 44
 * markers the map already uses, each carrying its own ID.
 *
 * The tray wraps at four across rather than running in a line. Seven Hydras in
 * a row would be over 400 px wide and would cross two sector boundaries, which
 * would make a unit look as though it were already somewhere it is not. It is
 * then clamped inside the map, so a group near an edge opens inward instead of
 * sliding under the rail.
 */

const GAP = 4;
const PAD = 6;
const PER_ROW = 4;

/** The map, less the top bar, the legend and the tasking rail. */
const BOUNDS = { left: 8, top: 80, right: 1039, bottom: 975 };

export function FannedGroup({
  unitIds,
  anchor,
}: {
  unitIds: string[];
  /** The group marker's own top-left, in stage coordinates. */
  anchor: { x: number; y: number };
}) {
  const columns = Math.min(PER_ROW, unitIds.length);
  const rows = Math.ceil(unitIds.length / PER_ROW);

  const width = columns * MARKER.width + (columns - 1) * GAP + PAD * 2;
  const height = rows * MARKER.height + (rows - 1) * GAP + PAD * 2;

  const left = clamp(
    anchor.x + MARKER.width / 2 - width / 2,
    BOUNDS.left,
    BOUNDS.right - width,
  );
  const top = clamp(
    anchor.y + MARKER.height / 2 - height / 2,
    BOUNDS.top,
    BOUNDS.bottom - height,
  );

  return (
    <div
      className="absolute z-20 rounded-[6px] border border-border-subtle bg-surface-panel/95 shadow-panel"
      style={{ left, top, width, height }}
      onClick={(event) => event.stopPropagation()}
    >
      {unitIds.map((unitId, index) => (
        <UnitMarker
          key={unitId}
          unitId={unitId}
          x={PAD + (index % PER_ROW) * (MARKER.width + GAP)}
          y={PAD + Math.floor(index / PER_ROW) * (MARKER.height + GAP)}
        />
      ))}
    </div>
  );
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));
