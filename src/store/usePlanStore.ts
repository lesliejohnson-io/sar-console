import { create } from 'zustand';
import {
  MISSION_TIME,
  PROPOSED_ASSIGNMENTS,
  PROPOSED_LOCKED_UNITS,
  PROPOSED_SELECTED_SECTOR,
  PROPOSED_STAGED,
} from '../data/plan';
import { AVAILABLE_UNITS } from '../data/assets';
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

  /** Move one unit to another sector and mark it set by the operator. */
  moveUnit: (unitId: string, toSector: SectorId) => void;
  selectSector: (sector: SectorId | null) => void;
  setStaged: (sector: SectorId, staged: boolean) => void;
  reset: () => void;
}

const initial = () => ({
  assignments: Object.fromEntries(
    PROPOSED_ASSIGNMENTS.map((assignment) => [assignment.unitId, { ...assignment }]),
  ) as Assignments,
  staged: { ...PROPOSED_STAGED },
  lockedUnits: [...PROPOSED_LOCKED_UNITS],
  selectedSector: PROPOSED_SELECTED_SECTOR as SectorId | null,
});

export const usePlanStore = create<PlanState>((set) => ({
  ...initial(),

  moveUnit: (unitId, toSector) =>
    set((state) => {
      const current = state.assignments[unitId];
      if (!current || current.target === toSector) return state;

      const from = current.target === 'ALL' ? undefined : (current.target as SectorId);

      return {
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
      // Staged flags are deliberately left alone here. CLAUDE.md says an
      // operator change to a staged sector returns it to "Stage sector", but
      // frame 158:572 still shows Sector B staged and "3 SECTORS" after the
      // Krakens leave it. Flagged for Leslie; the rule lands in Milestone 2.
    }),

  selectSector: (sector) => set({ selectedSector: sector }),

  setStaged: (sector, staged) =>
    set((state) => ({ staged: { ...state.staged, [sector]: staged } })),

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
