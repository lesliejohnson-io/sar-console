import { describe, expect, it } from 'vitest';
import { INCIDENT } from '../data/live';
import { SECTOR_SHAPES } from '../data/sectorPaths';
import { SECTOR_IDS } from '../data/sectors';
import { bounds, parsePolygon, pointInPolygon } from './geometry';
import { searchedCoverage, type Outage } from './live';
import {
  activeMinutes,
  bandsFor,
  clearedPerBand,
  coveredCells,
  sectorGrid,
  sweepTally,
  unitPosition,
} from './sweep';
import type { SectorId } from '../data/types';

/**
 * The promise the live map makes: the ground it shows as searched is the
 * percentage the rail reports, cell for cell.
 */

const PLAN: Record<SectorId, string[]> = {
  A: ['ROC-01', 'HYD-01', 'HYD-02', 'HYD-03', 'HYD-04', 'HYD-05', 'HYD-06'],
  B: [
    'ROC-02',
    ...INCIDENT.affectedUnits,
    'KRK-01',
    'KRK-02',
  ],
  C: ['ROC-03', 'HYD-14', 'HYD-15', 'HYD-16', 'HYD-17', 'HYD-18', 'HYD-19', 'HYD-20'],
  D: ['ROC-04', 'HYD-21', 'HYD-22', 'HYD-23', 'HYD-24', 'KRK-03', 'KRK-04'],
};

const PACE: Record<SectorId, number> = { A: 1.058, B: 0.95, C: 0.957, D: 0.932 };

const searched = (sector: SectorId, minute: number, outages: Outage[] = []) =>
  searchedCoverage(sector, PLAN[sector], minute, outages, PACE[sector]);

describe('sector outlines as shapes', () => {
  it('parses every sector into a closed polygon', () => {
    for (const shape of SECTOR_SHAPES) {
      const polygon = parsePolygon(shape.d, { x: shape.box.x, y: shape.box.y });
      expect(polygon.length).toBeGreaterThan(3);

      // The parsed corners sit in the box Figma exported them with.
      const box = bounds(polygon);
      expect(box.x).toBeCloseTo(shape.box.x, 1);
      expect(box.y).toBeCloseTo(shape.box.y, 1);
      expect(box.width).toBeCloseTo(shape.box.width, 1);
      expect(box.height).toBeCloseTo(shape.box.height, 1);
    }
  });

  it('refuses a path it cannot read exactly', () => {
    expect(() => parsePolygon('M0 0C10 10 20 20 30 30Z')).toThrow(/Unsupported/);
  });

  it('knows inside from outside', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 5, y: -1 }, square)).toBe(false);
  });
});

describe('the grid', () => {
  it('gives every sector a usable number of cells, all inside it', () => {
    for (const sector of SECTOR_IDS) {
      const grid = sectorGrid(sector);
      expect(grid.total).toBeGreaterThan(100);

      for (const cell of grid.rows.flat()) {
        expect(pointInPolygon({ x: cell.x + 9, y: cell.y + 9 }, grid.polygon)).toBe(true);
      }
    }
  });

  it('hands every cell to exactly one unit', () => {
    for (const sector of SECTOR_IDS) {
      const bands = bandsFor(sector, PLAN[sector]);
      expect(bands).toHaveLength(PLAN[sector].length);

      const owned = bands.flatMap((band) => band.cells);
      expect(owned).toHaveLength(sectorGrid(sector).total);

      const keys = new Set(owned.map((cell) => `${cell.x}:${cell.y}`));
      expect(keys.size).toBe(owned.length);
    }
  });
});

describe('cleared cells match the percentage the rail shows', () => {
  it('holds for every sector at every minute of the mission', () => {
    for (const sector of SECTOR_IDS) {
      for (let minute = 0; minute <= 120; minute += 1) {
        const percent = searched(sector, minute);
        const { cleared, total } = sweepTally(sector, PLAN[sector], percent, minute, []);
        expect(Math.round((cleared / total) * 100)).toBe(percent);
      }
    }
  });

  it('holds through the relay loss, when seven units stop', () => {
    const outages: Outage[] = [{ unitIds: INCIDENT.affectedUnits, from: INCIDENT.atMinute }];

    for (let minute = 0; minute <= 120; minute += 1) {
      const percent = searched('B', minute, outages);
      const { cleared, total } = sweepTally('B', PLAN.B, percent, minute, outages);
      expect(Math.round((cleared / total) * 100)).toBe(percent);
    }
  });

  it('never un-searches ground', () => {
    const outages: Outage[] = [{ unitIds: INCIDENT.affectedUnits, from: INCIDENT.atMinute }];
    let last = 0;

    for (let minute = 0; minute <= 120; minute += 1) {
      const percent = searched('B', minute, outages);
      const { cleared } = sweepTally('B', PLAN.B, percent, minute, outages);
      expect(cleared).toBeGreaterThanOrEqual(last);
      last = cleared;
    }
  });

  it('starts with every cell covered', () => {
    for (const sector of SECTOR_IDS) {
      expect(coveredCells(sector, PLAN[sector], 0, 0, [])).toHaveLength(
        sectorGrid(sector).total,
      );
    }
  });
});

describe('a unit that stops', () => {
  const outages: Outage[] = [{ unitIds: INCIDENT.affectedUnits, from: INCIDENT.atMinute }];
  const bands = bandsFor('B', PLAN.B);
  const held = bands.findIndex((band) => band.unitId === 'HYD-07');
  const working = bands.findIndex((band) => band.unitId === 'ROC-02');

  it('stops clearing its own strip', () => {
    const at = (minute: number) =>
      clearedPerBand(bands, searched('B', minute, outages), minute, outages);

    const atLoss = at(INCIDENT.atMinute);
    const later = at(120);

    // The held strip is where it was; its neighbours keep going.
    expect(later[held]).toBeLessThanOrEqual(atLoss[held] + 1);
    expect(later[working]).toBeGreaterThan(atLoss[working]);
  });

  it('leaves its strip visibly unsearched at the end of the mission', () => {
    const covered = coveredCells('B', PLAN.B, searched('B', 120, outages), 120, outages);
    const key = (cell: { x: number; y: number }) => `${cell.x}:${cell.y}`;

    const share = (index: number) => {
      const own = new Set(bands[index].cells.map(key));
      return covered.filter((cell) => own.has(key(cell))).length / own.size;
    };

    // Half the held strip never gets searched, while the strip next to it,
    // flown by a unit that never stopped, is finished.
    expect(share(held)).toBeGreaterThanOrEqual(0.4);
    expect(share(working)).toBeLessThan(0.05);
  });

  it('stops moving, and stays where it stopped', () => {
    const band = bands[held];
    const atLoss = unitPosition('HYD-07', band, INCIDENT.atMinute, outages);
    const later = unitPosition('HYD-07', band, 120, outages);

    expect(later).toEqual(atLoss);
    expect(activeMinutes('HYD-07', 120, outages)).toBe(INCIDENT.atMinute);
  });
});

describe('unit motion', () => {
  it('moves, slowly and without jumping', () => {
    const band = bandsFor('A', PLAN.A).find((one) => one.unitId === 'HYD-01')!;

    let previous = unitPosition('HYD-01', band, 0, []);
    let moved = 0;

    for (let minute = 1; minute <= 120; minute += 1) {
      const next = unitPosition('HYD-01', band, minute, []);
      const step = Math.hypot(next.x - previous.x, next.y - previous.y);
      // Never a teleport: a minute's travel is a small part of the band.
      expect(step).toBeLessThan(band.radius * 2 + 40);
      moved += step;
      previous = next;
    }

    expect(moved).toBeGreaterThan(100);
  });

  it('keeps a unit inside its own sector', () => {
    const grid = sectorGrid('D');
    for (const band of bandsFor('D', PLAN.D)) {
      for (const minute of [0, 30, 60, 90, 120]) {
        const point = unitPosition(band.unitId, band, minute, []);
        expect(point.x).toBeGreaterThanOrEqual(grid.box.x - 20);
        expect(point.x).toBeLessThanOrEqual(grid.box.x + grid.box.width + 20);
        expect(point.y).toBeGreaterThanOrEqual(grid.box.y - 20);
        expect(point.y).toBeLessThanOrEqual(grid.box.y + grid.box.height + 20);
      }
    }
  });

  it('circles a fixed-wing rather than mowing with it', () => {
    const band = bandsFor('C', PLAN.C).find((one) => one.unitId === 'ROC-03')!;
    const points = [0, 15, 30, 45, 60].map((minute) =>
      unitPosition('ROC-03', band, minute, []),
    );

    for (const point of points) {
      const radius = Math.hypot(point.x - band.centre.x, point.y - band.centre.y);
      expect(radius).toBeCloseTo(band.radius, 5);
    }
  });
});
