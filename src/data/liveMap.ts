import type { AssetType, SectorId } from './types';

/**
 * Where every unit stands once the plan is flying, read from frame 289:2394
 * in the same 1440 x 1035 space as the rest of the stage.
 *
 * The positions are scripted, like the rest of the demo: the units hold
 * station rather than fly a route, because the autonomy owns route planning
 * and this screen only shows the result. Each entry is keyed by unit ID and
 * remembers which sector the frame drew it in, so a plan the operator changed
 * before launch falls back to the sector's own marker row rather than leaving
 * a Kraken drawn over the sector it was moved out of.
 *
 * Markers that would overlap are drawn as one cluster with a count, which is
 * the rule in the `note/Live map labels and badges` frame and what the frame
 * does with HYD-02–04 and HYD-15–18.
 */
export interface LiveMarker {
  unitIds: string[];
  type: AssetType;
  /** The sector the frame drew these units in. */
  sector: SectorId | 'ALL';
  x: number;
  y: number;
}

export const LIVE_MARKERS: LiveMarker[] = [
  // Sector A · East Cooper
  { unitIds: ['ROC-01'], type: 'ROC', sector: 'A', x: 880, y: 255 },
  { unitIds: ['GRF-01'], type: 'GRF', sector: 'A', x: 855, y: 189 },
  { unitIds: ['HYD-01'], type: 'HYD', sector: 'A', x: 777, y: 307 },
  { unitIds: ['HYD-02', 'HYD-03', 'HYD-04'], type: 'HYD', sector: 'A', x: 684, y: 400 },
  { unitIds: ['HYD-05'], type: 'HYD', sector: 'A', x: 811, y: 264 },
  { unitIds: ['HYD-06'], type: 'HYD', sector: 'A', x: 730, y: 346 },

  // Sector B · Peninsula
  { unitIds: ['ROC-02'], type: 'ROC', sector: 'B', x: 561, y: 240 },
  { unitIds: ['GRF-02'], type: 'GRF', sector: 'B', x: 512.01, y: 244.04 },
  { unitIds: ['HYD-07'], type: 'HYD', sector: 'B', x: 531, y: 276 },
  { unitIds: ['HYD-08'], type: 'HYD', sector: 'B', x: 488, y: 310 },
  { unitIds: ['HYD-09'], type: 'HYD', sector: 'B', x: 544, y: 319 },
  { unitIds: ['HYD-10'], type: 'HYD', sector: 'B', x: 596, y: 235 },
  { unitIds: ['HYD-11'], type: 'HYD', sector: 'B', x: 574, y: 274 },
  { unitIds: ['HYD-12'], type: 'HYD', sector: 'B', x: 476, y: 280 },
  { unitIds: ['HYD-13'], type: 'HYD', sector: 'B', x: 488, y: 340 },
  { unitIds: ['KRK-01'], type: 'KRK', sector: 'B', x: 613, y: 390 },
  { unitIds: ['KRK-02'], type: 'KRK', sector: 'B', x: 533, y: 366 },

  // Sector C · Sea Islands
  { unitIds: ['ROC-03'], type: 'ROC', sector: 'C', x: 463, y: 430 },
  { unitIds: ['GRF-03'], type: 'GRF', sector: 'C', x: 398, y: 476 },
  { unitIds: ['HYD-14'], type: 'HYD', sector: 'C', x: 429, y: 438 },
  { unitIds: ['HYD-15', 'HYD-16', 'HYD-17', 'HYD-18'], type: 'HYD', sector: 'C', x: 489, y: 370 },
  { unitIds: ['HYD-19'], type: 'HYD', sector: 'C', x: 370, y: 446 },
  { unitIds: ['HYD-20'], type: 'HYD', sector: 'C', x: 524, y: 405 },

  // Sector D · Edisto
  { unitIds: ['ROC-04'], type: 'ROC', sector: 'D', x: 277, y: 534 },
  { unitIds: ['GRF-04'], type: 'GRF', sector: 'D', x: 209, y: 548 },
  { unitIds: ['HYD-21'], type: 'HYD', sector: 'D', x: 122, y: 635 },
  { unitIds: ['HYD-22'], type: 'HYD', sector: 'D', x: 335, y: 470 },
  { unitIds: ['HYD-23'], type: 'HYD', sector: 'D', x: 59, y: 726 },
  { unitIds: ['HYD-24'], type: 'HYD', sector: 'D', x: 220, y: 606 },
  { unitIds: ['KRK-03'], type: 'KRK', sector: 'D', x: 276, y: 745 },
  { unitIds: ['KRK-04'], type: 'KRK', sector: 'D', x: 223, y: 772 },
];

/**
 * Where each Griffin holds station, which is what makes GRF-02 the relay
 * Sector B's Hydras depend on.
 */
export const RELAY_STATION: Record<string, SectorId> = {
  'GRF-01': 'A',
  'GRF-02': 'B',
  'GRF-03': 'C',
  'GRF-04': 'D',
};

/** The ring and the two labels the incident draws, from frame 289:2394. */
export const INCIDENT_RING = { x: 518.51, y: 237.04, size: 38 };
export const INCIDENT_RELAY_LABEL = { x: 451, y: 215 };
export const INCIDENT_AFFECTED_LABEL = { x: 299, y: 321 };

/**
 * The map label for Sector C moves up while the incident card is open, because
 * the feed grows to hold the card and would otherwise sit on top of it. Frame
 * 289:2394 draws it here.
 */
export const INCIDENT_SECTOR_LABEL: Partial<Record<SectorId, { x: number; y: number }>> = {
  /*
   * Frame 289:2394 moves Sector C's label here and leaves Sector B's where it
   * is, because the feed in that draft starts at y 612 and both labels just
   * clear it. The card as built runs about 20 px taller than the draft, so
   * both labels are lifted to keep the clearance the frame intends — the
   * incident sector's own label is the last thing that should go under the
   * card describing it. Flagged for design review.
   */
  B: { x: 744.55, y: 571 },
  C: { x: 547, y: 549 },
};

/** How far a marker is dimmed when its position is no longer current. */
export const UNTRUSTED_OPACITY = 0.45;
