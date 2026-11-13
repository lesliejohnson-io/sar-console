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

  launch: () =>
    set((state) => ({ launched: SECTOR_IDS.filter((id) => state.staged[id]) })),

  reset: () => set(initial()),
}));

/* ---------------------------------------------------------------- selectors */
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
