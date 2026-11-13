import { create } from 'zustand';
import {
  BEHIND_TOLERANCE,
  INCIDENT,
  LIVE_START,
  OPERATOR,
  SCRIPTED_EVENTS,
  SECTOR_PACE,
} from '../data/live';
import { SECTOR_IDS } from '../data/sectors';
import { formatUnitRange } from '../lib/units';
import {
  SEARCH_WINDOW_MINUTES,
  clockAt,
  plannedCoverage,
  searchedCoverage,
  stoppedUnits,
  type Outage,
} from '../lib/live';
import type { SectorId } from '../data/types';

/**
 * What the mission is doing, minute by minute.
 *
 * The plan store holds what was sent up; this holds what has happened since.
 * The two are kept apart on purpose: nothing here ever rewrites the approved
 * plan, so the plan tick on every bar keeps measuring the screen against what
 * the operator actually signed off, however the mission goes.
 */

/** Where the incident has got to. */
export type IncidentPhase = 'none' | 'deciding' | 'in-progress' | 'resolved';

/** What the operator decided: one of the two options, or holding as they are. */
export type Resolution = 'a' | 'b' | 'held';

export interface LogEntry {
  minute: number;
  text: string;
  /** Purple marks the autonomy acting alone, teal an operator choice. */
  source: 'autonomy' | 'operator';
  /** Carries the amber marker: a line the operator had to decide. */
  flagged?: boolean;
}

export interface LiveState {
  minute: number;
  running: boolean;
  /** Set the moment the operator chooses, which starts the clock on it. */
  resolution: Resolution | null;
  resolvedFrom: number | null;
  pausedAt: Partial<Record<SectorId, number>>;
  heldAllAt: number | null;
  log: LogEntry[];
  feedHidden: boolean;
  /** Whether the grouped effects under the root cause are open. */
  effectsOpen: boolean;

  advance: () => void;
  jumpTo: (minute: number) => void;
  choose: (option: Resolution) => void;
  pauseSector: (sector: SectorId) => void;
  toggleHoldAll: () => void;
  toggleFeed: () => void;
  toggleEffects: () => void;
  reset: () => void;
}

const initial = () => ({
  minute: 0,
  running: true,
  resolution: null as Resolution | null,
  resolvedFrom: null as number | null,
  pausedAt: {} as Partial<Record<SectorId, number>>,
  heldAllAt: null as number | null,
  log: [] as LogEntry[],
  feedHidden: false,
  effectsOpen: false,
});

export const useLiveStore = create<LiveState>((set) => ({
  ...initial(),

  advance: () =>
    set((state) => {
      if (!state.running) return state;
      const minute = Math.min(state.minute + 1, SEARCH_WINDOW_MINUTES);
      return { minute, running: minute < SEARCH_WINDOW_MINUTES };
    }),

  jumpTo: (minute) => set({ minute: Math.max(0, Math.min(minute, SEARCH_WINDOW_MINUTES)) }),

  choose: (option) =>
    set((state) => {
      if (state.resolution !== null) return state;
      return {
        resolution: option,
        resolvedFrom: state.minute,
        log: [...state.log, chosenEntry(option, state.minute)],
      };
    }),

  pauseSector: (sector) =>
    set((state) => {
      if (state.pausedAt[sector] !== undefined) return state;
      return {
        pausedAt: { ...state.pausedAt, [sector]: state.minute },
        log: [
          ...state.log,
          {
            minute: state.minute,
            source: 'operator' as const,
            text: `Sector ${sector} paused. Its units hold at their last position.`,
          },
        ],
      };
    }),

  toggleHoldAll: () =>
    set((state) => {
      const holding = state.heldAllAt !== null;
      return {
        heldAllAt: holding ? null : state.minute,
        log: [
          ...state.log,
          {
            minute: state.minute,
            source: 'operator' as const,
            text: holding
              ? 'All units released. Searching resumes on the approved plan.'
              : 'All units holding at their last position.',
          },
        ],
      };
    }),

  toggleFeed: () => set((state) => ({ feedHidden: !state.feedHidden })),

  toggleEffects: () => set((state) => ({ effectsOpen: !state.effectsOpen })),

  reset: () => set(initial()),
}));

/** The one line the feed keeps once the incident is over. */
function chosenEntry(option: Resolution, minute: number): LogEntry {
  const held = `Held ${formatUnitRange(INCIDENT.affectedUnits)} at last position`;
  const chosen =
    option === 'held' ? held : INCIDENT.options.find((one) => one.key === option)!.title;
  return {
    minute,
    source: 'operator',
    flagged: true,
    text: `${INCIDENT.title}. ${chosen} — ${OPERATOR}.`,
  };
}

/* ---------------------------------------------------------------- selectors */

/** How long the chosen option takes to take effect. */
const optionMinutes = (resolution: Resolution): number =>
  resolution === 'held' ? 0 : INCIDENT.options.find((one) => one.key === resolution)!.minutes;

export function incidentPhase(state: LiveState): IncidentPhase {
  if (state.minute < INCIDENT.atMinute) return 'none';
  if (state.resolution === null) return 'deciding';
  const done = (state.resolvedFrom ?? 0) + optionMinutes(state.resolution);
  return state.minute < done ? 'in-progress' : 'resolved';
}

/** Minutes since the link dropped — what the card and the map label count. */
export const sinceIncident = (state: LiveState): number =>
  Math.max(0, state.minute - INCIDENT.atMinute);

/** Minutes left until the chosen option has taken effect. */
export const untilResolved = (state: LiveState): number => {
  if (state.resolution === null || state.resolvedFrom === null) return 0;
  return Math.max(0, state.resolvedFrom + optionMinutes(state.resolution) - state.minute);
};

/**
 * Everything that has stopped searching, and when.
 *
 * One list, whatever the cause: the link dropping, a sector the operator
 * paused, or every unit held. The coverage model reads this and nothing else,
 * so a sector that is behind is behind for a reason the feed can name.
 */
export function outages(
  state: LiveState,
  unitsBySector: Record<SectorId, string[]>,
): Outage[] {
  const list: Outage[] = [];

  if (incidentPhase(state) !== 'none') {
    /*
     * Option a brings the seven Hydras back: another relay takes GRF-02's
     * place and their link returns. Option b returns them to staging, and
     * holding leaves them where they stand — either way they are done
     * searching, so the outage stays open.
     */
    const resumes =
      state.resolution === 'a' && state.resolvedFrom !== null
        ? state.resolvedFrom + optionMinutes('a')
        : undefined;
    list.push({ unitIds: INCIDENT.affectedUnits, from: INCIDENT.atMinute, until: resumes });
  }

  for (const sector of SECTOR_IDS) {
    const from = state.pausedAt[sector];
    if (from !== undefined) list.push({ unitIds: unitsBySector[sector], from });
  }

  if (state.heldAllAt !== null) {
    list.push({
      unitIds: SECTOR_IDS.flatMap((sector) => unitsBySector[sector]),
      from: state.heldAllAt,
    });
  }

  return list;
}

/**
 * Units the console cannot currently hear from. Once the decision has taken
 * effect the seven are heard from again: either through GRF-03, or because
 * they are back at staging.
 */
export function outOfContact(state: LiveState): string[] {
  const phase = incidentPhase(state);
  return phase === 'deciding' || phase === 'in-progress' ? [...INCIDENT.affectedUnits] : [];
}

export interface SectorLive {
  sector: SectorId;
  /** Searched so far, as a whole percent. */
  searched: number;
  /** Where the approved plan expects the sector to be at this minute. */
  planned: number;
  /** Positive when the sector is short of its plan. */
  behind: number;
  /** Past the tolerance, the console asks the operator to decide. */
  flagged: boolean;
  paused: boolean;
  /** Units of this sector that are not searching right now. */
  stopped: string[];
}

export function sectorLive(
  state: LiveState,
  sector: SectorId,
  unitsBySector: Record<SectorId, string[]>,
): SectorLive {
  const unitIds = unitsBySector[sector];
  const list = outages(state, unitsBySector);
  const searched = searchedCoverage(sector, unitIds, state.minute, list, SECTOR_PACE[sector]);
  const planned = plannedCoverage(sector, unitIds, state.minute);

  return {
    sector,
    searched,
    planned,
    behind: planned - searched,
    flagged: planned - searched > BEHIND_TOLERANCE,
    paused: state.pausedAt[sector] !== undefined,
    stopped: stoppedUnits(unitIds, state.minute, list),
  };
}

export const liveBySector = (
  state: LiveState,
  unitsBySector: Record<SectorId, string[]>,
): Record<SectorId, SectorLive> =>
  Object.fromEntries(
    SECTOR_IDS.map((sector) => [sector, sectorLive(state, sector, unitsBySector)]),
  ) as Record<SectorId, SectorLive>;

/** The sector furthest behind its plan, for the top bar. */
export const furthestBehind = (live: Record<SectorId, SectorLive>): SectorLive =>
  SECTOR_IDS.map((sector) => live[sector]).reduce((worst, one) =>
    one.behind > worst.behind ? one : worst,
  );

/** The mission clock reading for a minute since launch. */
export const clock = (minute: number): string => clockAt(LIVE_START, minute);

/**
 * The whole feed, newest first: the scripted run, plus everything the operator
 * has done since. The incident itself is not in here — it is pinned above the
 * feed as its own card until it resolves, and logged as one line after.
 */
export function feed(state: LiveState): LogEntry[] {
  const scripted: LogEntry[] = SCRIPTED_EVENTS.filter(
    (event) => event.minute <= state.minute,
  ).map((event) => ({ minute: event.minute, text: event.text, source: 'autonomy' as const }));

  /*
   * The operator's own lines are filtered by minute as well, so the feed says
   * only what has happened by the minute on the clock. Nothing in the console
   * winds the mission backwards, but the feed is the mission's record: it
   * should be a function of the minute it is read at, not of what the store
   * happens to remember.
   */
  const resolved = incidentPhase(state) === 'resolved';
  const log = state.log.filter(
    (entry) => entry.minute <= state.minute && (!entry.flagged || resolved),
  );

  return [...scripted, ...log].sort((a, b) => b.minute - a.minute);
}
