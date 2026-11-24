import { beforeEach, describe, expect, it } from 'vitest';
import { AVAILABLE_UNITS } from '../data/assets';
import { coverageBySector, usePlanStore } from '../store/usePlanStore';
import { attentionLabel, isBelowTarget, planAttention, NO_ATTENTION } from './attention';

const statuses = AVAILABLE_UNITS.map((unit) => unit.status);

const coverageNow = () => coverageBySector(usePlanStore.getState().assignments);

beforeEach(() => {
  usePlanStore.getState().reset();
});

describe('the status strip on the plan screens', () => {
  it('counts Sector D, under target at open, as the one thing needing the operator', () => {
    const coverage = coverageNow();
    expect(planAttention(coverage, statuses)).toEqual({ ...NO_ATTENTION, 'needs-operator': 1 });
  });

  it('agrees with the sector card warning: once both Krakens move, nothing is left', () => {
    usePlanStore.getState().moveUnit('KRK-03', 'D');
    usePlanStore.getState().moveUnit('KRK-04', 'D');
    const coverage = coverageNow();
    const warned = Object.values(coverage).filter(isBelowTarget).length;
    expect(planAttention(coverage, statuses)['needs-operator']).toBe(warned);
    expect(planAttention(coverage, statuses)).toEqual(NO_ATTENTION);
  });
});

describe('chip wording', () => {
  it('agrees in number', () => {
    expect(attentionLabel('needs-operator', 1)).toBe('1 needs operator');
    expect(attentionLabel('needs-operator', 2)).toBe('2 need operator');
    expect(attentionLabel('out-of-contact', 7)).toBe('7 out of contact');
  });
});
