import type { ReactNode } from 'react';
import { PANEL, RAIL_FOOTER_HEIGHT, RAIL_SCROLLBAR } from '../data/mapGeometry';
import { SECTORS } from '../data/sectors';
import { formatUnitRange } from '../lib/units';
import { LiveSectorSection } from './LiveSectorSection';
import { RailScrollbar, useRailScroll } from './RailScrollbar';
import { UnitRow } from './UnitRow';
import type { SectorLive } from '../store/useLiveStore';
import type { Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';

export interface SectorStatusPanelProps {
  assignments: Assignments;
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  live: Record<SectorId, SectorLive>;
  outOfContact: string[];
  /** The amber card for a sector that needs the operator, if any. */
  flags: Partial<Record<SectorId, ReactNode>>;
  holding: boolean;
  onToggleHold: () => void;
  lockedUnits: string[];
  onToggleLock: (sectorId: SectorId) => void;
}

/**
 * The right rail on Screen 3 (frames 238:2144 and 289:2394).
 *
 * Same rail, third job: the roster on Screen 1, the tasking table on Screen 2,
 * and here what each sector is actually doing. The primary action stays at the
 * foot of the rail, as it does on every screen — but once the plan is flying
 * the only thing the operator can do to all of it at once is stop it, so the
 * button is drawn as the quiet one.
 */
export function SectorStatusPanel({
  assignments,
  unitsBySector,
  relayUnits,
  live,
  outOfContact,
  flags,
  holding,
  onToggleHold,
  lockedUnits,
  onToggleLock,
}: SectorStatusPanelProps) {
  const { ref, metrics } = useRailScroll<HTMLDivElement>();

  return (
    <>
      <div
        className="absolute rounded-[10px] border border-border-subtle bg-surface-panel shadow-panel"
        style={{ left: PANEL.x, top: PANEL.y, width: PANEL.width, height: PANEL.height }}
      />

      <div
        className="absolute flex items-center gap-[4px] overflow-hidden rounded-tr-[8px] border-t border-r border-b border-border-subtle pr-[12px] pl-[14px]"
        style={{ left: PANEL.x, top: PANEL.y, width: PANEL.width, height: PANEL.titleHeight }}
      >
        <h2 className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase">
          Sector status
        </h2>
        <div className="h-px min-w-px flex-1" />
      </div>

      {/*
        * The list scrolls and the action does not.
        *
        * Four live sectors are taller than the rail, and the one control on
        * this screen stops 36 aircraft: it cannot be a thing the operator has
        * to scroll to find. So the sectors take the space that is left and the
        * button keeps the foot of the rail, which is where the primary action
        * sits on every screen.
        */}
      <div
        ref={ref}
        className="absolute flex flex-col items-start gap-[8px] overflow-x-hidden overflow-y-auto py-[8px] pr-[14px] pl-[4px] [scrollbar-width:none]"
        style={{
          left: PANEL.x,
          top: PANEL.y + PANEL.titleHeight,
          width: PANEL.width,
          height: PANEL.height - PANEL.titleHeight - RAIL_FOOTER_HEIGHT,
        }}
      >
        <div className="flex w-full shrink-0 items-start overflow-hidden px-[12px] py-[2px]">
          <p className="min-w-px flex-1 text-[12px] text-text-secondary">
            Bar: searched so far · tick: where the plan expects to be now
          </p>
        </div>

        <section className="flex w-full shrink-0 flex-col items-start gap-[2px] overflow-hidden rounded-[4px] px-[6px] pb-[2px]">
          <div className="relative h-[26px] w-full">
            <p className="absolute top-[5px] left-[9px] text-[14px] font-semibold whitespace-nowrap text-text-primary">
              All sectors
            </p>
            <p className="absolute top-[6px] left-[219px] text-[12px] whitespace-nowrap text-text-secondary">
              Relay over every sector
            </p>
          </div>
          <UnitRow label={formatUnitRange(relayUnits)} type="GRF" showLockSlot={false} />
        </section>

        {SECTORS.map((sector) => (
          <LiveSectorSection
            key={sector.id}
            sectorId={sector.id}
            unitIds={unitsBySector[sector.id]}
            assignments={assignments}
            live={live[sector.id]}
            outOfContact={outOfContact}
            flag={flags[sector.id]}
            lockedUnits={lockedUnits}
            onToggleLock={onToggleLock}
          />
        ))}

        <div className="min-h-px w-full flex-1" />
      </div>

      <RailScrollbar metrics={metrics} style={RAIL_SCROLLBAR} />

      <div
        className="absolute flex flex-col items-center overflow-hidden px-[10px] py-[4px]"
        style={{
          left: PANEL.x,
          top: PANEL.y + PANEL.height - RAIL_FOOTER_HEIGHT,
          width: PANEL.width,
          height: RAIL_FOOTER_HEIGHT,
        }}
      >
        <div className="flex h-[44px] w-full shrink-0 flex-col items-center overflow-hidden px-[6px] py-[4px]">
          {/*
            * "HOLD ALL UNITS" is frame copy. Releasing them again has no
            * frame: it is drawn in the operator's own teal, because by then
            * the hold is a thing the operator chose. Flagged for review.
            */}
          <button
            type="button"
            onClick={onToggleHold}
            className={`flex h-[40px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[3px] border px-[8px] py-[4px] text-[14px] font-medium whitespace-nowrap ${
              holding
                ? 'border-status-operator-set text-status-operator-set'
                : 'border-text-secondary text-text-primary'
            }`}
          >
            {holding ? 'RELEASE ALL UNITS' : 'HOLD ALL UNITS'}
          </button>
        </div>
      </div>
    </>
  );
}
