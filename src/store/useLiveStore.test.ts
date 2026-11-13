import { beforeEach, describe, expect, it } from 'vitest';
import { INCIDENT } from '../data/live';
import { SECTOR_IDS } from '../data/sectors';
import {
  feed,
  furthestBehind,
  incidentPhase,
  liveBySector,
  outOfContact,
  sectorLive,
  untilResolved,
  useLiveStore,
  type Resolution,
} from './useLiveStore';
import type { SectorId } from '../data/types';

/**
 * The mission as it runs: the phases the incident passes through, what each
 * decision does to Sector B, and what the operator's own controls — pause a
 * sector, hold everything — do to a sector that was on plan.
 *
 * The frame numbers themselves are locked in `src/lib/live.test.ts`. These
 * tests are about the paths through the incident that no frame draws, which is
 * exactly where a scripted demo is most likely to go quietly wrong.
 */

const seq = (prefix: string, from: number, to: number) =>
  Array.from(
    { length: to - from + 1 },
    (_, i) => `${prefix}-${String(from + i).padStart(2, '0')}`,
  );

/** The plan the demo launches: the proposed tasking with both Krakens moved. */
const PLAN: Record<SectorId, string[]> = {
  A: ['ROC-01', ...seq('HYD', 1, 6)],
  B: ['ROC-02', ...seq('HYD', 7, 13), 'KRK-01', 'KRK-02'],
  C: ['ROC-03', ...seq('HYD', 14, 20)],
  D: ['ROC-04', ...seq('HYD', 21, 24), 'KRK-03', 'KRK-04'],
};

const at = (minute: number) => {
  useLiveStore.getState().jumpTo(minute);
  return useLiveStore.getState();
};

const decide = (minute: number, option: Resolution) => {
  at(minute);
  useLiveStore.getState().choose(option);
  return useLiveStore.getState();
};

beforeEach(() => useLiveStore.getState().reset());

describe('incident phases', () => {
  it('has nothing to report before the link drops', () => {
    expect(incidentPhase(at(INCIDENT.atMinute - 1))).toBe('none');
    expect(outOfContact(at(INCIDENT.atMinute - 1))).toEqual([]);
  });

  it('waits on the operator from the minute the link drops', () => {
    expect(incidentPhase(at(INCIDENT.atMinute))).toBe('deciding');
    expect(outOfContact(at(INCIDENT.atMinute))).toEqual([...INCIDENT.affectedUnits]);
  });

  it('never resolves on its own, however long the operator leaves it', () => {
    expect(incidentPhase(at(INCIDENT.atMinute + 40))).toBe('deciding');
  });

  it('runs in progress for the time the option states, then resolves', () => {
    for (const option of INCIDENT.options) {
      useLiveStore.getState().reset();
      const decided = INCIDENT.atMinute + 2;
      decide(decided, option.key);

      expect(incidentPhase(at(decided))).toBe('in-progress');
      expect(untilResolved(at(decided))).toBe(option.minutes);

      // The last minute of the window is still in progress.
      expect(incidentPhase(at(decided + option.minutes - 1))).toBe('in-progress');
      expect(untilResolved(at(decided + option.minutes - 1))).toBe(1);

      expect(incidentPhase(at(decided + option.minutes))).toBe('resolved');
      expect(untilResolved(at(decided + option.minutes))).toBe(0);
    }
  });

  it('takes holding as a decision that is done the moment it is made', () => {
    expect(incidentPhase(decide(INCIDENT.atMinute + 2, 'held'))).toBe('resolved');
  });

  it('keeps the first decision: a second click cannot overwrite it', () => {
    decide(INCIDENT.atMinute + 2, 'a');
    useLiveStore.getState().choose('b');
    expect(useLiveStore.getState().resolution).toBe('a');
    expect(useLiveStore.getState().resolvedFrom).toBe(INCIDENT.atMinute + 2);
  });
});

describe('what each decision does to Sector B', () => {
  const searched = (minute: number) => sectorLive(at(minute), 'B', PLAN).searched;

  it('option a hands the seven back, and Sector B starts gaining again', () => {
    decide(INCIDENT.atMinute + 2, 'a');
    const resumed = INCIDENT.atMinute + 2 + INCIDENT.options[0].minutes;

    expect(outOfContact(at(resumed - 1))).toEqual([...INCIDENT.affectedUnits]);
    expect(outOfContact(at(resumed))).toEqual([]);
    expect(sectorLive(at(resumed), 'B', PLAN).stopped).toEqual([]);

    // Measured against the same mission left undecided, which is the only
    // comparison that isolates the decision: Sector B is close to its ceiling
    // by now, so the raw gain per minute is small either way.
    const decided = searched(resumed + 20);
    useLiveStore.getState().reset();
    expect(decided).toBeGreaterThan(searched(resumed + 20));
  });

  it('option b leaves the seven out of the search for good', () => {
    decide(INCIDENT.atMinute + 2, 'b');
    const back = INCIDENT.atMinute + 2 + INCIDENT.options[1].minutes;

    // Back at staging they are heard from again, but they are not searching.
    expect(outOfContact(at(back))).toEqual([]);
    expect(sectorLive(at(back + 10), 'B', PLAN).stopped).toEqual([...INCIDENT.affectedUnits]);

    // And the sector keeps falling further behind the plan it launched with.
    const early = sectorLive(at(back), 'B', PLAN).behind;
    expect(sectorLive(at(back + 20), 'B', PLAN).behind).toBeGreaterThan(early);
  });

  it('is the only sector a decision touches', () => {
    // Left undecided, the seven stay out of contact; option a is the one
    // decision that changes what any sector searches.
    const undecided = liveBySector(at(INCIDENT.atMinute + 30), PLAN);
    useLiveStore.getState().reset();
    decide(INCIDENT.atMinute, 'a');
    const after = liveBySector(at(INCIDENT.atMinute + 30), PLAN);

    for (const sector of SECTOR_IDS) {
      if (sector === INCIDENT.sector) {
        expect(after[sector].searched).toBeGreaterThan(undecided[sector].searched);
      } else {
        expect(after[sector].searched).toBe(undecided[sector].searched);
      }
    }
  });

  it('puts Sector B at the top of the bar from the minute it loses its units', () => {
    decide(INCIDENT.atMinute, 'held');
    for (const minute of [45, 60, 90, 120]) {
      expect(furthestBehind(liveBySector(at(minute), PLAN)).sector).toBe(INCIDENT.sector);
    }
  });

  /**
   * **Flagged for design review.** Even in the worst case the demo can reach —
   * the seven held from the minute the link drops — Sector B does not fall the
   * 15 points behind that `spec.md` sets as the re-propose threshold until
   * minute 95, well after the incident has had its moment. The behind-plan
   * card is built and correct, but at this tolerance it is all but unreachable
   * inside the two-hour window. Either the tolerance or the pace wants a look.
   */
  it('reaches the re-propose tolerance only at minute 95, and not before', () => {
    decide(INCIDENT.atMinute, 'held');
    expect(furthestBehind(liveBySector(at(94), PLAN)).flagged).toBe(false);

    const tripped = furthestBehind(liveBySector(at(95), PLAN));
    expect(tripped.flagged).toBe(true);
    expect(tripped.behind).toBe(16);
  });
});

describe("the operator's own controls", () => {
  it("pausing a sector stops its units and nobody else's", () => {
    at(20);
    useLiveStore.getState().pauseSector('C');
    const live = liveBySector(at(40), PLAN);

    expect(live.C.paused).toBe(true);
    expect(live.C.stopped).toEqual(PLAN.C);
    expect(live.A.paused).toBe(false);
    expect(live.A.stopped).toEqual([]);
  });

  it('pausing is not undone by pausing again, and is logged once', () => {
    at(20);
    useLiveStore.getState().pauseSector('C');
    at(25);
    useLiveStore.getState().pauseSector('C');

    expect(useLiveStore.getState().pausedAt.C).toBe(20);
    expect(
      useLiveStore.getState().log.filter((entry) => entry.text.includes('paused')),
    ).toHaveLength(1);
  });

  it('a paused sector keeps what it had already searched', () => {
    const atPause = sectorLive(at(30), 'C', PLAN).searched;
    useLiveStore.getState().pauseSector('C');
    expect(sectorLive(at(60), 'C', PLAN).searched).toBe(atPause);
  });

  // Held and released before the link drops, so the only thing stopping any
  // unit here is the operator.
  it('holding all units stops every sector, and releasing starts them again', () => {
    at(20);
    useLiveStore.getState().toggleHoldAll();
    const held = liveBySector(at(30), PLAN);
    for (const sector of SECTOR_IDS) expect(held[sector].stopped).toEqual(PLAN[sector]);

    at(30);
    useLiveStore.getState().toggleHoldAll();
    expect(useLiveStore.getState().heldAllAt).toBeNull();

    const after = liveBySector(at(INCIDENT.atMinute - 1), PLAN);
    for (const sector of SECTOR_IDS) expect(after[sector].stopped).toEqual([]);
    expect(after.A.searched).toBeGreaterThan(held.A.searched);
  });
});

describe('the event feed', () => {
  it('holds the incident back until it is resolved, then keeps one line', () => {
    decide(INCIDENT.atMinute + 2, 'a');

    expect(feed(useLiveStore.getState()).filter((entry) => entry.flagged)).toEqual([]);

    const resolved = feed(at(INCIDENT.atMinute + 2 + INCIDENT.options[0].minutes));
    const line = resolved.filter((entry) => entry.flagged);
    expect(line).toHaveLength(1);
    expect(line[0].text).toBe(`${INCIDENT.title}. ${INCIDENT.options[0].title} — operator.`);
    expect(line[0].source).toBe('operator');
  });

  it('names the units when the operator holds rather than choosing', () => {
    decide(INCIDENT.atMinute, 'held');
    const line = feed(useLiveStore.getState()).find((entry) => entry.flagged)!;
    expect(line.text).toBe(`${INCIDENT.title}. Held HYD-07–13 at last position — operator.`);
  });

  it('runs newest first, and says nothing that has not happened yet', () => {
    at(20);
    useLiveStore.getState().pauseSector('B');
    const minutes = feed(useLiveStore.getState()).map((entry) => entry.minute);

    expect(minutes).toEqual([...minutes].sort((a, b) => b - a));
    expect(minutes.every((minute) => minute <= 20)).toBe(true);
    expect(feed(at(0))).toEqual([]);
  });
});

describe('the mission clock', () => {
  it('stops at the end of the window the plan was drawn for', () => {
    at(119);
    const { advance } = useLiveStore.getState();
    advance();
    expect(useLiveStore.getState().minute).toBe(120);
    expect(useLiveStore.getState().running).toBe(false);

    advance();
    expect(useLiveStore.getState().minute).toBe(120);
  });

  it('resets to the start of the mission', () => {
    decide(INCIDENT.atMinute + 2, 'a');
    useLiveStore.getState().pauseSector('B');
    useLiveStore.getState().reset();

    const state = useLiveStore.getState();
    expect(state.minute).toBe(0);
    expect(state.resolution).toBeNull();
    expect(state.pausedAt).toEqual({});
    expect(state.log).toEqual([]);
    expect(incidentPhase(state)).toBe('none');
  });
});
