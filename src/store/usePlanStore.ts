import { create } from 'zustand';
import {
  MISSION_TIME,
  PROPOSED_ASSIGNMENTS,
  PROPOSED_LOCKED_UNITS,
  PROPOSED_SELECTED_SECTOR,
  PROPOSED_STAGED,
} from '../data/plan';
import { AVAILABLE_UNITS } from '../data/assets';
import { canOperatorMove } from '../data/reach';
import { SECTOR_IDS } from '../data/sectors';
import { coverage, overallCoverage, weakestSector } from '../lib/coverage';
import { byUnitId, unitType } from '../lib/units';
import type { Assignment, AssignmentTarget, SectorId } from '../data/types';

export type Assignments = Record<string, Assignment>;

export interface PlanState {
  assignments: Assignments;
  /** Sectors the operator has staged for launch. */
  staged: Record<SectorId, boolean>;
  /** Units the autonomy may not move on re-propose. */
  lockedUnits: string[];
  selectedSector: SectorId | null;
  /**
   * The sectors that actually went up, captured at the moment of launch.
   * `null` until the operator launches: Screen 3 has nothing to show before
   * then, and the summary step can tell "not launched yet" from "launched
   * nothing".
   */
  launched: SectorId[] | null;

  /** Move one unit to another sector and mark it set by the operator. */
  moveUnit: (unitId: string, toSector: SectorId) => void;
  selectSector: (sector: SectorId | null) => void;
  setStaged: (sector: SectorId, staged: boolean) => void;
  /** Lock or unlock every unit in a sector against autonomy re-proposal. */
  toggleSectorLock: (sector: SectorId) => void;
  /**
   * Hand the plan back to the autonomy, keeping what the operator owns.
   * Scope is every sector, or one of them.
   */
  rePropose: (scope: SectorId | 'all') => void;
  /** Take every unit off tasking. Re-proposing brings the plan back. */
  clearPlan: () => void;
  /** Send up everything staged, and freeze what that was. */
  launch: () => void;
  reset: () => void;
}

const initial = () => ({
  assignments: Object.fromEntries(
    PROPOSED_ASSIGNMENTS.map((assignment) => [assignment.unitId, { ...assignment }]),
  ) as Assignments,
  staged: { ...PROPOSED_STAGED },
  lockedUnits: [...PROPOSED_LOCKED_UNITS],
  selectedSector: PROPOSED_SELECTED_SECTOR as SectorId | null,
  launched: null as SectorId[] | null,
});

export const usePlanStore = create<PlanState>((set) => ({
  ...initial(),

  moveUnit: (unitId, toSector) =>
    set((state) => {
      const current = state.assignments[unitId];
      if (!current || current.target === toSector) return state;

      // The same guard the map and the menu use, so no path can write a move
      // the UI would have refused.
      if (!canOperatorMove(unitId, toSector).ok) return state;

      const from = current.target === 'ALL' ? undefined : (current.target as SectorId);

      // Nothing launches unseen: an operator change returns both the sector
      // the unit left and the one it joined to "Stage sector".
      const staged = { ...state.staged, [toSector]: false };
      if (from) staged[from] = false;

      return {
        staged,
        assignments: {
          ...state.assignments,
          [unitId]: {
            unitId,
            target: toSector,
            source: 'operator',
            movedFrom: from,
            at: MISSION_TIME,
          },
        },
      };
    }),

  selectSector: (sector) => set({ selectedSector: sector }),

  setStaged: (sector, staged) =>
    set((state) => ({ staged: { ...state.staged, [sector]: staged } })),

  /*
   * A lock says the autonomy may not move these units when it re-proposes
   * (`spec.md`: "Lock an asset or a sector, so the autonomy won't change it on
   * re-propose"). It is not a lock against the operator: the whole point of
   * the screen is that a person can always override, so dragging a locked unit
   * still works and simply makes it theirs.
   *
   * The sector's button is all-or-nothing — it locks what is there now, and
   * unlocks if everything already is.
   */
  toggleSectorLock: (sector) =>
    set((state) => {
      const units = unitsIn(state.assignments, sector);
      if (units.length === 0) return state;

      const allLocked = units.every((id) => state.lockedUnits.includes(id));
      return {
        lockedUnits: allLocked
          ? state.lockedUnits.filter((id) => !units.includes(id))
          : [...state.lockedUnits, ...units.filter((id) => !state.lockedUnits.includes(id))],
      };
    }),

  /*
   * Re-proposing asks the autonomy for its plan again. Two kinds of
   * assignment survive it, which is what the popover lists under "Keeps": a
   * locked unit, and a unit the operator placed themselves. Everything else in
   * scope goes back to what the autonomy proposed.
   *
   * Every sector it touches returns to "Stage sector", because the plan the
   * operator staged is not the plan any more.
   */
  rePropose: (scope) =>
    set((state) => {
      const inScope = (target: AssignmentTarget | undefined) =>
        target !== undefined && (scope === 'all' || target === scope);

      const assignments = { ...state.assignments };
      const touched = new Set<SectorId>();

      for (const proposed of PROPOSED_ASSIGNMENTS) {
        const current = assignments[proposed.unitId];
        if (!inScope(current?.target) && !inScope(proposed.target)) continue;
        if (keptByOperator(state, proposed.unitId)) continue;

        if (current?.target !== proposed.target) {
          if (current && current.target !== 'ALL') touched.add(current.target);
          if (proposed.target !== 'ALL') touched.add(proposed.target);
        }
        assignments[proposed.unitId] = { ...proposed };
      }

      const staged = { ...state.staged };
      touched.forEach((sector) => {
        staged[sector] = false;
      });

      return { assignments, staged };
    }),

  clearPlan: () =>
    set((state) => {
      // Locked units are the operator saying "not this one", which a clear
      // has no more right to overrule than the autonomy does.
      const assignments = Object.fromEntries(
        Object.entries(state.assignments).filter(([unitId]) =>
          state.lockedUnits.includes(unitId),
        ),
      ) as Assignments;

      return {
        assignments,
        staged: Object.fromEntries(SECTOR_IDS.map((id) => [id, false])) as Record<
          SectorId,
          boolean
        >,
      };
    }),

  launch: () =>
    set((state) => ({ launched: SECTOR_IDS.filter((id) => state.staged[id]) })),

  reset: () => set(initial()),
}));

/** A unit the autonomy may not re-task: locked, or placed by the operator. */
const keptByOperator = (state: PlanState, unitId: string): boolean =>
  state.lockedUnits.includes(unitId) || state.assignments[unitId]?.source === 'operator';

/* ---------------------------------------------------------------- selectors */

export interface KeptGroup {
  unitIds: string[];
  /** Frame copy: "locked" or "set by operator". */
  reason: 'locked' | 'operator';
}

export interface RePropose {
  /** What survives a re-propose, grouped by why (frame 160:694's "Keeps"). */
  keeps: KeptGroup[];
  /** How many assigned units the autonomy would be free to move. */
  mayChange: number;
  /** The sectors in scope, for the "across ..." line. */
  sectors: SectorId[];
}

/**
 * What a re-propose would keep and what it would change — the figures the
 * popover shows before the operator commits to it. Derived from the same two
 * rules `rePropose` applies, so the preview cannot promise one thing and the
 * action do another.
 */
export function rePropoPreview(
  assignments: Assignments,
  lockedUnits: string[],
  scope: SectorId | 'all',
): RePropose {
  const sectors = scope === 'all' ? [...SECTOR_IDS] : [scope];
  const assigned = Object.values(assignments).filter(
    (assignment) =>
      scope === 'all' || assignment.target === scope,
  );

  const locked = assigned
    .filter((assignment) => lockedUnits.includes(assignment.unitId))
    .map((assignment) => assignment.unitId)
    .sort(byUnitId);

  // A unit that is both locked and operator-set is listed once, as locked:
  // the lock is the stronger statement, and the list is meant to be read.
  const operator = assigned
    .filter(
      (assignment) =>
        assignment.source === 'operator' && !lockedUnits.includes(assignment.unitId),
    )
    .map((assignment) => assignment.unitId)
    .sort(byUnitId);

  const keeps: KeptGroup[] = [];
  if (locked.length > 0) keeps.push({ unitIds: locked, reason: 'locked' });
  if (operator.length > 0) keeps.push({ unitIds: operator, reason: 'operator' });

  return {
    keeps,
    mayChange: assigned.length - locked.length - operator.length,
    sectors,
  };
}
/*
 * Pure functions over `assignments` rather than store selectors, so a
 * component can subscribe to the one stable reference and derive the rest.
 * Every number on Screen 2 comes from here, so one `moveUnit` call moves them
 * all in the same frame.
 */

export const unitsIn = (assignments: Assignments, target: AssignmentTarget): string[] =>
  Object.values(assignments)
    .filter((assignment) => assignment.target === target)
    .map((assignment) => assignment.unitId)
    .sort(byUnitId);

export const sectorCoverage = (assignments: Assignments, sector: SectorId): number =>
  coverage(sector, unitsIn(assignments, sector).map(unitType));

/**
 * What a sector's coverage would be if this unit moved there — the number the
 * drag preview puts on the map label and the "Move to sector…" menu puts
 * beside each sector. Both read it from here, so they can never disagree, and
 * neither can disagree with what the drop actually produces.
 *
 * Passing the unit's own sector returns that sector's coverage unchanged.
 */
export const coverageAfterMove = (
  assignments: Assignments,
  unitId: string,
  toSector: SectorId,
): number => {
  const units = unitsIn(assignments, toSector);
  if (units.includes(unitId)) return coverage(toSector, units.map(unitType));
  return coverage(toSector, [...units, unitId].map(unitType));
};

/** And what the sector the unit leaves would be left with. */
export const coverageAfterRemoval = (
  assignments: Assignments,
  unitId: string,
  fromSector: SectorId,
): number =>
  coverage(
    fromSector,
    unitsIn(assignments, fromSector)
      .filter((id) => id !== unitId)
      .map(unitType),
  );

export const coverageBySector = (assignments: Assignments): Record<SectorId, number> =>
  Object.fromEntries(
    SECTOR_IDS.map((id) => [id, sectorCoverage(assignments, id)]),
  ) as Record<SectorId, number>;

export const overall = (assignments: Assignments): number =>
  overallCoverage(coverageBySector(assignments));

export const weakest = (assignments: Assignments): SectorId =>
  weakestSector(coverageBySector(assignments));

/** Available units with no tasking yet. */
export const unassignedCount = (assignments: Assignments): number =>
  AVAILABLE_UNITS.filter((unit) => !assignments[unit.id]).length;

export const availableCount = (): number => AVAILABLE_UNITS.length;

export const stagedCount = (staged: Record<SectorId, boolean>): number =>
  SECTOR_IDS.filter((id) => staged[id]).length;
