import { SECTORS, SECTOR_IDS } from '../data/sectors';
import { REACH_WARNING_GLYPH, canOperatorMove } from '../data/reach';
import { coverageAfterMove, type Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';

/**
 * The keyboard path to the same move the map does by drag, opened inline under
 * the unit's row rather than floated over the rail. The coverage figures are
 * the reason to choose one sector over another, and the rest of the rail is
 * the context for that choice, so nothing here covers it.
 *
 * Each sector shows the coverage it would have **after** the move. The number
 * comes from `coverageAfterMove`, which is also what the drag preview reads,
 * so the options can never promise something the drop does not deliver.
 *
 * A sector the unit may not be sent to stays in the list and says why, rather
 * than disappearing: the operator should be able to see that they considered
 * it and why it is out.
 *
 * **Flagged for design review:** no frame draws this list, inline or as the
 * menu it replaces.
 */
export function MoveOptions({
  unitId,
  current,
  assignments,
  onMove,
}: {
  unitId: string;
  current: SectorId | null;
  assignments: Assignments;
  onMove: (unitId: string, toSector: SectorId) => void;
}) {
  return (
    <div className="flex w-full flex-col items-stretch">
      <p className="py-[2px] text-[11px] tracking-[0.4px] text-text-secondary uppercase">
        Move {unitId} to
      </p>

      {SECTOR_IDS.map((id) => {
        const sector = SECTORS.find((candidate) => candidate.id === id)!;
        const verdict = canOperatorMove(unitId, id);

        if (id === current) {
          return (
            <div
              key={id}
              className="flex items-center gap-[8px] px-[6px] py-[4px] text-[12px] text-text-secondary"
            >
              <span className="min-w-px flex-1 truncate">{sector.label}</span>
              <span className="shrink-0">Current</span>
            </div>
          );
        }

        if (!verdict.ok) {
          return (
            <div key={id} className="flex flex-col items-start px-[6px] py-[4px] text-[12px]">
              <span className="w-full truncate text-text-secondary">{sector.label}</span>
              <span className="flex items-start gap-[6px] text-[11px] text-status-needs-operator">
                <span aria-hidden>{REACH_WARNING_GLYPH}</span>
                <span>{verdict.reason}</span>
              </span>
            </div>
          );
        }

        const after = coverageAfterMove(assignments, unitId, id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onMove(unitId, id)}
            aria-label={`Move ${unitId} to ${sector.label}. Coverage after the move ${after}%.${
              verdict.caution ? ` ${verdict.caution}.` : ''
            }`}
            className="flex w-full cursor-pointer flex-col items-start rounded-[3px] px-[6px] py-[4px] text-left text-[12px] text-text-primary hover:bg-text-primary/[0.05] focus-visible:outline-offset-[-2px]"
          >
            <span className="flex w-full items-center gap-[8px]">
              <span className="min-w-px flex-1 truncate">{sector.label}</span>
              <span className="shrink-0 font-mono text-text-secondary">{after}%</span>
            </span>
            {verdict.caution && (
              <span className="flex items-start gap-[6px] text-[11px] text-status-needs-operator">
                <span aria-hidden>{REACH_WARNING_GLYPH}</span>
                <span>{verdict.caution}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
