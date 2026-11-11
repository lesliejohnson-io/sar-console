import { STAT_BAR, TOP_BAR } from '../data/mapGeometry';
import { SECTORS_BY_ID } from '../data/sectors';
import { PriorityBadge } from './PriorityBadge';
import type { SectorId } from '../data/types';

/** Status only: no action lives up here, by design. */
export interface TopBarProps {
  overall: number;
  weakest: SectorId;
  weakestPercent: number;
  unassigned: number;
  available: number;
}

export function TopBar({
  overall,
  weakest,
  weakestPercent,
  unassigned,
  available,
}: TopBarProps) {
  const sector = SECTORS_BY_ID[weakest];

  return (
    <>
      <div
        className="absolute rounded-[10px] border border-border-subtle bg-surface-panel shadow-top-bar"
        style={{ left: TOP_BAR.x, top: TOP_BAR.y, width: TOP_BAR.width, height: TOP_BAR.height }}
      />

      <p className="absolute top-[15px] left-[21px] text-[22px] font-black whitespace-pre text-text-primary">
        SAR-1102  ·  Coastal Flood Response
      </p>
      <p className="absolute top-[44px] left-[21px] font-mono text-[12px] font-medium whitespace-nowrap text-text-secondary">
        Charleston, SC · 32.705, -80.132
      </p>

      <div
        className="absolute flex items-center gap-[14px] overflow-hidden rounded-tl-[8px] px-[12px] py-[10px]"
        style={{ left: STAT_BAR.x, top: STAT_BAR.y, height: STAT_BAR.height }}
      >
        <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
          <p className="text-[12px] text-text-secondary">Overall coverage:</p>
          <p className="font-mono text-[15px] font-medium text-text-primary">{overall}%</p>
        </div>

        <div className="h-[22px] w-px shrink-0 bg-border-subtle" />

        <div className="flex shrink-0 items-center gap-[5px] overflow-hidden">
          <p className="text-[12px] whitespace-nowrap text-text-secondary">Weakest:</p>
          <p className="text-[15px] font-semibold whitespace-nowrap text-interaction-primary">
            {sector.label} · <span className="font-mono font-medium">{weakestPercent}%</span>
          </p>
          <PriorityBadge priority={sector.priority} />
        </div>

        <div className="h-[22px] w-px shrink-0 bg-border-subtle" />

        <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
          <p className="text-[12px] text-text-secondary">Unassigned:</p>
          <p className="font-mono text-[15px] font-medium text-text-primary">
            {unassigned}
            <span className="font-sans font-semibold"> of </span>
            {available}
          </p>
        </div>
      </div>
    </>
  );
}
