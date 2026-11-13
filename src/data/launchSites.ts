import type { AssetType } from './types';

export interface LaunchSite {
  id: string;
  name: string;
  types: AssetType[];
  /** Operating radius, where the roster shows one. */
  rangeKm?: number;
}

export const LAUNCH_SITES: Record<string, LaunchSite> = {
  airfield: { id: 'airfield', name: 'Airfield', types: ['ROC', 'GRF'] },
  stagingA: { id: 'stagingA', name: 'Staging A', types: ['HYD'], rangeKm: 15 },
  marina: { id: 'marina', name: 'Marina', types: ['KRK'] },
};

/**
 * Where each site's units stand on the Screen 1 map, read from frame 171:805.
 *
 * One marker per site per class, and a second Roc marker for the two in
 * maintenance: the unavailable pair are drawn apart from the four that can
 * fly, so the operator sees at a glance what is actually available at the
 * Airfield.
 */
export interface SiteGroup {
  site: string;
  type: AssetType;
  /** The maintenance pair get their own marker and their own tooltip. */
  unavailable: boolean;
  x: number;
  y: number;
}

export const SITE_GROUPS: SiteGroup[] = [
  { site: 'airfield', type: 'GRF', unavailable: false, x: 470, y: 205 },
  { site: 'airfield', type: 'ROC', unavailable: false, x: 536, y: 205 },
  { site: 'airfield', type: 'ROC', unavailable: true, x: 592, y: 205 },
  { site: 'stagingA', type: 'HYD', unavailable: false, x: 505, y: 335 },
  { site: 'marina', type: 'KRK', unavailable: false, x: 690, y: 425 },
];

/** The site name above its markers, in map-label caps. */
export const SITE_LABEL_POS: Record<string, { x: number; y: number }> = {
  airfield: { x: 470, y: 187 },
  stagingA: { x: 505, y: 317 },
  marina: { x: 690, y: 407 },
};
