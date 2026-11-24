import { useState } from 'react';
import { PANEL, RAIL_FOOTER_HEIGHT } from '../data/mapGeometry';
import { SECTORS } from '../data/sectors';
import { isBelowTarget } from '../lib/attention';
import { UNAVAILABLE_UNITS } from '../data/assets';
import { formatUnitRange } from '../lib/units';
import { SectorSection } from './SectorSection';
import { useRailSelection } from './RailRow';
import { RailScrollbar, useRailScroll } from './RailScrollbar';
import { RePropoPopover } from './RePropoPopover';
import { UnitRow } from './UnitRow';
import type { Assignments, RailSelection } from '../store/usePlanStore';
import type { SectorId } from '../data/types';

export interface TaskingPanelProps {
  assignments: Assignments;
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  coverage: Record<SectorId, number>;
  staged: Record<SectorId, boolean>;
  stagedCount: number;
  lockedSectors: SectorId[];
  selectedSector: SectorId | null;
  selection: RailSelection | null;
  onSelect: (next: RailSelection | null) => void;
  onMove: (unitId: string, toSector: SectorId) => void;
  onStage: (sectorId: SectorId) => void;
  onToggleLock: (sectorId: SectorId) => void;
  onRePropose: (scope: SectorId | 'all') => void;
  onClearPlan: () => void;
  onReviewAndLaunch: () => void;
}

export function TaskingPanel({
  assignments,
  unitsBySector,
  relayUnits,
  coverage,
  staged,
  stagedCount,
  lockedSectors,
  selectedSector,
  selection,
  onSelect,
  onMove,
  onStage,
  onToggleLock,
  onRePropose,
  onClearPlan,
  onReviewAndLaunch,
}: TaskingPanelProps) {
  const { ref, metrics } = useRailScroll<HTMLDivElement>();
  const select = useRailSelection(ref, selection, onSelect);
  const [reProposing, setReProposing] = useState(false);

  return (
    /*
     * The rail fills its container: the full height of the window, beside
     * the map. See `ConsoleShell`.
     */
    <div className="absolute inset-0 flex flex-col border-l border-border-subtle bg-surface-panel shadow-panel">
      <div
        className="flex shrink-0 items-center gap-[4px] overflow-hidden border-b border-border-subtle pr-[12px] pl-[14px]"
        style={{ height: PANEL.titleHeight }}
      >
        <h2 className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase">
          Proposed tasking
        </h2>
        <div className="h-px min-w-px flex-1" />
        {/*
         * Clearing takes every unit off tasking, apart from the locked ones.
         * There is no confirmation step: nothing has launched yet, and
         * re-proposing puts the autonomy's plan straight back. **Flagged for
         * design review** — no frame draws what the panel looks like
         * afterwards, or says whether a clear should ask first.
         */}
        <button
          type="button"
          onClick={onClearPlan}
          className="flex shrink-0 cursor-pointer items-center overflow-hidden px-[10px] py-[6px]"
        >
          <span className="text-[12px] font-semibold whitespace-nowrap text-text-secondary">
            Clear plan
          </span>
        </button>
        <button
          type="button"
          onClick={() => setReProposing((was) => !was)}
          aria-expanded={reProposing}
          aria-haspopup="dialog"
          className={`flex h-[30px] w-[88px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[2px] border border-interaction-primary px-[10px] py-[3px] ${
            reProposing ? 'bg-interaction-primary/15' : ''
          }`}
        >
          <span className="text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
            Re-propose
          </span>
        </button>
      </div>

      {/*
       * The list scrolls and the action does not.
       *
       * A sector card grows when it carries a warning, and the rail was
       * clipping whatever that pushed past the fold — including, at the
       * bottom, the one button that launches the plan. So the sectors take
       * the space that is left and `REVIEW AND LAUNCH` keeps the foot of the
       * rail, which is where the primary action sits on every screen.
       */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={ref}
          className="absolute inset-0 flex flex-col items-start gap-[8px] overflow-x-hidden overflow-y-auto py-[8px] pr-[14px] pl-[4px] [scrollbar-width:none]"
        >
          {/* Nothing on relay, nothing to say: a cleared plan has no comms row. */}
          {relayUnits.length > 0 && (
            <section className="flex w-full shrink-0 flex-col items-start gap-[2px] overflow-hidden rounded-[4px] px-[6px] pb-[2px]">
              <div className="relative h-[26px] w-full">
                <p className="absolute top-[5px] left-[9px] text-[14px] font-semibold whitespace-nowrap text-text-primary">
                  All sectors
                </p>
                <p className="absolute top-[6px] left-[219px] text-[12px] whitespace-nowrap text-text-secondary">
                  Relay over every sector
                </p>
              </div>
              <UnitRow label={formatUnitRange(relayUnits)} type="GRF" />
            </section>
          )}

          {SECTORS.map((sector) => (
            <SectorSection
              key={sector.id}
              sectorId={sector.id}
              unitIds={unitsBySector[sector.id]}
              assignments={assignments}
              percent={coverage[sector.id]}
              belowTarget={isBelowTarget(coverage[sector.id])}
              staged={staged[sector.id]}
              locked={lockedSectors.includes(sector.id)}
              selection={selection}
              onSelect={select}
              onMove={onMove}
              onStage={onStage}
              onToggleLock={onToggleLock}
            />
          ))}

          <section className="flex w-full shrink-0 flex-col items-start gap-[2px] overflow-hidden rounded-[4px] px-[6px] pb-[2px]">
            <div className="h-[26px] w-full">
              <p className="pt-[5px] pl-[9px] text-[14px] font-semibold whitespace-nowrap text-text-primary">
                Unavailable
              </p>
            </div>
            <UnitRow
              label={formatUnitRange(UNAVAILABLE_UNITS.map((unit) => unit.id))}
              type="ROC"
              dimmed
             
              taskOverride={UNAVAILABLE_UNITS[0].unavailableReason}
              detailOverride="Not assigned"
            />
          </section>

          <div className="min-h-px w-full flex-1" />
        </div>

        <RailScrollbar metrics={metrics} style={{ right: 4, top: 16, bottom: 10 }} />
      </div>

      {reProposing && (
        <RePropoPopover
          assignments={assignments}
          lockedSectors={lockedSectors}
          selectedSector={selectedSector}
          onConfirm={(scope) => {
            onRePropose(scope);
            setReProposing(false);
          }}
          onCancel={() => setReProposing(false)}
        />
      )}

      <div
        className="flex shrink-0 flex-col items-center overflow-hidden px-[10px] py-[4px]"
        style={{ height: RAIL_FOOTER_HEIGHT }}
      >
        <div className="flex h-[44px] w-full shrink-0 flex-col items-center overflow-hidden px-[6px] py-[4px]">
          <button
            type="button"
            onClick={onReviewAndLaunch}
            className="flex h-[40px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[3px] bg-interaction-primary px-[8px] py-[4px]"
          >
            <span className="text-[14px] font-medium whitespace-nowrap text-text-on-interaction">
              REVIEW AND LAUNCH · {stagedCount} SECTORS
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
