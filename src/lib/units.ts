import { TYPE_ORDER, UNITS_BY_ID } from '../data/assets';
import type { AssetType } from '../data/types';

/** "HYD-07" -> 7 */
export const unitNumber = (id: string): number => Number(id.slice(-2));

/** "HYD-07" -> "HYD" */
export const unitType = (id: string): AssetType => id.slice(0, 3) as AssetType;

export const byUnitId = (a: string, b: string): number => unitNumber(a) - unitNumber(b);

/**
 * How the tasking table labels a group of units of one type: a contiguous run
 * collapses to a range ("HYD-01–06"), a single unit stays itself ("ROC-01"),
 * and a broken run lists its parts ("KRK-01, KRK-03"). En dash, as in Figma.
 */
export function formatUnitRange(ids: readonly string[]): string {
  if (ids.length === 0) return '';
  const sorted = [...ids].sort(byUnitId);
  if (sorted.length === 1) return sorted[0];

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const contiguous = unitNumber(last) - unitNumber(first) === sorted.length - 1;

  if (!contiguous) return sorted.join(', ');
  return `${first}–${last.slice(-2)}`;
}

/** Units of one sector, grouped by type in table order. */
export function groupByType(unitIds: readonly string[]): { type: AssetType; unitIds: string[] }[] {
  return TYPE_ORDER.map((type) => ({
    type,
    unitIds: unitIds.filter((id) => UNITS_BY_ID[id].type === type).sort(byUnitId),
  })).filter((group) => group.unitIds.length > 0);
}
