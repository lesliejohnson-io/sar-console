import type { Assignment, AssignmentTarget, SectorId } from './types';

/**
 * The tasking plan the autonomy proposes — the state the demo opens Screen 2
 * with, matching Figma frame 263:5894.
 *
 * | Sector | Units                           | Expected coverage |
 * |--------|---------------------------------|-------------------|
 * | A      | ROC-01, HYD-01–06               | 92%               |
 * | B      | ROC-02, HYD-07–13, KRK-01–04    | 89%               |
 * | C      | ROC-03, HYD-14–20               | 87%               |
 * | D      | ROC-04, HYD-21–24               | 44%               |
 *
 * Sector D opens 16 points below the 60% target. The demo's main move is the
 * operator sending KRK-03 and KRK-04 to Sector D.
 */

const range = (prefix: string, from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}-${String(from + i).padStart(2, '0')}`);

const PROPOSED: Record<AssignmentTarget, string[]> = {
  A: ['ROC-01', ...range('HYD', 1, 6)],
  B: ['ROC-02', ...range('HYD', 7, 13), ...range('KRK', 1, 4)],
  C: ['ROC-03', ...range('HYD', 14, 20)],
  D: ['ROC-04', ...range('HYD', 21, 24)],
  ALL: range('GRF', 1, 4),
};

export const PROPOSED_ASSIGNMENTS: Assignment[] = (
  Object.entries(PROPOSED) as [AssignmentTarget, string[]][]
).flatMap(([target, unitIds]) =>
  unitIds.map((unitId) => ({ unitId, target, source: 'autonomy' as const })),
);

/** Sectors the operator has already staged for launch. */
export const PROPOSED_STAGED: Record<SectorId, boolean> = {
  A: true,
  B: true,
  C: true,
  D: false,
};

/** Units the autonomy may not move on re-propose. */
export const PROPOSED_LOCKED_UNITS: string[] = range('HYD', 21, 24);

/** Sector selected when the screen opens. */
export const PROPOSED_SELECTED_SECTOR: SectorId = 'D';

/**
 * The mission clock. The demo is scripted, so operator changes are stamped
 * from a fixed time rather than the wall clock, which keeps every run and
 * every screenshot identical.
 */
export const MISSION_TIME = '08:41';
