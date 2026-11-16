import type { CSSProperties, ReactNode } from 'react';
import { STAT_BAR, TOP_BAR_BOX, TOP_BAR_STAT } from '../data/mapGeometry';
import { SECTORS_BY_ID } from '../data/sectors';
import { PriorityBadge } from './PriorityBadge';
import type { SectorId } from '../data/types';

/**
 * The bar itself: the mission's name and place, and a row of figures at the
 * right. Every screen carries it and no screen puts an action in it, so what
 * changes between them is only which figures the row holds and where the row
 * begins — Screen 1's three readings start further right than Screen 2's.
 */
export function TopBarChrome({
  statX,
  statRight,
  box = TOP_BAR_BOX,
  children,
}: {
  /** Where the row of readings starts, measured inside the bar. */
  statX?: number;
  /**
   * Anchors the row by the bar's right edge instead. Screen 3's readings
   * change width as the mission goes — "Behind plan" becomes "Incident" — and
   * in every frame the row ends against the same edge of the bar.
   */
  statRight?: number;
  /**
   * Where the bar itself sits. The fixed stage places it at the frame's own
   * (9, 12); the live shell stretches it across the map area instead, so it
   * stays the width of the map at any window size.
   */
  box?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <header
      className="absolute rounded-[10px] border border-border-subtle bg-surface-panel shadow-top-bar"
      style={box}
    >
      {/*
        * The mission is the page's one h1, so a screen reader landing on any
        * screen is told which mission it is looking at before anything else.
        * The panels below are h2s under it.
        */}
      <h1 className="absolute top-[3px] left-[12px] text-[22px] font-black whitespace-pre text-text-primary">
        SAR-1102  ·  Coastal Flood Response
      </h1>
      <p className="absolute top-[32px] left-[12px] font-mono text-[12px] font-medium whitespace-nowrap text-text-secondary">
        Charleston, SC · 32.705, -80.132
      </p>

      <div
        className="absolute top-0 flex items-center gap-[14px] overflow-hidden rounded-tl-[8px] px-[12px] py-[10px]"
        style={{ left: statX, right: statRight, height: STAT_BAR.height }}
      >
        {children}
      </div>
    </header>
  );
}

/** A thin rule between two readings. */
export function StatDivider() {
  return <div className="h-[22px] w-px shrink-0 bg-border-subtle" />;
}

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
    <TopBarChrome statX={TOP_BAR_STAT.reviewX}>
      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">Overall coverage:</p>
        <p className="font-mono text-[15px] font-medium text-text-primary">{overall}%</p>
      </div>

      <StatDivider />

      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden">
        <p className="text-[12px] whitespace-nowrap text-text-secondary">Weakest:</p>
        <p className="text-[15px] font-semibold whitespace-nowrap text-interaction-primary">
          {sector.label} · <span className="font-mono font-medium">{weakestPercent}%</span>
        </p>
        <PriorityBadge priority={sector.priority} />
      </div>

      <StatDivider />

      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">Unassigned:</p>
        <p className="font-mono text-[15px] font-medium text-text-primary">
          {unassigned}
          <span className="font-sans font-semibold"> of </span>
          {available}
        </p>
      </div>
    </TopBarChrome>
  );
}
