import { ROSTER_META, ROSTER_ORDER, UNITS_BY_ID, unitsOfType } from '../data/assets';
import { PANEL, ROSTER, UNAVAILABLE_TOOLTIP } from '../data/mapGeometry';
import { RailScrollbar, useRailScroll } from './RailScrollbar';
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

  const { ref, metrics } = useRailScroll<HTMLDivElement>();

  return (
    /*
     * The rail fills its container: the full height of the window, beside
     * the map. See `ConsoleShell`. It does not clip, because the unavailable
     * tooltip opens out of it to the left, over the map.
     */
    <div className="absolute inset-0 flex flex-col border-l border-border-subtle bg-surface-panel shadow-panel">
      <div
        className="flex shrink-0 items-center overflow-hidden border-b border-border-subtle pl-[14px]"
        style={{ height: PANEL.titleHeight }}
      >
        <h2 className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase">
          Asset roster
        </h2>
      </div>

      {/*
       * The cards scroll and the action does not, as on the other two rails:
       * in a short window the roster runs past the fold, and `PROPOSE TASKING`
       * keeps the foot of the rail.
       */}
      <div className={`relative min-h-0 flex-1 ${proposing ? 'opacity-60' : ''}`}>
        <div
          ref={ref}
          className="absolute inset-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none]"
        >
          <div className="relative w-full" style={{ height: ROSTER.cardsHeight }}>
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
          </div>
        </div>

        <RailScrollbar metrics={metrics} style={{ right: 4, top: 16, bottom: 10 }} />
      </div>

      <div
        className={`flex shrink-0 flex-col items-center pt-[4px] pr-[14px] pb-[8px] pl-[4px] ${
          proposing ? 'opacity-60' : ''
        }`}
      >
        {empty && (
          <p className="pb-[8px] text-center text-[12px] text-text-secondary">
            Draw at least one sector to propose tasking
          </p>
        )}

        <div className="flex h-[44px] w-full flex-col items-center px-[6px] py-[4px]">
          <button
            type="button"
            onClick={onPropose}
            className={`flex h-[40px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[3px] ${
              empty ? 'border border-border-subtle bg-surface-card' : 'bg-interaction-primary'
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
          x={-UNAVAILABLE_TOOLTIP.width}
          y={rowCentre(hovered.id) - metrics.scrollTop - UNAVAILABLE_TOOLTIP.height / 2}
        />
      )}
    </div>
  );
}

/** Where a given unit's roster row sits in the rail, measured to its middle. */
function rowCentre(unitId: string): number {
  const type = UNITS_BY_ID[unitId].type;
  const units = unitsOfType(type);
  const available = units.filter((unit) => unit.status !== 'unavailable');
  const unavailable = units.filter((unit) => unit.status === 'unavailable');

  const before = ROSTER_META[type].collapse ? 1 : available.length;
  const index = unavailable.findIndex((unit) => unit.id === unitId);
  const note = ROSTER_META[type].collapse ? 18 : 0;

  const top = 5 + 30 + 2 + note + (before + index) * 30;
  return PANEL.titleHeight + ROSTER.cardTop[type] + top + ROSTER.row.height / 2;
}
