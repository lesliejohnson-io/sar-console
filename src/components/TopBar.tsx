import type { CSSProperties, ReactNode } from 'react';
import { LIVE_SHELL } from '../data/mapGeometry';
import { SECTORS_BY_ID } from '../data/sectors';
import type { Attention } from '../lib/attention';
import { PriorityBadge } from './PriorityBadge';
import { RestartDemo } from './RestartDemo';
import { StatusKey, StatusStrip, useStatusKeyOpen } from './StatusStrip';
import type { SectorId } from '../data/types';

/**
 * The bar itself. The first row holds the mission's name and place, with a
 * row of figures at the right. The second row, under a hairline, holds the
 * status strip at the right and the demo's restart at the left. The state key
 * opens beneath both when asked for. Every screen carries it, so what changes
 * between screens is only which figures the first row holds and what the strip
 * counts.
 *
 * Both right-hand rows are anchored by the bar's right edge. The bar stretches
 * across the map area, so a row placed from the left would drift away from the
 * edge it belongs against as the window widens. The strip also grows leftward
 * as states come and go, so its right edge never moves.
 */
export function TopBarChrome({
  box,
  attention,
  onRestart,
  children,
}: {
  /** Where the bar sits: stretched across the map area by the console shell. */
  box: CSSProperties;
  attention: Attention;
  /** The demo's reset. Omitted on a step that has no way back to the start. */
  onRestart?: () => void;
  children: ReactNode;
}) {
  const [keyOpen, toggleKey] = useStatusKeyOpen();

  return (
    <header
      className="absolute z-30 flex flex-col border border-border-subtle bg-surface-panel shadow-top-bar"
      style={box}
    >
      <div className="relative w-full shrink-0" style={{ height: LIVE_SHELL.headerHeight - 2 }}>
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

        <div className="absolute inset-y-0 right-0 flex items-center gap-[14px] overflow-hidden px-[12px] py-[10px]">
          {children}
        </div>
      </div>

      <div
        className="flex w-full shrink-0 items-center gap-[12px] border-t border-border-subtle px-[12px]"
        style={{ height: LIVE_SHELL.stripHeight }}
      >
        {onRestart && <RestartDemo onRestart={onRestart} />}
        <div className="ml-auto">
          <StatusStrip attention={attention} open={keyOpen} onToggle={toggleKey} />
        </div>
      </div>

      {keyOpen && <StatusKey />}
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
  box: CSSProperties;
  attention: Attention;
  onRestart?: () => void;
}

export function TopBar({
  overall,
  weakest,
  weakestPercent,
  unassigned,
  available,
  box,
  attention,
  onRestart,
}: TopBarProps) {
  const sector = SECTORS_BY_ID[weakest];

  return (
    <TopBarChrome box={box} attention={attention} onRestart={onRestart}>
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
