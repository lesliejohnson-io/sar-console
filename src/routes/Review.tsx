import { DevTools } from '../components/DevTools';
import { Legend } from '../components/Legend';
import { MapLayer } from '../components/MapLayer';
import { Stage } from '../components/Stage';
import { TaskingPanel } from '../components/TaskingPanel';
import { TopBar } from '../components/TopBar';
import { SECTOR_IDS } from '../data/sectors';
import {
  availableCount,
  coverageBySector,
  overall,
  stagedCount,
  unassignedCount,
  unitsIn,
  usePlanStore,
  weakest,
} from '../store/usePlanStore';
import type { SectorId } from '../data/types';

/**
 * Screen 2 · Review proposed tasking.
 *
 * Everything on this screen is derived from one piece of state — the
 * assignments — so a single change moves every number at once.
 */
export function Review() {
  const assignments = usePlanStore((state) => state.assignments);
  const staged = usePlanStore((state) => state.staged);
  const lockedUnits = usePlanStore((state) => state.lockedUnits);
  const selectedSector = usePlanStore((state) => state.selectedSector);

  const coverage = coverageBySector(assignments);
  const weakestSectorId = weakest(assignments);
  const unitsBySector = Object.fromEntries(
    SECTOR_IDS.map((id) => [id, unitsIn(assignments, id)]),
  ) as Record<SectorId, string[]>;

  return (
    <Stage>
      <MapLayer
        unitsBySector={unitsBySector}
        relayUnits={unitsIn(assignments, 'ALL')}
        coverage={coverage}
        selectedSector={selectedSector}
      />

      <TopBar
        overall={overall(assignments)}
        weakest={weakestSectorId}
        weakestPercent={coverage[weakestSectorId]}
        unassigned={unassignedCount(assignments)}
        available={availableCount()}
      />

      <TaskingPanel
        assignments={assignments}
        unitsBySector={unitsBySector}
        relayUnits={unitsIn(assignments, 'ALL')}
        coverage={coverage}
        staged={staged}
        stagedCount={stagedCount(staged)}
        lockedUnits={lockedUnits}
        selectedSector={selectedSector}
      />

      <Legend />
      <DevTools />
    </Stage>
  );
}
