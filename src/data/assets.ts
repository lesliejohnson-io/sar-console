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

export const UNITS: Unit[] = [
  ...series('ROC', 6, 'airfield', {
    5: { status: 'unavailable', unavailableReason: 'Maintenance' },
    6: { status: 'unavailable', unavailableReason: 'Maintenance' },
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
