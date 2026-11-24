import { create } from 'zustand';
import {
  MISSION_TIME,
  PROPOSED_ASSIGNMENTS,
  PROPOSED_LOCKED_SECTORS,
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

/**
 * The one row selected in the rail, if any: a sector header, a group row, or a
 * single unit. Selecting is the same gesture at every level, and it is what
 * the map highlights, so the rail and the map can never disagree about what
 * the operator is looking at.
 *
 * `key` names the row (`sector:D`, `group:D:HYD:autonomy`, `unit:HYD-21`);
 * `unitIds` are the units it stands for, empty for a sector header.
 */
export interface RailSelection {
  key: string;
  sector: SectorId;
  unitIds: string[];
}

/** The selection a sector header makes. */
export const sectorSelection = (sector: SectorId): RailSelection => ({
  key: `sector:${sector}`,
  sector,
  unitIds: [],
});

export interface PlanState {
  assignments: Assignments;
  /** Sectors the operator has staged for launch. */
  staged: Record<SectorId, boolean>;
  /** Sectors the autonomy may not re-task on re-propose. */
  lockedSectors: SectorId[];
  /** The sector the selection is in; the map's selected sector. */
  selectedSector: SectorId | null;
  /** The selected rail row, which is also the one expanded. */
  selection: RailSelection | null;
  /**
   * The sectors that actually went up, captured at the moment of launch.
   * `null` until the operator launches: Screen 3 has nothing to show before
   * then, and the summary step can tell "not launched yet" from "launched
   * nothing".
   */
  launched: SectorId[] | null;

  /** Move one unit to another sector and mark it set by the operator. */
  moveUnit: (unitId: string, toSector: SectorId) => void;
  /** Select a rail row (and so its sector), or clear the selection. */
  select: (selection: RailSelection | null) => void;
  setStaged: (sector: SectorId, staged: boolean) => void;
  /** Lock or unlock a sector against autonomy re-proposal. */
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
  lockedSectors: [...PROPOSED_LOCKED_SECTORS],
  selectedSector: PROPOSED_SELECTED_SECTOR as SectorId | null,
  selection: sectorSelection(PROPOSED_SELECTED_SECTOR) as RailSelection | null,
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

  select: (selection) => set({ selection, selectedSector: selection?.sector ?? null }),

  setStaged: (sector, staged) =>
    set((state) => ({ staged: { ...state.staged, [sector]: staged } })),

  /*
   * A lock says the autonomy may not re-task this sector when it re-proposes:
   * nothing in it is taken out, and nothing is sent in. Locks are by sector
   * only — a unit is never locked on its own, it is locked by being in a
   * locked sector.
   *
   * It is not a lock against the operator: the whole point of the screen is
   * that a person can always override, so dragging a unit in or out of a
   * locked sector still works.
   */
  toggleSectorLock: (sector) =>
    set((state) => ({
      lockedSectors: state.lockedSectors.includes(sector)
        ? state.lockedSectors.filter((id) => id !== sector)
        : [...state.lockedSectors, sector],
    })),

  /*
   * Re-proposing asks the autonomy for its plan again. Two kinds of
   * assignment survive it, which is what the popover lists under "Keeps": a
   * unit in a locked sector, and a unit the operator placed themselves. Nor is
   * anything sent into a locked sector. Everything else in scope goes back to
   * what the autonomy proposed.
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
        if (isLocked(state.lockedSectors, proposed.target)) continue;

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
      // A locked sector is the operator saying "leave this one", which a clear
      // has no more right to overrule than the autonomy does.
      const assignments = Object.fromEntries(
        Object.entries(state.assignments).filter(([, assignment]) =>
          isLocked(state.lockedSectors, assignment.target),
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

  /*
   * Launching lets go of whatever the review had selected: a mission opens
   * with nothing picked out, rather than carrying a planning choice onto the
   * live map and fading every other unit behind it.
   */
  launch: () =>
    set((state) => ({
      launched: SECTOR_IDS.filter((id) => state.staged[id]),
      selection: null,
      selectedSector: null,
    })),

  reset: () => set(initial()),
}));

/** Whether an assignment target is a sector the operator has locked. */
export const isLocked = (lockedSectors: SectorId[], target: AssignmentTarget | undefined) =>
  target !== undefined && target !== 'ALL' && lockedSectors.includes(target);

/** A unit the autonomy may not re-task: in a locked sector, or placed by the operator. */
const keptByOperator = (state: PlanState, unitId: string): boolean => {
  const assignment = state.assignments[unitId];
  return isLocked(state.lockedSectors, assignment?.target) || assignment?.source === 'operator';
};

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
  lockedSectors: SectorId[],
  scope: SectorId | 'all',
): RePropose {
  const sectors = scope === 'all' ? [...SECTOR_IDS] : [scope];
  const assigned = Object.values(assignments).filter(
    (assignment) =>
      scope === 'all' || assignment.target === scope,
  );

  const locked = assigned
    .filter((assignment) => isLocked(lockedSectors, assignment.target))
    .map((assignment) => assignment.unitId)
    .sort(byUnitId);

  // A unit that is both locked and operator-set is listed once, as locked:
  // the lock is the stronger statement, and the list is meant to be read.
  const operator = assigned
    .filter(
      (assignment) =>
        assignment.source === 'operator' && !isLocked(lockedSectors, assignment.target),
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
