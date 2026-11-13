import { ROSTER_META, ROSTER_UNAVAILABLE, unitsOfType } from '../data/assets';
import { ROSTER } from '../data/mapGeometry';
import { formatUnitRange } from '../lib/units';
import { RosterRow } from './RosterRow';
import type { AssetType } from '../data/types';
import type { UnitHover } from '../routes/Overview';

/**
 * One class of asset in the roster: a heading with how many there are, and
 * then the units themselves.
 *
 * Per the roster-grouping note on page 118:1271, units that share a status, a
 * site and a link strength collapse into one row. The frame applies that to
 * the 24 Hydras only — `ROSTER_META.collapse` carries which classes it is
 * true of — and the collapsed row says so in its own words above itself, so
 * the count is never a mystery.
 *
 * Pointing at the card draws the class's range on the map. That is a hover on
 * a whole region rather than a control, so the card is also focusable: the
 * keyboard gets the same ring from the same handler.
 */
export function RosterCard({
  type,
  hovered,
  onHover,
  hover,
  onUnitHover,
}: {
  type: AssetType;
  hovered: boolean;
  onHover: (type: AssetType | null) => void;
  hover: UnitHover | null;
  onUnitHover: (hover: UnitHover | null) => void;
}) {
  const meta = ROSTER_META[type];
  const units = unitsOfType(type);
  const available = units.filter((unit) => unit.status !== 'unavailable');
  const unavailable = units.filter((unit) => unit.status === 'unavailable');

  const count =
    unavailable.length > 0
      ? `${available.length} available · ${unavailable.length} unavailable`
      : `${available.length} available`;

  return (
    <section
      aria-labelledby={`roster-${type}`}
      tabIndex={0}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(type)}
      onBlur={() => onHover(null)}
      className={`absolute flex flex-col items-start gap-[2px] overflow-hidden rounded-[6px] border bg-surface-card pt-[5px] pr-[6px] pb-[6px] pl-[6px] ${
        hovered ? 'border-text-secondary' : 'border-surface-card'
      }`}
      style={{
        left: ROSTER.card.x,
        top: ROSTER.cardTop[type],
        width: ROSTER.card.width,
      }}
    >
      <div className="flex h-[30px] w-full shrink-0 items-center gap-[8px] overflow-hidden pr-[5px] pl-[9px]">
        {/*
          * The type's name is the card's heading and its accessible name
          * both, so the roster can be navigated by heading rather than as
          * four separate regions competing with the map and the rail.
          */}
        <h3
          id={`roster-${type}`}
          className="shrink-0 text-[14px] font-semibold whitespace-nowrap text-text-primary"
        >
          {meta.className}
        </h3>
        <div className="h-px min-w-px flex-1" />
        <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">{count}</p>
      </div>

      {meta.collapse ? (
        <>
          <div className="flex shrink-0 items-start overflow-hidden pb-[2px] pl-[9px]">
            <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
              {available.length} units with the same status, site and link
            </p>
          </div>
          <RosterRow
            unitId={formatUnitRange(available.map((unit) => unit.id))}
            statusSite={meta.statusSite}
            endurance={meta.endurance}
          />
        </>
      ) : (
        available.map((unit) => (
          <RosterRow
            key={unit.id}
            unitId={unit.id}
            statusSite={meta.statusSite}
            endurance={meta.endurance}
          />
        ))
      )}

      {unavailable.map((unit) => (
        <RosterRow
          key={unit.id}
          unitId={unit.id}
          statusSite={ROSTER_UNAVAILABLE.statusSite}
          endurance={ROSTER_UNAVAILABLE.endurance}
          dimmed
          highlighted={hover?.unitId === unit.id}
          onHover={(hovering) =>
            onUnitHover(hovering ? { unitId: unit.id, from: 'rail' } : null)
          }
        />
      ))}
    </section>
  );
}
