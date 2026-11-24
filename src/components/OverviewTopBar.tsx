import { AVAILABLE_UNITS, UNITS } from '../data/assets';
import { MISSION_STATUS } from '../data/plan';
import type { CSSProperties } from 'react';
import { StatDivider, TopBarChrome } from './TopBar';
import { NO_ATTENTION } from '../lib/attention';

/**
 * Screen 1's three readings (frame 171:805). There is no coverage yet and
 * nothing is assigned, so the bar reports the two clocks the operator is
 * working against and how much of the fleet is actually flyable.
 */
export function OverviewTopBar({
  box,
  onRestart,
}: {
  box: CSSProperties;
  onRestart: () => void;
}) {
  /*
   * Nothing is tasked or flying yet, so nothing can need the operator: the
   * strip is just its chevron. The two units in maintenance are a fact about
   * the fleet, not a condition to act on, and carry their own tooltip.
   */
  return (
    <TopBarChrome box={box} attention={NO_ATTENTION} onRestart={onRestart}>
      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">Since landfall:</p>
        <p className="text-[15px] font-semibold text-text-primary">
          {MISSION_STATUS.sinceLandfall}
        </p>
      </div>

      <StatDivider />

      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">Weather window:</p>
        <p className="text-[15px] font-semibold text-text-primary">
          {MISSION_STATUS.weatherWindow}
        </p>
      </div>

      <StatDivider />

      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">Available:</p>
        <p className="font-mono text-[15px] font-medium text-text-primary">
          {AVAILABLE_UNITS.length}
          <span className="font-sans font-semibold"> of </span>
          {UNITS.length}
        </p>
      </div>
    </TopBarChrome>
  );
}
