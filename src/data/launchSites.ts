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
