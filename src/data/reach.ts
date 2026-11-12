import { LAUNCH_SITES } from './launchSites';
import { SECTOR_IDS, SECTORS_BY_ID } from './sectors';
import { UNITS_BY_ID } from './assets';
import type { AssetType, SectorId } from './types';

/**
 * Which sectors the operator may move a unit into.
 *
 * Reach gates **operator moves only**. It never re-judges a unit the autonomy
 * already placed: HYD-21–24 sit in Sector D on a one-way trip the autonomy
 * accepted deliberately — that is exactly why D opens at 44% — and they stay
 * there. What reach refuses is the operator sending *another* Hydra after them.
 *
 * Ranges are the ones in the Figma reach note (177:1321): Rocs 400 km and
 * Krakens 80 km cover the whole area, Hydras 15 km from Staging A. Frame
 * 179:1782 gives Sector D as 19–38 km from Staging A, out of reach, and gives
 * the wording this file uses verbatim.
 *
 * Griffins never take a search sector at all. They fly comms relay over every
 * sector, which is a different job, so a Griffin dropped on a sector is
 * refused rather than reassigned.
 */

export type ReachVerdict = { ok: true } | { ok: false; reason: string };

export const OK: ReachVerdict = { ok: true };

/** Sector distances from a launch site, where the design states one. */
export const DISTANCE_KM: Record<string, Partial<Record<SectorId, [number, number]>>> = {
  stagingA: { D: [19, 38] },
};

/**
 * The refusal lines. Both name the type, the sector or the site, and a number —
 * the rule from the design note is never to say only "can't reach".
 */
const outOfRange = (site: string, sector: SectorId): string => {
  const [min, max] = DISTANCE_KM[site]![sector]!;
  const { name, rangeKm } = LAUNCH_SITES[site];
  return `Hydras can't reach: ${min}–${max} km from ${name} (max ${rangeKm})`;
};

const RELAY_REASON = 'Griffins fly comms relay over every sector, not one of them';

/** Why HYD-21–24 can sit in a sector no other Hydra may be sent to. */
export const ONE_WAY_NOTE = 'Out and not back: 19–38 km from Staging A (max 15)';

/** The marker the design puts in front of a reach warning. */
export const REACH_WARNING_GLYPH = '◆';

const SITE_OF: Record<AssetType, string> = {
  ROC: 'airfield',
  HYD: 'stagingA',
  GRF: 'airfield',
  KRK: 'marina',
};

function verdict(type: AssetType, sector: SectorId): ReachVerdict {
  if (type === 'GRF') return { ok: false, reason: RELAY_REASON };

  const site = LAUNCH_SITES[SITE_OF[type]];
  const distance = DISTANCE_KM[site.id]?.[sector];
  if (site.rangeKm !== undefined && distance && distance[0] > site.rangeKm) {
    return { ok: false, reason: outOfRange(site.id, sector) };
  }

  return OK;
}

/** The whole table, resolved once: type × sector. */
export const REACH: Record<AssetType, Record<SectorId, ReachVerdict>> = Object.fromEntries(
  (Object.keys(SITE_OF) as AssetType[]).map((type) => [
    type,
    Object.fromEntries(SECTOR_IDS.map((id) => [id, verdict(type, id)])) as Record<
      SectorId,
      ReachVerdict
    >,
  ]),
) as Record<AssetType, Record<SectorId, ReachVerdict>>;

/**
 * May the operator move this unit into this sector? The map, the
 * "Move to sector…" menu and the store guard all ask this, so a refusal reads
 * the same wherever it surfaces.
 */
export function canOperatorMove(unitId: string, toSector: SectorId): ReachVerdict {
  const unit = UNITS_BY_ID[unitId];
  if (!unit) return { ok: false, reason: 'Unknown unit' };
  if (unit.status === 'unavailable') {
    return { ok: false, reason: `${unitId} is unavailable: ${unit.unavailableReason}` };
  }
  return REACH[unit.type][toSector];
}

/** "Sector D · Edisto" — how a refusal names the place it refused. */
export const sectorLabel = (sector: SectorId): string => SECTORS_BY_ID[sector].label;
