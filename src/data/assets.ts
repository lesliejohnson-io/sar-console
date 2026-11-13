import type { AssetType, Unit } from './types';

/**
 * The roster: 38 assets, 36 available. Every unit is shown by its ID, never by
 * its class name. ROC-05 and ROC-06 are in maintenance and stay visible but
 * unassigned.
 */

const pad = (n: number) => String(n).padStart(2, '0');

const series = (
  type: AssetType,
  count: number,
  site: string,
  overrides: Record<number, Partial<Unit>> = {},
): Unit[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${type}-${pad(i + 1)}`,
    type,
    site,
    status: 'ready' as const,
    ...overrides[i + 1],
  }));

/*
 * Frame 177:1693 gives ROC-05's detail and return time. ROC-06 has no frame;
 * its line is written to match and is flagged for design review.
 */
export const UNITS: Unit[] = [
  ...series('ROC', 6, 'airfield', {
    5: {
      status: 'unavailable',
      unavailableReason: 'Maintenance',
      unavailableDetail: 'In maintenance: sensor recalibration',
      expectedBack: 'Expected back 22:00',
    },
    6: {
      status: 'unavailable',
      unavailableReason: 'Maintenance',
      unavailableDetail: 'In maintenance: airframe inspection',
      expectedBack: 'Expected back 23:30',
    },
  }),
  ...series('HYD', 24, 'stagingA'),
  ...series('GRF', 4, 'airfield'),
  ...series('KRK', 4, 'marina'),
];

export const UNITS_BY_ID: Record<string, Unit> = Object.fromEntries(
  UNITS.map((unit) => [unit.id, unit]),
);

export const AVAILABLE_UNITS = UNITS.filter((unit) => unit.status !== 'unavailable');

export const UNAVAILABLE_UNITS = UNITS.filter((unit) => unit.status === 'unavailable');

/** What each type is told to do, as the tasking table words it. */
export const TASK_COPY: Record<AssetType, { task: string; detail: string }> = {
  ROC: { task: 'Survey flood area', detail: 'Alt 8,000 ft' },
  HYD: { task: 'Search rooftops', detail: 'Until battery 50%' },
  KRK: { task: 'Search streets', detail: 'Sonar on' },
  GRF: { task: 'Comms relay', detail: '' },
};

/** Order the tasking table lists types in, within a sector. */
export const TYPE_ORDER: AssetType[] = ['ROC', 'HYD', 'KRK', 'GRF'];

/**
 * The asset roster on Screen 1 (frame 171:805). Every line is Figma's.
 *
 * `collapse` follows the roster-grouping note on page 118:1271: units sharing
 * status, site and link collapse to one row. The frame applies it only to the
 * 24 Hydras — six Rocs are still worth reading one by one — so which classes
 * collapse is data here rather than a count threshold.
 */
export interface RosterMeta {
  /** "Roc · fixed-wing", the card heading. */
  className: string;
  /** The Status · site column. */
  statusSite: string;
  /** The Endurance · link column. */
  endurance: string;
  collapse: boolean;
}

export const ROSTER_META: Record<AssetType, RosterMeta> = {
  ROC: {
    className: 'Roc · fixed-wing',
    statusSite: 'Ready · Airfield',
    endurance: '18 h · strong',
    collapse: false,
  },
  HYD: {
    className: 'Hydra · quadrotor',
    statusSite: 'Ready · Staging A',
    endurance: '45 min · strong',
    collapse: true,
  },
  GRF: {
    className: 'Griffin · VTOL relay',
    statusSite: 'Ready · Airfield',
    endurance: '6 h · strong',
    collapse: false,
  },
  KRK: {
    className: 'Kraken · surface drone',
    statusSite: 'Ready · Marina',
    endurance: '30 h · good',
    collapse: false,
  },
};

/** How an unavailable unit fills the same two columns. */
export const ROSTER_UNAVAILABLE = { statusSite: 'Maintenance', endurance: 'Unavailable' };

/** The order the roster lists its cards in, which is not the table's order. */
export const ROSTER_ORDER: AssetType[] = ['ROC', 'HYD', 'GRF', 'KRK'];

export const unitsOfType = (type: AssetType): Unit[] =>
  UNITS.filter((unit) => unit.type === type);
