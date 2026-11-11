import { PANEL } from '../data/mapGeometry';
import { SECTORS, COVERAGE_TARGET } from '../data/sectors';
import { UNAVAILABLE_UNITS } from '../data/assets';
import { formatUnitRange } from '../lib/units';
import { SectorSection } from './SectorSection';
import { UnitRow } from './UnitRow';
import type { Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';

export interface TaskingPanelProps {
  assignments: Assignments;
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  coverage: Record<SectorId, number>;
  staged: Record<SectorId, boolean>;
  stagedCount: number;
  lockedUnits: string[];
  selectedSector: SectorId | null;
}

export function TaskingPanel({
  assignments,
  unitsBySector,
  relayUnits,
  coverage,
  staged,
  stagedCount,
  lockedUnits,
  selectedSector,
}: TaskingPanelProps) {
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
        <h1 className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase">
          Proposed tasking
        </h1>
        <div className="h-px min-w-px flex-1" />
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center overflow-hidden px-[10px] py-[6px]"
        >
          <span className="text-[12px] font-semibold whitespace-nowrap text-text-secondary">
            Clear plan
          </span>
        </button>
        <button
          type="button"
          className="flex h-[30px] w-[88px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[2px] border border-interaction-primary px-[10px] py-[3px]"
        >
          <span className="text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
            Re-propose
          </span>
        </button>
      </div>

      <div
        className="absolute flex flex-col items-start gap-[8px] overflow-hidden py-[8px] pr-[14px] pl-[4px]"
        style={{
          left: PANEL.x,
          top: PANEL.y + PANEL.titleHeight,
          width: PANEL.width,
          height: PANEL.height - PANEL.titleHeight,
        }}
      >
        <div className="flex w-full shrink-0 items-start overflow-hidden px-[12px] py-[2px]">
          <p className="min-w-px flex-1 text-[12px] text-text-secondary">
            Expected coverage, next 2 h · tick marks the {COVERAGE_TARGET}% target
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
          <SectorSection
            key={sector.id}
            sectorId={sector.id}
            unitIds={unitsBySector[sector.id]}
            assignments={assignments}
            percent={coverage[sector.id]}
            belowTarget={coverage[sector.id] < COVERAGE_TARGET}
            staged={staged[sector.id]}
            selected={sector.id === selectedSector}
            lockedUnits={lockedUnits}
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
            showLockSlot={false}
            taskOverride={UNAVAILABLE_UNITS[0].unavailableReason}
            detailOverride="Not assigned"
          />
        </section>

        <div className="flex h-[44px] w-full shrink-0 flex-col items-center overflow-hidden px-[6px] py-[4px]">
          <button
            type="button"
            className="flex h-[40px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[3px] bg-interaction-primary px-[8px] py-[4px]"
          >
            <span className="text-[14px] font-medium whitespace-nowrap text-text-on-interaction">
              REVIEW AND LAUNCH · {stagedCount} SECTORS
            </span>
          </button>
        </div>

        <div className="min-h-px w-full flex-1" />

        <div className="absolute top-[24px] right-[4px] bottom-[54px] w-[4px]">
          <div className="absolute top-0 left-0 h-[832px] w-[4px] rounded-[2px] bg-text-secondary opacity-15" />
          <div className="absolute top-0 left-0 h-[599px] w-[4px] rounded-[2px] bg-text-secondary opacity-60" />
        </div>
      </div>
    </>
  );
}
