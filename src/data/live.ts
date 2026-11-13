import type { SectorId } from './types';

/**
 * The scripted run of Screen 3, frames 238:2144 and 289:2394.
 *
 * Nothing here is simulated. The mission clock, the pace each sector is
 * running at, the three events before the incident and the relay loss itself
 * are all fixed, so every run of the demo and every screenshot of it reads the
 * same. What is *not* fixed is any number: every percentage on the screen is
 * computed by the coverage model from these inputs.
 */

/** Launch. The operator approved the plan at 08:41 and sent it up at 09:00. */
export const LIVE_START = '09:00';

/**
 * How fast the demo runs the mission clock: one mission minute per 400 ms, so
 * the relay loss arrives about 16 seconds in. `/live?at=incident` skips
 * straight to it.
 */
export const MINUTE_MS = 400;

/**
 * How each sector is actually running against its plan — the one scripted
 * input the coverage model cannot derive. Calibrated so that at 42 minutes the
 * four sectors read 42 / 34 / 36 / 33%, which is what the frames draw.
 */
export const SECTOR_PACE: Record<SectorId, number> = {
  A: 1.058,
  B: 0.95,
  C: 0.957,
  D: 0.932,
};

/**
 * How far behind plan a sector may fall before the console asks the operator
 * to decide. From the spec: "When a sector falls more than 15% behind plan,
 * the operator gets a prompt to re-propose tasking for that sector only."
 */
export const BEHIND_TOLERANCE = 15;

/** The event feed before the incident, verbatim from frame 238:2144. */
export const SCRIPTED_EVENTS: { minute: number; text: string }[] = [
  {
    minute: 12,
    text: 'HYD-14 moved from Sector D to Sector C: rooftop backlog near Folly Rd.',
  },
  { minute: 20, text: 'ROC-03 finished its first wide pass of Sector C.' },
  { minute: 28, text: 'KRK-01 rerouted around debris on Meeting St, Sector B streets.' },
];

const range = (prefix: string, from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}-${String(from + i).padStart(2, '0')}`);

export interface IncidentOption {
  key: 'a' | 'b';
  /** "Choose A", on the button. Both options share one style: no default. */
  action: string;
  title: string;
  /** What it buys, in time. */
  outcome: string;
  /** What it costs. Always shown, never softened. */
  cost: string;
  /** Minutes until the option has taken effect. */
  minutes: number;
  /** The relay that ends up covering Sector B, for option a. */
  moveUnit?: string;
  from?: SectorId;
}

/**
 * The relay loss, from `CLAUDE.md` and `docs/spec.md` (the re-scripted version:
 * Sector B and HYD-07–13). Every line of copy is frame 289:2394's, except that
 * the counts are computed from `affectedUnits` rather than written out.
 */
export const INCIDENT = {
  /** 09:40, two minutes before the frame's clock reading of 42 minutes live. */
  atMinute: 40,
  sector: 'B' as SectorId,
  relayUnit: 'GRF-02',
  affectedUnits: range('HYD', 7, 13),
  title: 'GRF-02 relay link lost',
  /** The map's two labels. */
  mapLabel: 'RELAY LINK LOST',
  effect: 'out of contact, holding position',
  autonomyNote: 'at last-known position. No other units reassigned.',
  options: [
    {
      key: 'a',
      action: 'Choose A',
      title: 'Move GRF-03 to Sector B',
      outcome: 'Contact back in about 6 min',
      cost: "Cost: Sector C's relay runs thin",
      minutes: 6,
      moveUnit: 'GRF-03',
      from: 'C',
    },
    {
      key: 'b',
      action: 'Choose B',
      title: 'Return HYD-07–13, re-propose Sector B',
      outcome: 'Hydras at staging in about 8 min',
      cost: 'Cost: Sector B rooftop search pauses',
      minutes: 8,
    },
  ] as IncidentOption[],
} as const;

/**
 * Who the feed credits a decision to. The console has one operator and no
 * sign-in, so every operator choice is logged under the same name.
 */
export const OPERATOR = 'operator';
