import { AVAILABLE_UNITS, UNITS } from '../data/assets';
import { MISSION_STATUS } from '../data/plan';
import { OVERVIEW_STAT_BAR } from '../data/mapGeometry';
import { StatDivider, TopBarChrome } from './TopBar';

/**
 * Screen 1's three readings (frame 171:805). There is no coverage yet and
 * nothing is assigned, so the bar reports the two clocks the operator is
 * working against and how much of the fleet is actually flyable.
 */
export function OverviewTopBar() {
  return (
    <TopBarChrome statX={OVERVIEW_STAT_BAR.x}>
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
