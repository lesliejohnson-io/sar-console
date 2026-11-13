import { describe, expect, it } from 'vitest';
import { canOperatorMove, reachOf } from './reach';
import { SECTOR_IDS } from './sectors';
import type { AssetType, SectorId } from './types';

const reasonFor = (unitId: string, sector: SectorId): string => {
  const verdict = canOperatorMove(unitId, sector);
  return verdict.ok ? '' : verdict.reason;
};

const cautionFor = (unitId: string, sector: SectorId): string | undefined => {
  const verdict = canOperatorMove(unitId, sector);
  return verdict.ok ? verdict.caution : undefined;
};

describe('reach · what each type can work', () => {
  it('puts Hydras in Sector D under Partial, in the words the card uses', () => {
    expect(reachOf('HYD', 'D')).toEqual({
      level: 'partial',
      detail: 'NE edge only · 15 km limit',
    });
  });

  it('gives Hydras full reach everywhere Staging A covers', () => {
    for (const sector of ['A', 'B', 'C'] as SectorId[]) {
      expect(reachOf('HYD', sector).level).toBe('full');
    }
  });

  it('lets Rocs, Krakens and Griffins reach the whole area', () => {
    for (const type of ['ROC', 'KRK', 'GRF'] as AssetType[]) {
      for (const sector of SECTOR_IDS) {
        expect(reachOf(type, sector).level).toBe('full');
      }
    }
  });

  it('gives every type and sector a reason the card can print', () => {
    for (const type of ['ROC', 'HYD', 'KRK', 'GRF'] as AssetType[]) {
      for (const sector of SECTOR_IDS) {
        expect(reachOf(type, sector).detail.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('canOperatorMove · what the operator may move where', () => {
  it('refuses a Griffin from every search sector', () => {
    for (const sector of SECTOR_IDS) {
      expect(canOperatorMove('GRF-02', sector).ok).toBe(false);
      expect(reasonFor('GRF-02', sector)).toContain('comms relay');
    }
  });

  it('allows a Hydra into Sector D, with the partial-reach caution', () => {
    // Partial is not refusal. The operator is told what they are taking on —
    // the NE edge is inside the 15 km limit — and left to decide.
    expect(canOperatorMove('HYD-01', 'D').ok).toBe(true);
    expect(cautionFor('HYD-01', 'D')).toBe('NE edge only · 15 km limit');
  });

  it('allows a Hydra into every sector Staging A fully reaches, with no caution', () => {
    for (const sector of ['A', 'B', 'C'] as SectorId[]) {
      expect(canOperatorMove('HYD-01', sector).ok).toBe(true);
      expect(cautionFor('HYD-01', sector)).toBeUndefined();
    }
  });

  it('lets a Hydra the autonomy put in D be moved out of it', () => {
    for (const sector of ['A', 'B', 'C'] as SectorId[]) {
      expect(canOperatorMove('HYD-21', sector).ok).toBe(true);
    }
  });

  it('lets Rocs and Krakens work the whole area', () => {
    for (const sector of SECTOR_IDS) {
      expect(canOperatorMove('ROC-01', sector).ok).toBe(true);
      expect(canOperatorMove('KRK-03', sector).ok).toBe(true);
    }
  });

  it('refuses a unit that is unavailable, and says why', () => {
    expect(canOperatorMove('ROC-05', 'A').ok).toBe(false);
    expect(reasonFor('ROC-05', 'A')).toContain('Maintenance');
  });

  it('gives every refusal a reason to show', () => {
    for (const unitId of ['GRF-01', 'HYD-02', 'ROC-05']) {
      for (const sector of SECTOR_IDS) {
        const verdict = canOperatorMove(unitId, sector);
        if (!verdict.ok) expect(verdict.reason.length).toBeGreaterThan(0);
      }
    }
  });
});
