import { SECTOR_IDS } from '../data/sectors';
import type { AssetType, SectorId } from '../data/types';

/**
 * Expected coverage: the share of a sector searched in the next 2 hours.
 *
 *   coverage(sector, units) = 100 × (1 − Π(1 − c[type][sector]))
 *
 * Pure, no randomness, no time. `CONTRIBUTION` is per type and per sector, so
 * the same asset is worth less where it works badly: a Hydra is worth 0.30 in
 * dense East Cooper but 0.07 in Edisto, which is at max range from Staging A.
 * A Kraken is worth most in flooded Edisto, which is what makes the operator's
 * move pay off.
 *
 * The table is calibrated against the cases locked in `coverage.test.ts`.
 * Griffins fly comms relay and contribute no search coverage.
 */
export const CONTRIBUTION: Record<AssetType, Record<SectorId, number>> = {
  ROC: { A: 0.35, B: 0.26, C: 0.4, D: 0.25 },
  HYD: { A: 0.3, B: 0.14, C: 0.2, D: 0.07 },
  KRK: { A: 0.15, B: 0.195, C: 0.3, D: 0.43 },
  GRF: { A: 0, B: 0, C: 0, D: 0 },
};

/** Expected coverage of one sector, as a whole percent. */
export function coverage(sector: SectorId, units: readonly AssetType[]): number {
  const missed = units.reduce(
    (product, type) => product * (1 - CONTRIBUTION[type][sector]),
    1,
  );
  return Math.round(100 * (1 - missed));
}

/** Overall coverage: the unweighted mean of the four sectors. */
export function overallCoverage(bySector: Record<SectorId, number>): number {
  const values = SECTOR_IDS.map((id) => bySector[id]);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** The weakest sector: the lowest coverage, ties going to map order. */
export function weakestSector(bySector: Record<SectorId, number>): SectorId {
  return SECTOR_IDS.reduce((weakest, id) =>
    bySector[id] < bySector[weakest] ? id : weakest,
  );
}
