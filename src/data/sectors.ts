import type { AssetType, Priority, SectorId } from './types';

export interface Sector {
  id: SectorId;
  /** "Sector A · East Cooper", as the tasking table writes it. */
  label: string;
  /** The map label, which sets the sector name on its own line. */
  mapLabel: [string, string];
  priority: Priority;
  /**
   * Calls for help received from inside this sector before the towers went
   * down. Pinned on the Screen 1 map and named in the reach card.
   */
  helpCalls: number;
  /**
   * The autonomy's reason line. The subject is re-derived from whatever units
   * of `subjectType` are in the sector right now, so Sector B reads
   * "KRK-01–04 added: …" at open and "KRK-01–02 added: …" after the operator
   * moves two Krakens out.
   */
  reason: { subjectType: AssetType; suffix: string };
  /**
   * Shown with the low-coverage warning when the sector falls below target.
   * Why this sector is hard, in the autonomy's words.
   */
  lowCoverageCause: string;
}

/** A HIGH sector below this is called out in place, never blocked. */
export const COVERAGE_TARGET = 60;

export const SECTORS: Sector[] = [
  {
    id: 'A',
    label: 'Sector A · East Cooper',
    mapLabel: ['SECTOR A', 'EAST COOPER'],
    priority: 'HIGH',
    helpCalls: 5,
    reason: { subjectType: 'HYD', suffix: 'on rooftops: densest areas, most help calls' },
    lowCoverageCause: 'Rooftop search thin: dense blocks need more time on station.',
  },
  {
    id: 'B',
    label: 'Sector B · Peninsula',
    mapLabel: ['SECTOR B', 'PENINSULA'],
    priority: 'MEDIUM',
    helpCalls: 3,
    reason: { subjectType: 'KRK', suffix: 'added: water too deep for ground crews' },
    lowCoverageCause: 'Flooded streets: few units able to work the water.',
  },
  {
    id: 'C',
    label: 'Sector C · Sea Islands',
    mapLabel: ['SECTOR C', 'SEA ISLANDS'],
    priority: 'MEDIUM',
    helpCalls: 2,
    reason: { subjectType: 'ROC', suffix: 'alone: open marsh, few structures to inspect closely' },
    lowCoverageCause: 'Open marsh: wide area, little close inspection.',
  },
  {
    id: 'D',
    label: 'Sector D · Edisto',
    mapLabel: ['SECTOR D', 'EDISTO'],
    priority: 'HIGH',
    helpCalls: 6,
    reason: { subjectType: 'HYD', suffix: 'on rooftops: neighborhoods cut off by flooding' },
    lowCoverageCause: 'Hydras at max range from Staging A: little time on station.',
  },
];

export const SECTOR_IDS: SectorId[] = SECTORS.map((sector) => sector.id);

export const SECTORS_BY_ID: Record<SectorId, Sector> = Object.fromEntries(
  SECTORS.map((sector) => [sector.id, sector]),
) as Record<SectorId, Sector>;
