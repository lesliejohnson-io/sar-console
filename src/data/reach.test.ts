import { describe, expect, it } from 'vitest';
import { canOperatorMove } from './reach';
import { SECTOR_IDS } from './sectors';
import type { SectorId } from './types';

const reasonFor = (unitId: string, sector: SectorId): string => {
  const verdict = canOperatorMove(unitId, sector);
  return verdict.ok ? '' : verdict.reason;
};

describe('reach · what the operator may move where', () => {
  it('refuses a Griffin from every search sector', () => {
    for (const sector of SECTOR_IDS) {
      expect(canOperatorMove('GRF-02', sector).ok).toBe(false);
      expect(reasonFor('GRF-02', sector)).toContain('comms relay');
    }
  });

  it('refuses a Hydra into Sector D, and names the distance', () => {
    expect(canOperatorMove('HYD-01', 'D').ok).toBe(false);
    expect(reasonFor('HYD-01', 'D')).toBe(
      "Hydras can't reach: 19–38 km from Staging A (max 15)",
    );
  });

  it('allows a Hydra into every sector Staging A reaches', () => {
    for (const sector of ['A', 'B', 'C'] as SectorId[]) {
      expect(canOperatorMove('HYD-01', sector).ok).toBe(true);
    }
  });

  it('lets a Hydra the autonomy already put in D be moved out of it', () => {
    // Reach gates where a unit may be sent, never where it already is. The
    // four Hydras in Sector D stay; the operator can still pull them back.
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
