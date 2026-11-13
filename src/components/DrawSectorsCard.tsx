import { useState } from 'react';
import { DRAW_CARD } from '../data/mapGeometry';
import { SECTORS } from '../data/sectors';

/**
 * The empty state's one piece of guidance (frame 179:1345).
 *
 * The map is not blank behind it: the launch sites and every call for help
 * are already pinned, so the card can tell the operator what it is they are
 * drawing *around* rather than asking them to start from nothing. The count
 * is summed from the sectors' own call figures, so the sentence cannot drift
 * from the pins beside it.
 */
export function DrawSectorsCard({
  onDraw,
  drawRef,
}: {
  onDraw: () => void;
  drawRef?: React.Ref<HTMLButtonElement>;
}) {
  const [importNote, setImportNote] = useState(false);
  const calls = SECTORS.reduce((total, sector) => total + sector.helpCalls, 0);

  return (
    <div
      className="absolute z-20 flex flex-col items-start gap-[12px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-panel px-[25px] py-[23px] shadow-panel"
      style={{ left: DRAW_CARD.x, top: DRAW_CARD.y, width: DRAW_CARD.width }}
    >
      <h2 className="text-[14px] font-semibold whitespace-nowrap text-text-primary">
        Draw your search sectors
      </h2>
      <p className="text-[12px] text-text-secondary">
        Outline areas on the map, or import a sector file. The {calls} calls for help received
        before the towers went down are already pinned.
      </p>

      <div className="flex items-center gap-[10px]">
        <button
          ref={drawRef}
          type="button"
          onClick={onDraw}
          className="flex h-[32px] cursor-pointer items-center justify-center rounded-[3px] bg-interaction-primary px-[14px]"
        >
          <span className="text-[12px] font-semibold whitespace-nowrap text-text-on-interaction">
            Draw sectors
          </span>
        </button>
        <button
          type="button"
          onClick={() => setImportNote(true)}
          className="flex h-[32px] cursor-pointer items-center justify-center rounded-[3px] border border-interaction-primary px-[14px]"
        >
          <span className="text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
            Import file
          </span>
        </button>
      </div>

      {/* No Figma frame for the inert control's reply — copy proposed, flagged. */}
      {importNote && (
        <p className="text-[12px] text-text-secondary">
          Importing a sector file is outside this demo. Use Draw sectors.
        </p>
      )}
    </div>
  );
}
