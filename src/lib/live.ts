import { coverage } from './coverage';
import { unitType } from './units';
import type { SectorId } from '../data/types';

/**
 * The live model: what the plan expected to have searched by now, and what has
 * actually been searched.
 *
 * Screen 2 asks one question — how much of a sector will be searched in the
 * next two hours. Screen 3 asks two: how far along the plan should be at this
 * minute, and how far along it actually is. Both are built from the same
 * `coverage()` call, so the live screen can never disagree with the plan the
 * operator approved.
 *
 *   planned(t)  = C(all the sector's units) x progress(t)
 *   searched(t) = pace x ∫ C(the units actually searching at that minute) dp
 *
 * With every unit working the whole time the two are the same curve, which is
 * what makes a gap mean something: a sector only falls behind when units stop
 * searching. That is exactly what the relay loss does — the seven Hydras stop
 * contributing, Sector B's rate drops to what ROC-02 and two Krakens give
 * alone, and the bar falls away from the tick.
 */

/** The plan's horizon: "expected coverage, next 2 h", as Screen 2 words it. */
export const SEARCH_WINDOW_MINUTES = 120;

/**
 * Searching is front-loaded — the open, easy ground goes first and the awkward
 * corners take the rest of the window — so progress is a curve rather than a
 * straight line. The exponent is calibrated against the frames: at 42 minutes
 * the four plan ticks sit at 40 / 36 / 38 / 35%, which is what frames 238:2144
 * and 289:2394 draw.
 */
const PLAN_CURVE = 0.8;

/** A stretch of time during which some units are not searching. */
export interface Outage {
  unitIds: readonly string[];
  /** Mission minute the units stopped contributing. */
  from: number;
  /** Mission minute they resumed. Open-ended while undefined. */
  until?: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** The share of its expected coverage the plan means to have reached by now. */
export function planProgress(minute: number): number {
  return Math.pow(clamp(minute / SEARCH_WINDOW_MINUTES, 0, 1), PLAN_CURVE);
}

/** Whether a unit is out of the search at this minute. */
const stopped = (unitId: string, minute: number, outages: readonly Outage[]): boolean =>
  outages.some(
    (outage) =>
      outage.unitIds.includes(unitId) &&
      minute >= outage.from &&
      (outage.until === undefined || minute < outage.until),
  );

/** Where the plan expects this sector to be at this minute, as a whole percent. */
export function plannedCoverage(
  sector: SectorId,
  unitIds: readonly string[],
  minute: number,
): number {
  return Math.round(coverage(sector, unitIds.map(unitType)) * planProgress(minute));
}

/**
 * How much of the sector has actually been searched by this minute.
 *
 * Integrated minute by minute, because what is searched cannot be un-searched:
 * the ground covered before a unit dropped out stays covered. `pace` is the
 * sector's own scripted running rate against plan (see `SECTOR_PACE`).
 */
export function searchedCoverage(
  sector: SectorId,
  unitIds: readonly string[],
  minute: number,
  outages: readonly Outage[] = [],
  pace = 1,
): number {
  const end = clamp(minute, 0, SEARCH_WINDOW_MINUTES);
  let searched = 0;

  for (let m = 0; m < end; m += 1) {
    const working = unitIds.filter((unitId) => !stopped(unitId, m, outages));
    if (working.length === 0) continue;
    const gain = planProgress(Math.min(m + 1, end)) - planProgress(m);
    searched += coverage(sector, working.map(unitType)) * gain;
  }

  return Math.round(searched * pace);
}

/** Units of this set that are out of contact — or otherwise not searching. */
export const stoppedUnits = (
  unitIds: readonly string[],
  minute: number,
  outages: readonly Outage[],
): string[] => unitIds.filter((unitId) => stopped(unitId, minute, outages));

/* ------------------------------------------------------------- mission clock */

/** Minutes since the mission clock's midnight, for "09:00". */
const minutesOf = (clock: string): number => {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

/** "09:00" + 42 -> "09:42". The demo's clock is scripted, never the wall clock. */
export function clockAt(start: string, minute: number): string {
  const total = minutesOf(start) + Math.max(0, Math.floor(minute));
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "42 min", "1 h 05 min" — how the top bar reads the time since launch. */
export function elapsedLabel(minute: number): string {
  const whole = Math.max(0, Math.floor(minute));
  if (whole < 60) return `${whole} min`;
  return `${Math.floor(whole / 60)} h ${String(whole % 60).padStart(2, '0')} min`;
}
