import { ROSTER_META, ROSTER_ORDER, UNITS_BY_ID, unitsOfType } from '../data/assets';
import { PANEL, ROSTER, UNAVAILABLE_TOOLTIP } from '../data/mapGeometry';
import { RosterCard } from './RosterCard';
import { UnavailableTooltip } from './UnavailableTooltip';
import type { AssetType } from '../data/types';
import type { UnitHover } from '../routes/Overview';

/**
 * Screen 1's right rail: every asset in the operation, before any of it is
 * tasked. The tasking table takes this slot on Screen 2 and the sector status
 * list takes it on Screen 3; the primary action stays at the bottom of it on
 * all three.
 *
 * The rail is the only place that lists assets exhaustively, so it is also
 * where the operator finds out that two Rocs are in maintenance and when they
 * come back.
 */
export function RosterPanel({
  hoveredType,
  onHoverType,
  hover,
  onUnitHover,
  empty,
  proposing,
  onPropose,
}: {
  hoveredType: AssetType | null;
  onHoverType: (type: AssetType | null) => void;
  hover: UnitHover | null;
  onUnitHover: (hover: UnitHover | null) => void;
  /** No sectors drawn yet: the action is there but has nothing to act on. */
  empty: boolean;
  proposing: boolean;
  onPropose: () => void;
}) {
  // Only a hover that started in the rail is answered in the rail; one that
  // started on the map is answered beside the marker it came from.
  const hovered = hover?.from === 'rail' ? UNITS_BY_ID[hover.unitId] : undefined;

  return (
    <>
      <div
        className="absolute rounded-[10px] border border-border-subtle bg-surface-panel shadow-panel"
        style={{ left: PANEL.x, top: PANEL.y, width: PANEL.width, height: PANEL.height }}
      />

      <div
        className="absolute flex items-center overflow-hidden rounded-tr-[8px] border-t border-r border-b border-border-subtle pl-[14px]"
        style={{ left: PANEL.x, top: PANEL.y, width: PANEL.width, height: PANEL.titleHeight }}
      >
        <h1 className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase">
          Asset roster
        </h1>
      </div>

      <div
        className={`absolute ${proposing ? 'opacity-60' : ''}`}
        style={{
          left: ROSTER.content.x,
          top: ROSTER.content.y,
          width: ROSTER.content.width,
          height: PANEL.height - PANEL.titleHeight,
        }}
      >
        <div
          className="absolute flex items-center gap-[12px] pl-[15px]"
          style={{
            left: ROSTER.columns.x,
            top: ROSTER.columns.y,
            width: ROSTER.columns.width,
            height: ROSTER.columns.height,
          }}
        >
          <p className="w-[77px] shrink-0 text-[11px] text-text-secondary">Unit</p>
          <p className="w-[96px] shrink-0 text-[11px] text-text-secondary">Status · site</p>
          <p className="min-w-px flex-1 text-[11px] text-text-secondary">Endurance · link</p>
        </div>

        {ROSTER_ORDER.map((type) => (
          <RosterCard
            key={type}
            type={type}
            hovered={hoveredType === type}
            onHover={onHoverType}
            hover={hover}
            onUnitHover={onUnitHover}
          />
        ))}

        {empty && (
          <p
            className="absolute w-full text-center text-[12px] text-text-secondary"
            style={{ top: ROSTER.hint.y }}
          >
            Draw at least one sector to propose tasking
          </p>
        )}

        <div
          className="absolute flex flex-col items-center px-[6px] py-[4px]"
          style={{
            left: ROSTER.footer.x,
            top: ROSTER.footer.y,
            width: ROSTER.footer.width,
            height: ROSTER.footer.height,
          }}
        >
          <button
            type="button"
            onClick={onPropose}
            className={`flex h-[40px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[3px] ${
              empty
                ? 'border border-border-subtle bg-surface-card'
                : 'bg-interaction-primary'
            }`}
          >
            <span
              className={`text-[14px] font-medium whitespace-nowrap ${
                empty ? 'text-text-secondary' : 'text-text-on-interaction'
              }`}
            >
              {proposing ? 'PROPOSING TASKING…' : 'PROPOSE TASKING'}
            </span>
          </button>
        </div>
      </div>

      {hovered?.unavailableDetail && (
        <UnavailableTooltip
          title={`${hovered.id} · Unavailable`}
          detail={hovered.unavailableDetail}
          expectedBack={hovered.expectedBack ?? ''}
          x={PANEL.x - UNAVAILABLE_TOOLTIP.width}
          y={rowCentre(hovered.id) - UNAVAILABLE_TOOLTIP.height / 2}
        />
      )}
    </>
  );
}

/** Where a given unit's roster row sits in the stage, measured to its middle. */
function rowCentre(unitId: string): number {
  const type = UNITS_BY_ID[unitId].type;
  const units = unitsOfType(type);
  const available = units.filter((unit) => unit.status !== 'unavailable');
  const unavailable = units.filter((unit) => unit.status === 'unavailable');

  const before = ROSTER_META[type].collapse ? 1 : available.length;
  const index = unavailable.findIndex((unit) => unit.id === unitId);
  const note = ROSTER_META[type].collapse ? 18 : 0;

  const top = 5 + 30 + 2 + note + (before + index) * 30;
  return ROSTER.content.y + ROSTER.cardTop[type] + top + ROSTER.row.height / 2;
}
