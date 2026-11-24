import { COVERAGE_TARGET, SECTOR_IDS } from '../data/sectors';
import type { SectorId, UnitStatus } from '../data/types';

/*
 * What the header's status strip counts: the conditions that need the
 * operator's attention, and nothing else. Ready is the expected state and is
 * not counted; autonomous and unavailable are facts about the fleet rather
 * than things to act on, so the full key explains them but the strip does not
 * count them.
 *
 * Every count is built from the same thing the rest of the screen draws from,
 * so the strip and the rail cannot disagree: on the plan screens the
 * below-target rule the sector card uses for its warning, and on the live
 * screen the very set of flag cards the rail renders.
 */

export const ATTENTION_STATES = ['needs-operator', 'degraded', 'out-of-contact'] as const;
export type AttentionState = (typeof ATTENTION_STATES)[number];
export type Attention = Record<AttentionState, number>;

export const NO_ATTENTION: Attention = {
  'needs-operator': 0,
  degraded: 0,
  'out-of-contact': 0,
};

/** The rule behind the sector card's low-coverage warning. */
export const isBelowTarget = (percent: number): boolean => percent < COVERAGE_TARGET;

/**
 * The plan screens. A sector under target carries a warning that no unit's
 * marker shows, so it counts as one thing needing the operator, alongside any
 * unit whose own state says so.
 */
export function planAttention(
  coverage: Record<SectorId, number>,
  statuses: readonly UnitStatus[],
): Attention {
  const count = (status: UnitStatus) => statuses.filter((s) => s === status).length;
  return {
    'needs-operator':
      SECTOR_IDS.filter((id) => isBelowTarget(coverage[id])).length + count('needs-operator'),
    degraded: count('degraded'),
    'out-of-contact': count('out-of-contact'),
  };
}

/** What follows the count: "needs operator", "need operator", "out of contact". */
export function attentionNoun(state: AttentionState, count: number): string {
  switch (state) {
    case 'needs-operator':
      return count === 1 ? 'needs operator' : 'need operator';
    case 'degraded':
      return 'degraded';
    case 'out-of-contact':
      return 'out of contact';
  }
}

/** "1 needs operator", "2 need operator", "7 out of contact". */
export const attentionLabel = (state: AttentionState, count: number): string =>
  `${count} ${attentionNoun(state, count)}`;
