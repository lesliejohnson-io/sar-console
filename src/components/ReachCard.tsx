import { REACH_CARD } from '../data/mapGeometry';
import { REACH_GROUPS, TYPE_NAME, reachOf } from '../data/reach';
import { SECTORS_BY_ID } from '../data/sectors';
import { TYPE_ORDER } from '../data/assets';
import type { SectorId } from '../data/types';

/**
 * What can work a selected sector, and what cannot (frame 177:1326).
 *
 * Every class is listed under one of three headings with a reason in a few
 * words, so the answer to "why so little in Sector D" is one click away on
 * the screen before the plan exists. A class that only partly reaches is
 * named as such rather than left out: Partial is a real answer, and it is the
 * one that explains Sector D.
 *
 * The dot is colour, the heading is words. Neither carries the meaning alone.
 */
export function ReachCard({ sectorId }: { sectorId: SectorId }) {
  const sector = SECTORS_BY_ID[sectorId];

  return (
    <div
      role="dialog"
      aria-label={`${sector.label}, what can reach it`}
      className="absolute z-20 flex flex-col items-start gap-[8px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-app p-[14px] shadow-panel"
      style={{ left: REACH_CARD.x, top: REACH_CARD.y, width: REACH_CARD.width }}
    >
      <p className="text-[14px] font-semibold whitespace-nowrap text-text-primary">
        {sector.label}
      </p>
      <p className="text-[12px] whitespace-nowrap text-text-secondary">
        {sector.priority} priority · {sector.helpCalls} calls for help
      </p>

      {REACH_GROUPS.map((group) => {
        const types = TYPE_ORDER.filter(
          (type) => reachOf(type, sectorId).level === group.level,
        );
        if (types.length === 0) return null;

        return (
          <div key={group.level} className="contents">
            <p className="text-[11px] whitespace-nowrap text-text-secondary">{group.label}</p>
            {types.map((type) => (
              <div key={type} className="flex items-center gap-[8px] overflow-hidden">
                <span
                  aria-hidden
                  className={`block size-[8px] shrink-0 rounded-full ${group.status}`}
                />
                <p className="h-[14px] w-[56px] shrink-0 text-[12px] font-semibold text-text-primary">
                  {TYPE_NAME[type]}
                </p>
                <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
                  {reachOf(type, sectorId).detail}
                </p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
