import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Legend } from '../components/Legend';
import { RestartDemo } from '../components/RestartDemo';
import { LiveRegion } from '../components/LiveRegion';
import { MapLayer, type FannedGroupId } from '../components/MapLayer';
import { Stage } from '../components/Stage';
import { TaskingPanel } from '../components/TaskingPanel';
import { TopBar } from '../components/TopBar';
import { SECTORS_BY_ID, SECTOR_IDS } from '../data/sectors';
import {
  availableCount,
  coverageBySector,
  overall,
  sectorCoverage,
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
 * assignments — so a single change moves every number at once. This route owns
 * the two things that are not part of the plan: which group the operator has
 * opened on the map, and what was last announced.
 */
export function Review() {
  const navigate = useNavigate();
  const assignments = usePlanStore((state) => state.assignments);
  const staged = usePlanStore((state) => state.staged);
  const lockedUnits = usePlanStore((state) => state.lockedUnits);
  const selectedSector = usePlanStore((state) => state.selectedSector);
  const moveUnit = usePlanStore((state) => state.moveUnit);
  const setStaged = usePlanStore((state) => state.setStaged);
  const reset = usePlanStore((state) => state.reset);

  const [fanned, setFanned] = useState<FannedGroupId | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /**
   * `speak` is false for a move that came from the map: dnd-kit already
   * announces the drag in its own region, and two regions saying the same
   * sentence is heard as a stutter.
   */
  const handleMove = useCallback(
    (unitId: string, toSector: SectorId, speak = true) => {
      const from = usePlanStore.getState().assignments[unitId]?.target;
      moveUnit(unitId, toSector);

      // The store refuses a move the reach rule disallows, so say nothing
      // rather than announce one that did not happen.
      const next = usePlanStore.getState().assignments;
      if (!speak || next[unitId]?.target !== toSector) return;

      const after = sectorCoverage(next, toSector);
      const origin = from && from !== 'ALL' ? `Sector ${from}` : 'relay';
      setAnnouncement(
        `${unitId} moved from ${origin} to Sector ${toSector}. Sector ${toSector} coverage ${after}%.`,
      );

      // The row the operator was standing on has just left this sector, taking
      // the keyboard's place in the document with it. Put focus on the card it
      // left rather than dropping it to the top of the page.
      if (from && from !== 'ALL') {
        requestAnimationFrame(() =>
          document.getElementById(`sector-card-${from}`)?.focus({ preventScroll: true }),
        );
      }
    },
    [moveUnit],
  );

  const handleMapMove = useCallback(
    (unitId: string, toSector: SectorId) => handleMove(unitId, toSector, false),
    [handleMove],
  );

  // A refused drop is announced by dnd-kit along with the rest of the drag;
  // nothing is written to the plan, so there is nothing more to say here.
  const handleRefuse = useCallback(() => {}, []);

  const handleStage = useCallback(
    (sectorId: SectorId) => {
      setStaged(sectorId, true);
      setAnnouncement(`${SECTORS_BY_ID[sectorId].label} staged for launch.`);
    },
    [setStaged],
  );

  const coverage = coverageBySector(assignments);
  const weakestSectorId = weakest(assignments);
  const unitsBySector = Object.fromEntries(
    SECTOR_IDS.map((id) => [id, unitsIn(assignments, id)]),
  ) as Record<SectorId, string[]>;

  return (
    <Stage>
      <MapLayer
        assignments={assignments}
        unitsBySector={unitsBySector}
        relayUnits={unitsIn(assignments, 'ALL')}
        coverage={coverage}
        selectedSector={selectedSector}
        fanned={fanned}
        onFan={setFanned}
        onMove={handleMapMove}
        onRefuse={handleRefuse}
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
        onMove={handleMove}
        onStage={handleStage}
        onReviewAndLaunch={() => navigate('/review/launch')}
      />

      <Legend />
      <RestartDemo
        onRestart={() => {
          reset();
          navigate('/overview');
        }}
      />
      <LiveRegion message={announcement} />
    </Stage>
  );
}
