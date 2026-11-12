import { describe, expect, it } from 'vitest';
import { CONTRIBUTION, coverage, overallCoverage, weakestSector } from './coverage';
import { COVERAGE_TARGET, SECTOR_IDS, SECTORS_BY_ID } from '../data/sectors';
import type { AssetType, SectorId } from '../data/types';

const times = (type: AssetType, n: number): AssetType[] => Array<AssetType>(n).fill(type);

/** The plan the demo opens Screen 2 with. */
const OPEN: Record<SectorId, AssetType[]> = {
  A: ['ROC', ...times('HYD', 6)],
  B: ['ROC', ...times('HYD', 7), ...times('KRK', 4)],
  C: ['ROC', ...times('HYD', 7)],
  D: ['ROC', ...times('HYD', 4)],
};

/** After the operator drags KRK-03 and KRK-04 from Sector B to Sector D. */
const MOVED: Record<SectorId, AssetType[]> = {
  ...OPEN,
  B: ['ROC', ...times('HYD', 7), ...times('KRK', 2)],
  D: ['ROC', ...times('HYD', 4), ...times('KRK', 2)],
};

const coverageOf = (plan: Record<SectorId, AssetType[]>): Record<SectorId, number> =>
  Object.fromEntries(SECTOR_IDS.map((id) => [id, coverage(id, plan[id])])) as Record<
    SectorId,
    number
  >;

describe('coverage model calibration', () => {
  it('A · ROC + 6 HYD = 92', () => {
    expect(coverage('A', OPEN.A)).toBe(92);
  });

  it('B · ROC + 7 HYD + 4 KRK = 89', () => {
    expect(coverage('B', OPEN.B)).toBe(89);
  });

  it('B · ROC + 7 HYD + 2 KRK = 83', () => {
    expect(coverage('B', MOVED.B)).toBe(83);
  });

  it('C · ROC + 7 HYD = 87', () => {
    expect(coverage('C', OPEN.C)).toBe(87);
  });

  it('D · ROC + 4 HYD = 44', () => {
    expect(coverage('D', OPEN.D)).toBe(44);
  });

  it('D · ROC + 4 HYD + 2 KRK = 82', () => {
    expect(coverage('D', MOVED.D)).toBe(82);
  });

  it('overall at open = 78', () => {
    expect(overallCoverage(coverageOf(OPEN))).toBe(78);
  });

  it('overall after both Krakens move = 86', () => {
    expect(overallCoverage(coverageOf(MOVED))).toBe(86);
  });
});

describe('coverage model properties', () => {
  it('moving any unit out of a sector never raises that sector coverage', () => {
    const types: AssetType[] = ['ROC', 'HYD', 'KRK', 'GRF'];

    for (const sector of SECTOR_IDS) {
      for (const plan of [OPEN, MOVED]) {
        const units = plan[sector];
        for (let index = 0; index < units.length; index += 1) {
          const without = units.filter((_, i) => i !== index);
          expect(coverage(sector, without)).toBeLessThanOrEqual(coverage(sector, units));
        }
      }

      // and adding any unit never lowers it
      for (const type of types) {
        expect(coverage(sector, [...OPEN[sector], type])).toBeGreaterThanOrEqual(
          coverage(sector, OPEN[sector]),
        );
      }
    }
  });

  it('an empty sector has no coverage and every contribution is a share', () => {
    for (const sector of SECTOR_IDS) {
      expect(coverage(sector, [])).toBe(0);
      for (const type of Object.keys(CONTRIBUTION) as AssetType[]) {
        expect(CONTRIBUTION[type][sector]).toBeGreaterThanOrEqual(0);
        expect(CONTRIBUTION[type][sector]).toBeLessThan(1);
      }
    }
  });

  it('names the weakest sector', () => {
    expect(weakestSector(coverageOf(OPEN))).toBe('D');
    expect(weakestSector(coverageOf(MOVED))).toBe('D');
  });
});

/**
 * The low-coverage warning is never written down anywhere: a sector shows it
 * when the model puts it under the target, and stops showing it when the model
 * does not. These lock the threshold the operator actually sees, so a change
 * to the contribution table cannot quietly turn the warning off.
 */
describe('low-coverage warning threshold', () => {
  const belowTarget = (sector: SectorId, units: AssetType[]) =>
    coverage(sector, units) < COVERAGE_TARGET;

  const D_OPEN: AssetType[] = ['ROC', ...times('HYD', 4)];

  it('warns on Sector D at open: 44%, 16 points short of the target', () => {
    expect(coverage('D', D_OPEN)).toBe(44);
    expect(COVERAGE_TARGET - coverage('D', D_OPEN)).toBe(16);
    expect(belowTarget('D', D_OPEN)).toBe(true);
  });

  it('clears the warning once both Krakens arrive', () => {
    expect(coverage('D', MOVED.D)).toBe(82);
    expect(belowTarget('D', MOVED.D)).toBe(false);
  });

  it('stays clear with one Kraken, and warns again when the last one leaves', () => {
    // Worth knowing which click brings the warning back: one Kraken still
    // holds Sector D above target, so it takes the last one leaving.
    const oneKraken: AssetType[] = [...D_OPEN, 'KRK'];

    expect(coverage('D', oneKraken)).toBe(68);
    expect(belowTarget('D', oneKraken)).toBe(false);
    expect(belowTarget('D', D_OPEN)).toBe(true);
  });

  it('leaves every other sector in the opening plan above target', () => {
    for (const sector of SECTOR_IDS) {
      if (sector === 'D') continue;
      expect(belowTarget(sector, OPEN[sector])).toBe(false);
    }
  });

  it('calls out a HIGH sector, which is what makes Sector D urgent', () => {
    expect(SECTORS_BY_ID.D.priority).toBe('HIGH');
    expect(SECTORS_BY_ID.A.priority).toBe('HIGH');
  });
});
