import { beforeEach, describe, expect, it } from 'vitest';
import {
  coverageAfterMove,
  coverageBySector,
  overall,
  sectorCoverage,
  stagedCount,
  unitsIn,
  rePropoPreview,
  sectorSelection,
  usePlanStore,
  weakest,
  type Assignments,
} from './usePlanStore';
import { MISSION_TIME, PROPOSED_ASSIGNMENTS } from '../data/plan';
import { SECTOR_IDS } from '../data/sectors';
import type { SectorId } from '../data/types';

const state = () => usePlanStore.getState();
const move = (unitId: string, to: SectorId) => state().moveUnit(unitId, to);

beforeEach(() => {
  usePlanStore.getState().reset();
});

describe('moveUnit', () => {
  it('marks a moved unit as set by the operator, with where and when', () => {
    move('KRK-03', 'D');

    expect(state().assignments['KRK-03']).toEqual({
      unitId: 'KRK-03',
      target: 'D',
      source: 'operator',
      movedFrom: 'B',
      at: MISSION_TIME,
    });
  });

  it('leaves the unit in its old sector out of that sector', () => {
    move('KRK-03', 'D');

    expect(unitsIn(state().assignments, 'B')).not.toContain('KRK-03');
    expect(unitsIn(state().assignments, 'D')).toContain('KRK-03');
  });

  it('is the demo move: both Krakens to Sector D', () => {
    move('KRK-03', 'D');
    move('KRK-04', 'D');

    const coverage = coverageBySector(state().assignments);
    expect(coverage).toEqual({ A: 92, B: 83, C: 87, D: 82 });
    expect(overall(state().assignments)).toBe(86);
    expect(weakest(state().assignments)).toBe('D');
  });

  it('does nothing when a unit is moved to the sector it is already in', () => {
    const before = state().assignments;
    move('KRK-03', 'B');

    expect(state().assignments).toBe(before);
    expect(state().assignments['KRK-03'].source).toBe('autonomy');
  });

  it('refuses a move the reach rule disallows and leaves the plan alone', () => {
    const before = state().assignments;

    move('GRF-02', 'B'); // Griffins fly relay, never one sector

    expect(state().assignments).toBe(before);
    expect(coverageBySector(state().assignments)).toEqual({ A: 92, B: 89, C: 87, D: 44 });
  });

  it('allows a move into a sector the type only partly reaches', () => {
    // Sector D is at the Hydras' limit, so the drop carries a caution — but
    // the console never blocks the operator over one.
    move('HYD-01', 'D');

    expect(state().assignments['HYD-01'].target).toBe('D');
    expect(state().assignments['HYD-01'].source).toBe('operator');
  });

  it('still lets a Hydra the autonomy placed in Sector D be moved out', () => {
    move('HYD-21', 'C');

    expect(state().assignments['HYD-21'].target).toBe('C');
    expect(state().assignments['HYD-21'].movedFrom).toBe('D');
    expect(sectorCoverage(state().assignments, 'C')).toBe(90);
  });
});

describe('staging', () => {
  it('opens with A, B and C staged', () => {
    expect(state().staged).toEqual({ A: true, B: true, C: true, D: false });
    expect(stagedCount(state().staged)).toBe(3);
  });

  it('returns both sectors to "Stage sector" when the operator moves a unit', () => {
    // Nothing launches unseen: the sector that lost a unit and the one that
    // gained it both have to be looked at again.
    move('KRK-03', 'D');

    expect(state().staged.B).toBe(false);
    expect(state().staged.D).toBe(false);
    expect(state().staged.A).toBe(true);
    expect(stagedCount(state().staged)).toBe(2);
  });

  it('does not un-stage anything when the move is refused', () => {
    move('GRF-02', 'B');

    expect(stagedCount(state().staged)).toBe(3);
  });

  it('can be staged again by hand', () => {
    move('KRK-03', 'D');
    state().setStaged('B', true);

    expect(state().staged.B).toBe(true);
  });
});

describe('launch', () => {
  it('has launched nothing until the operator says so', () => {
    expect(state().launched).toBeNull();
  });

  it('sends up the staged sectors, and only those', () => {
    state().launch();

    expect(state().launched).toEqual(['A', 'B', 'C']);
  });

  it('freezes what went up, so later staging does not rewrite history', () => {
    state().launch();
    state().setStaged('D', true);

    expect(state().launched).toEqual(['A', 'B', 'C']);
  });

  it('carries an operator move through to the launch', () => {
    move('KRK-03', 'D');
    state().setStaged('B', true);
    state().setStaged('D', true);
    state().launch();

    expect(state().launched).toEqual(['A', 'B', 'C', 'D']);
    expect(unitsIn(state().assignments, 'D')).toContain('KRK-03');
  });
});

describe('coverageAfterMove', () => {
  it('is what the drop actually produces', () => {
    const preview = coverageAfterMove(state().assignments, 'KRK-03', 'D');
    move('KRK-03', 'D');

    expect(preview).toBe(68);
    expect(sectorCoverage(state().assignments, 'D')).toBe(preview);
  });

  it('returns a sector unchanged when the unit is already in it', () => {
    expect(coverageAfterMove(state().assignments, 'KRK-03', 'B')).toBe(89);
  });
});

/* ------------------------------------- the panel header's two controls ------ */
/*
 * Locking a sector, re-proposing, and clearing the plan. What these pin down
 * is the one promise the re-propose popover makes: handing the plan back to
 * the autonomy does not quietly undo the operator's own decisions.
 */

const plan = () => usePlanStore.getState();
const proposedTarget = (unitId: string) =>
  PROPOSED_ASSIGNMENTS.find((one) => one.unitId === unitId)!.target;

describe('locking a sector', () => {
  it('opens with nothing locked', () => {
    expect(plan().lockedSectors).toEqual([]);
  });

  it('locks the sector itself, and unlocks it again', () => {
    plan().toggleSectorLock('A');
    expect(plan().lockedSectors).toEqual(['A']);

    plan().toggleSectorLock('A');
    expect(plan().lockedSectors).toEqual([]);
  });

  it('leaves other sectors alone', () => {
    plan().toggleSectorLock('A');
    expect(plan().lockedSectors).not.toContain('B');
  });

  it('stays locked when the operator moves a unit in or out', () => {
    plan().toggleSectorLock('B');
    plan().toggleSectorLock('D');
    plan().moveUnit('KRK-03', 'D');

    expect(plan().lockedSectors).toEqual(['B', 'D']);
  });

  it('does not stop the operator moving a unit out of a locked sector', () => {
    plan().toggleSectorLock('B');
    plan().moveUnit('KRK-03', 'D');

    expect(plan().assignments['KRK-03'].target).toBe('D');
    expect(plan().assignments['KRK-03'].source).toBe('operator');
  });
});

describe('re-proposing', () => {
  it('puts an autonomy-placed unit back where the autonomy wants it', () => {
    // A unit the operator moved, then unmarked by clearing its source.
    const assignments: Assignments = {
      ...plan().assignments,
      'HYD-01': { unitId: 'HYD-01', target: 'D', source: 'autonomy' },
    };
    usePlanStore.setState({ assignments });

    plan().rePropose('all');
    expect(plan().assignments['HYD-01'].target).toBe(proposedTarget('HYD-01'));
  });

  it('keeps a unit the operator moved', () => {
    plan().moveUnit('KRK-03', 'D');
    plan().rePropose('all');

    expect(plan().assignments['KRK-03'].target).toBe('D');
    expect(plan().assignments['KRK-03'].source).toBe('operator');
  });

  it('keeps a unit in a locked sector even when the autonomy wants it elsewhere', () => {
    usePlanStore.setState({
      assignments: {
        ...plan().assignments,
        'HYD-01': { unitId: 'HYD-01', target: 'D', source: 'autonomy' },
      },
      lockedSectors: ['D'],
    });

    plan().rePropose('all');
    expect(plan().assignments['HYD-01'].target).toBe('D');
  });

  it('sends nothing into a locked sector', () => {
    usePlanStore.setState({
      assignments: {
        ...plan().assignments,
        'HYD-01': { unitId: 'HYD-01', target: 'D', source: 'autonomy' },
      },
      lockedSectors: ['A'],
    });

    plan().rePropose('all');
    expect(plan().assignments['HYD-01'].target).toBe('D');
  });

  it('touches only the sector in scope', () => {
    usePlanStore.setState({
      assignments: {
        ...plan().assignments,
        'HYD-01': { unitId: 'HYD-01', target: 'D', source: 'autonomy' },
        'HYD-20': { unitId: 'HYD-20', target: 'D', source: 'autonomy' },
      },
    });

    // Scope A: HYD-01 belongs to A and comes home; HYD-20 belongs to C and
    // stays where it was put.
    plan().rePropose('A');
    expect(plan().assignments['HYD-01'].target).toBe(proposedTarget('HYD-01'));
    expect(plan().assignments['HYD-20'].target).toBe('D');
  });

  it('returns every sector it changed to "Stage sector"', () => {
    SECTOR_IDS.forEach((id) => plan().setStaged(id, true));
    usePlanStore.setState({
      assignments: {
        ...plan().assignments,
        'HYD-01': { unitId: 'HYD-01', target: 'D', source: 'autonomy' },
      },
    });

    plan().rePropose('all');
    // HYD-01 came back from D to A, so both ends are no longer staged.
    expect(plan().staged.A).toBe(false);
    expect(plan().staged.D).toBe(false);
    expect(plan().staged.B).toBe(true);
  });

  it('is a no-op on the plan the autonomy already proposed', () => {
    const before = JSON.stringify(plan().assignments);
    plan().rePropose('all');
    expect(JSON.stringify(plan().assignments)).toBe(before);
  });
});

describe('the re-propose preview', () => {
  it('counts what the demo opens with: nothing kept, every unit may change', () => {
    const preview = rePropoPreview(plan().assignments, plan().lockedSectors, 'all');

    expect(preview.keeps).toEqual([]);
    expect(preview.mayChange).toBe(Object.keys(plan().assignments).length);
  });

  it('keeps every unit in a locked sector', () => {
    plan().toggleSectorLock('D');
    const preview = rePropoPreview(plan().assignments, plan().lockedSectors, 'all');

    expect(preview.keeps).toEqual([
      { unitIds: unitsIn(plan().assignments, 'D'), reason: 'locked' },
    ]);
  });

  it('keeps the operator\'s move after the move the demo is about', () => {
    plan().moveUnit('KRK-03', 'D');
    plan().moveUnit('KRK-04', 'D');

    const preview = rePropoPreview(plan().assignments, plan().lockedSectors, 'all');
    expect(preview.keeps).toEqual([{ unitIds: ['KRK-03', 'KRK-04'], reason: 'operator' }]);
    expect(preview.mayChange).toBe(34);
  });

  it('lists a unit that is both locked and operator-set once, as locked', () => {
    plan().moveUnit('KRK-03', 'D');
    plan().toggleSectorLock('D');

    const preview = rePropoPreview(plan().assignments, plan().lockedSectors, 'all');
    const named = preview.keeps.flatMap((group) => group.unitIds);
    expect(named.filter((id) => id === 'KRK-03')).toHaveLength(1);
    expect(preview.keeps.find((g) => g.reason === 'locked')!.unitIds).toContain('KRK-03');
  });

  it('promises exactly what re-proposing then does', () => {
    plan().moveUnit('KRK-03', 'D');
    const preview = rePropoPreview(plan().assignments, plan().lockedSectors, 'all');
    const kept = preview.keeps.flatMap((group) => group.unitIds);
    const before = Object.fromEntries(
      Object.values(plan().assignments).map((one) => [one.unitId, one.target]),
    );

    plan().rePropose('all');

    for (const unitId of kept) {
      expect(plan().assignments[unitId].target).toBe(before[unitId]);
    }
  });
});

describe('clearing the plan', () => {
  it('takes every unit off tasking when nothing is locked', () => {
    plan().clearPlan();
    expect(Object.keys(plan().assignments)).toEqual([]);
  });

  it('leaves a locked sector as it was', () => {
    const d = unitsIn(plan().assignments, 'D');
    plan().toggleSectorLock('D');
    plan().clearPlan();

    expect(Object.keys(plan().assignments).sort()).toEqual([...d].sort());
  });

  it('unstages every sector, so nothing can launch on an empty plan', () => {
    SECTOR_IDS.forEach((id) => plan().setStaged(id, true));
    plan().clearPlan();
    expect(SECTOR_IDS.every((id) => plan().staged[id] === false)).toBe(true);
  });

  it('is undone by re-proposing', () => {
    // Compared as a map of unit to sector: re-proposing puts units back in a
    // different order, which is not a difference.
    const targets = () =>
      Object.fromEntries(
        Object.values(plan().assignments).map((one) => [one.unitId, one.target]),
      );

    const before = targets();
    plan().clearPlan();
    plan().rePropose('all');
    expect(targets()).toEqual(before);
  });
});

describe('selecting a rail row', () => {
  it('opens with Sector D selected, as frame 158:572 draws it', () => {
    expect(plan().selection).toEqual(sectorSelection('D'));
    expect(plan().selectedSector).toBe('D');
  });

  it('selects the sector a unit row is in, so the map follows the rail', () => {
    plan().select({ key: 'unit:KRK-01', sector: 'B', unitIds: ['KRK-01'] });
    expect(plan().selectedSector).toBe('B');
  });

  it('clears the selected sector along with the selection', () => {
    plan().select(null);
    expect(plan().selection).toBeNull();
    expect(plan().selectedSector).toBeNull();
  });

  it('lets go of the selection when the plan launches', () => {
    plan().launch();
    expect(plan().selection).toBeNull();
    expect(plan().selectedSector).toBeNull();
  });
});
