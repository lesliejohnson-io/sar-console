import { beforeEach, describe, expect, it } from 'vitest';
import {
  coverageAfterMove,
  coverageBySector,
  overall,
  sectorCoverage,
  stagedCount,
  unitsIn,
  rePropoPreview,
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
  it('locks every unit in it, and unlocks them again', () => {
    const units = unitsIn(plan().assignments, 'A');
    expect(units.length).toBeGreaterThan(0);

    plan().toggleSectorLock('A');
    expect(units.every((id) => plan().lockedUnits.includes(id))).toBe(true);

    plan().toggleSectorLock('A');
    expect(units.some((id) => plan().lockedUnits.includes(id))).toBe(false);
  });

  it('leaves other sectors alone', () => {
    const before = [...plan().lockedUnits];
    plan().toggleSectorLock('A');

    const b = unitsIn(plan().assignments, 'B');
    expect(b.filter((id) => plan().lockedUnits.includes(id))).toEqual(
      b.filter((id) => before.includes(id)),
    );
  });

  it('does not stop the operator moving a locked unit', () => {
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

  it('keeps a locked unit even when the autonomy wants it elsewhere', () => {
    usePlanStore.setState({
      assignments: {
        ...plan().assignments,
        'HYD-01': { unitId: 'HYD-01', target: 'D', source: 'autonomy' },
      },
      lockedUnits: [...plan().lockedUnits, 'HYD-01'],
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
  it('counts what the demo opens with: nothing kept but the locked units', () => {
    const preview = rePropoPreview(plan().assignments, plan().lockedUnits, 'all');
    const locked = preview.keeps.find((group) => group.reason === 'locked');

    expect(locked?.unitIds).toEqual([...plan().lockedUnits].sort());
    expect(preview.mayChange).toBe(
      Object.keys(plan().assignments).length - plan().lockedUnits.length,
    );
  });

  it('matches frame 160:694 after the move the demo is about', () => {
    plan().moveUnit('KRK-03', 'D');
    plan().moveUnit('KRK-04', 'D');

    const preview = rePropoPreview(plan().assignments, plan().lockedUnits, 'all');
    expect(preview.keeps.map((group) => group.reason)).toEqual(['locked', 'operator']);
    expect(preview.keeps[0].unitIds).toEqual(['HYD-21', 'HYD-22', 'HYD-23', 'HYD-24']);
    expect(preview.keeps[1].unitIds).toEqual(['KRK-03', 'KRK-04']);
    expect(preview.mayChange).toBe(30);
  });

  it('lists a unit that is both locked and operator-set once, as locked', () => {
    plan().moveUnit('KRK-03', 'D');
    usePlanStore.setState({ lockedUnits: [...plan().lockedUnits, 'KRK-03'] });

    const preview = rePropoPreview(plan().assignments, plan().lockedUnits, 'all');
    const named = preview.keeps.flatMap((group) => group.unitIds);
    expect(named.filter((id) => id === 'KRK-03')).toHaveLength(1);
    expect(preview.keeps.find((g) => g.reason === 'locked')!.unitIds).toContain('KRK-03');
  });

  it('promises exactly what re-proposing then does', () => {
    plan().moveUnit('KRK-03', 'D');
    const preview = rePropoPreview(plan().assignments, plan().lockedUnits, 'all');
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
  it('takes every unlocked unit off tasking', () => {
    plan().clearPlan();
    const left = Object.keys(plan().assignments);
    expect(left.sort()).toEqual([...plan().lockedUnits].sort());
  });

  it('unstages every sector, so nothing can launch on an empty plan', () => {
    SECTOR_IDS.forEach((id) => plan().setStaged(id, true));
    plan().clearPlan();
    expect(SECTOR_IDS.every((id) => plan().staged[id] === false)).toBe(true);
  });

  it('is undone by re-proposing', () => {
    // Compared as a map of unit to sector: the locked units survive the clear
    // and so come back in a different order, which is not a difference.
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
