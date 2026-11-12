import { beforeEach, describe, expect, it } from 'vitest';
import {
  coverageAfterMove,
  coverageBySector,
  overall,
  sectorCoverage,
  stagedCount,
  unitsIn,
  usePlanStore,
  weakest,
} from './usePlanStore';
import { MISSION_TIME } from '../data/plan';
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
    move('HYD-01', 'D'); // Sector D is out of range from Staging A

    expect(state().assignments).toBe(before);
    expect(coverageBySector(state().assignments)).toEqual({ A: 92, B: 89, C: 87, D: 44 });
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
    move('HYD-01', 'D');

    expect(stagedCount(state().staged)).toBe(3);
  });

  it('can be staged again by hand', () => {
    move('KRK-03', 'D');
    state().setStaged('B', true);

    expect(state().staged.B).toBe(true);
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
