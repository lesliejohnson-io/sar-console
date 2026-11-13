import { HELP_CALL_POS } from '../data/mapGeometry';
import type { SectorId } from '../data/types';

/**
 * Calls for help received from this sector before the towers went down
 * (frame 171:805). They are the one piece of ground truth on the map that is
 * not an asset, and they stay pinned through every state of Screen 1 —
 * including the empty one, where they are the only reason to draw a sector
 * anywhere in particular.
 */
export function HelpCallPin({ sectorId, count }: { sectorId: SectorId; count: number }) {
  const position = HELP_CALL_POS[sectorId];

  return (
    <div
      className="absolute flex h-[17px] items-center gap-[4px] overflow-hidden rounded-[99px] bg-surface-panel py-[2px] pr-[7px] pl-[5px]"
      style={{ left: position.x, top: position.y }}
    >
      <span aria-hidden className="block size-[8px] shrink-0 rounded-full bg-text-primary" />
      <p className="shrink-0 text-[11px] font-semibold whitespace-nowrap text-text-primary">
        {count} calls
      </p>
    </div>
  );
}
