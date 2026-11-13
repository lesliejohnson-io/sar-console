import { SECTOR_IDS, SECTORS_BY_ID } from './sectors';
import { UNITS_BY_ID } from './assets';
import type { AssetType, SectorId } from './types';

/**
 * Reach: what each asset type can work, sector by sector.
 *
 * Two different questions are answered from this one table, and they are not
 * the same question:
 *
 *   - **Reach** is physical. It is what Screen 1's reach card reports, grouping
 *     each type under Can reach / Partial / Can't reach with a reason in a few
 *     words (frame 177:1326).
 *   - **Taskable** is a decision. It is what Screen 2 asks before accepting a
 *     drop, and it can differ: Griffins *reach* every sector — the card says
 *     "relay covers sector" — but they fly relay for the whole area and are
 *     never tasked to one, so a Griffin dropped on a sector is refused.
 *
 * Ranges come from the Figma reach note (177:1321): Rocs 400 km and Krakens
 * 80 km cover the whole area, Hydras 15 km from Staging A. Sector D is the one
 * place a Hydra falls short, and frame 177:1326 calls that **Partial** — the
 * NE edge of the sector is inside the limit, which is why the autonomy can put
 * HYD-21–24 there at all and why Sector D only reaches 44%.
 */

export type ReachLevel = 'full' | 'partial' | 'none';

export interface Reach {
  level: ReachLevel;
  /** The reason, in the few words the reach card gives it. */
  detail: string;
}

/** Headings the reach card groups under, and the status colour of each dot. */
export const REACH_GROUPS: { level: ReachLevel; label: string; status: string }[] = [
  { level: 'full', label: 'Can reach', status: 'bg-status-ready' },
  { level: 'partial', label: 'Partial', status: 'bg-status-needs-operator' },
  { level: 'none', label: "Can't reach", status: 'bg-status-unavailable' },
];

/** The marker the design puts in front of a reach warning. */
export const REACH_WARNING_GLYPH = '◆';

/** How the roster and the reach card name each class. */
export const TYPE_NAME: Record<AssetType, string> = {
  ROC: 'Roc',
  HYD: 'Hydra',
  GRF: 'Griffin',
  KRK: 'Kraken',
};

/**
 * Sector by sector. Only Hydras vary: the other three cover the whole area, so
 * their line names the site and how long they can stay rather than a limit.
 */
const full = (detail: string): Reach => ({ level: 'full', detail });

const HYDRA: Record<SectorId, Reach> = {
  A: full('from Staging A · 45 min'),
  B: full('from Staging A · 45 min'),
  C: full('from Staging A · 45 min'),
  // Frame 177:1326, verbatim.
  D: { level: 'partial', detail: 'NE edge only · 15 km limit' },
};

export const REACH: Record<AssetType, Record<SectorId, Reach>> = {
  ROC: Object.fromEntries(
    SECTOR_IDS.map((id) => [id, full('from Airfield · 18 h')]),
  ) as Record<SectorId, Reach>,
  HYD: HYDRA,
  GRF: Object.fromEntries(
    SECTOR_IDS.map((id) => [id, full('relay covers sector')]),
  ) as Record<SectorId, Reach>,
  KRK: Object.fromEntries(
    SECTOR_IDS.map((id) => [id, full('from Marina · 30 h')]),
  ) as Record<SectorId, Reach>,
};

export const reachOf = (type: AssetType, sector: SectorId): Reach => REACH[type][sector];

/* ------------------------------------------------------------------ tasking */

export type MoveVerdict =
  | { ok: true; caution?: string }
  | { ok: false; reason: string };

const RELAY_REASON = 'Griffins fly comms relay over every sector, not one of them';

/**
 * May the operator move this unit into this sector? The map, the
 * "Move to sector…" menu and the store guard all ask this, so a refusal — or a
 * caution — reads the same wherever it surfaces.
 *
 * A partial sector is never blocked. The operator is told what they are taking
 * on and left to decide, which is the rule the whole console follows.
 */
export function canOperatorMove(unitId: string, toSector: SectorId): MoveVerdict {
  const unit = UNITS_BY_ID[unitId];
  if (!unit) return { ok: false, reason: 'Unknown unit' };

  if (unit.status === 'unavailable') {
    return { ok: false, reason: `${unitId} is unavailable: ${unit.unavailableReason}` };
  }

  if (unit.type === 'GRF') return { ok: false, reason: RELAY_REASON };

  const reach = reachOf(unit.type, toSector);
  if (reach.level === 'none') {
    return { ok: false, reason: `${TYPE_NAME[unit.type]}s can't reach: ${reach.detail}` };
  }
  if (reach.level === 'partial') return { ok: true, caution: reach.detail };

  return { ok: true };
}

/** "Sector D · Edisto" — how a refusal names the place it refused. */
export const sectorLabel = (sector: SectorId): string => SECTORS_BY_ID[sector].label;
