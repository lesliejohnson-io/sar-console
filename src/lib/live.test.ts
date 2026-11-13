import { describe, expect, it } from 'vitest';
import {
  SEARCH_WINDOW_MINUTES,
  clockAt,
  elapsedLabel,
  planProgress,
  plannedCoverage,
  searchedCoverage,
  stoppedUnits,
  type Outage,
} from './live';
import { coverage } from './coverage';
import { BEHIND_TOLERANCE, INCIDENT, LIVE_START, SECTOR_PACE } from '../data/live';

const range = (prefix: string, from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}-${String(from + i).padStart(2, '0')}`);

/** What went up: the proposed plan with the two Krakens the operator moved. */
const LAUNCHED = {
  A: ['ROC-01', ...range('HYD', 1, 6)],
  B: ['ROC-02', ...range('HYD', 7, 13), ...range('KRK', 1, 2)],
  C: ['ROC-03', ...range('HYD', 14, 20)],
  D: ['ROC-04', ...range('HYD', 21, 24), ...range('KRK', 3, 4)],
} as const;

/** The relay loss: the seven Hydras stop searching at 09:40 and do not resume. */
const RELAY_LOSS: Outage[] = [{ unitIds: INCIDENT.affectedUnits, from: INCIDENT.atMinute }];

const searched = (sector: keyof typeof LAUNCHED, minute: number, outages: Outage[] = []) =>
  searchedCoverage(sector, LAUNCHED[sector], minute, outages, SECTOR_PACE[sector]);

const planned = (sector: keyof typeof LAUNCHED, minute: number) =>
  plannedCoverage(sector, LAUNCHED[sector], minute);

describe('plan progress', () => {
  it('starts at nothing and finishes the window at everything', () => {
    expect(planProgress(0)).toBe(0);
    expect(planProgress(SEARCH_WINDOW_MINUTES)).toBe(1);
    expect(planProgress(SEARCH_WINDOW_MINUTES * 2)).toBe(1);
  });

  it('never runs backwards', () => {
    for (let minute = 1; minute <= SEARCH_WINDOW_MINUTES; minute += 1) {
      expect(planProgress(minute)).toBeGreaterThan(planProgress(minute - 1));
    }
  });

  it('reaches the whole plan by the end of the window', () => {
    expect(planned('A', SEARCH_WINDOW_MINUTES)).toBe(92);
    expect(planned('D', SEARCH_WINDOW_MINUTES)).toBe(82);
  });
});

/*
 * The four readings the frames draw at 42 minutes live. These are the numbers
 * a reviewer checks against Figma, so they are locked here: the bars, the map
 * labels and the top bar all read from these two functions.
 */
describe('frames 238:2144 and 289:2394, at 42 minutes live', () => {
  it('draws the plan ticks the frames draw', () => {
    expect(planned('A', 42)).toBe(40);
    expect(planned('B', 42)).toBe(36);
    expect(planned('C', 42)).toBe(38);
    expect(planned('D', 42)).toBe(35);
  });

  it('draws the searched bars the incident frame draws', () => {
    expect(searched('A', 42, RELAY_LOSS)).toBe(42);
    expect(searched('B', 42, RELAY_LOSS)).toBe(34);
    expect(searched('C', 42, RELAY_LOSS)).toBe(36);
    expect(searched('D', 42, RELAY_LOSS)).toBe(33);
  });

  it('puts Sector B two minutes into the incident', () => {
    expect(stoppedUnits(LAUNCHED.B, 42, RELAY_LOSS)).toEqual(INCIDENT.affectedUnits);
    expect(42 - INCIDENT.atMinute).toBe(2);
  });
});

describe('the relay loss', () => {
  it('leaves Sector B the coverage ROC-02 and two Krakens give alone', () => {
    const working = LAUNCHED.B.filter((id) => !INCIDENT.affectedUnits.includes(id));
    expect(working).toEqual(['ROC-02', 'KRK-01', 'KRK-02']);
    // The 83% -> 52% the incident card reports, from the coverage model itself.
    expect(coverage('B', ['ROC', 'HYD', 'HYD', 'HYD', 'HYD', 'HYD', 'HYD', 'HYD', 'KRK', 'KRK'])).toBe(83);
    expect(coverage('B', ['ROC', 'KRK', 'KRK'])).toBe(52);
  });

  it('pulls Sector B away from its plan, and leaves the others alone', () => {
    const withLoss = searched('B', 70, RELAY_LOSS);
    expect(withLoss).toBeLessThan(searched('B', 70));
    expect(searched('A', 70, RELAY_LOSS)).toBe(searched('A', 70));
  });

  /*
   * The gap widens slowly, because the plan is slowing down too: left alone,
   * Sector B takes until about 09:32 past launch to trip the 15-point rule and
   * ask for a re-propose. Until then the incident card is what the operator
   * sees, which is the point of it — the console names the cause long before
   * the shortfall becomes big enough to notice on its own.
   */
  it('widens until the sector asks to be re-proposed', () => {
    const gap = (minute: number) => planned('B', minute) - searched('B', minute, RELAY_LOSS);
    expect(gap(50)).toBeGreaterThan(0);
    expect(gap(70)).toBeGreaterThan(gap(50));
    expect(gap(70)).toBeLessThanOrEqual(BEHIND_TOLERANCE);
    expect(gap(100)).toBeGreaterThan(BEHIND_TOLERANCE);
  });

  it('lets the sector catch its plan again when contact comes back', () => {
    const restored: Outage[] = [
      { unitIds: INCIDENT.affectedUnits, from: INCIDENT.atMinute, until: INCIDENT.atMinute + 6 },
    ];
    expect(searched('B', 70, restored)).toBeGreaterThan(searched('B', 70, RELAY_LOSS));
    expect(searched('B', 70, restored)).toBeLessThan(searched('B', 70));
  });
});

describe('searched coverage', () => {
  it('never falls, whatever happens to the units', () => {
    let last = 0;
    for (let minute = 0; minute <= SEARCH_WINDOW_MINUTES; minute += 1) {
      const now = searched('B', minute, RELAY_LOSS);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it('stops where it stood when every unit stops', () => {
    const held: Outage[] = [{ unitIds: LAUNCHED.D, from: 30 }];
    expect(searched('D', 60, held)).toBe(searched('D', 30, held));
  });

  it('is nothing at launch', () => {
    expect(searched('A', 0)).toBe(0);
  });
});

describe('the mission clock', () => {
  it('counts from launch', () => {
    expect(clockAt(LIVE_START, 0)).toBe('09:00');
    expect(clockAt(LIVE_START, INCIDENT.atMinute)).toBe('09:40');
    expect(clockAt(LIVE_START, 42)).toBe('09:42');
    expect(clockAt(LIVE_START, 75)).toBe('10:15');
  });

  it('reads the time since launch the way the top bar does', () => {
    expect(elapsedLabel(42)).toBe('42 min');
    expect(elapsedLabel(65)).toBe('1 h 05 min');
  });
});
