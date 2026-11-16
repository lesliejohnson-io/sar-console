import { SECTOR_SHAPES } from '../data/sectorPaths';
import { unitType } from './units';
import { SEARCH_WINDOW_MINUTES, type Outage } from './live';
import { bounds, parsePolygon, pointInPolygon, type Box, type Point } from './geometry';
import type { SectorId } from '../data/types';

/**
 * Ground, and who has been over it.
 *
 * The live map used to show progress as a wash that grew out of one corner,
 * which said "42%" without ever saying *which* 42%. This replaces it with the
 * thing the number actually means: the sector is divided into cells, every
 * cell starts covered, and a cell clears when the unit working that strip has
 * been over it.
 *
 * The one rule that holds the screen together is that the cleared cells must
 * come to exactly the percentage the rail reports. So the count is never
 * emergent — it is taken from `searchedCoverage`, the same figure the bar and
 * the plan tick are drawn from, and then handed out to the units in
 * proportion to how long each has actually been searching. A unit that stops
 * stops clearing, and its strip stays visibly covered; the arithmetic below
 * keeps the total honest while that happens.
 */

/** Cell size, in stage units. Small enough to read as ground, not as a chart. */
export const CELL = 18;

export interface Cell {
  /** Top-left corner, in stage coordinates. */
  x: number;
  y: number;
  row: number;
}

export interface SectorGrid {
  polygon: Point[];
  box: Box;
  /** Rows of cells, top to bottom; each row left to right. */
  rows: Cell[][];
  total: number;
}

const grids = new Map<SectorId, SectorGrid>();

/**
 * The cells of one sector: every cell of the grid whose centre falls inside
 * the sector outline. Built once per sector and cached — the outlines never
 * move, and rebuilding this on every tick of the mission clock would be the
 * most expensive thing on the screen.
 */
export function sectorGrid(sector: SectorId): SectorGrid {
  const cached = grids.get(sector);
  if (cached) return cached;

  const shape = SECTOR_SHAPES.find((one) => one.id === sector);
  if (!shape) throw new Error(`No outline for sector ${sector}`);

  const polygon = parsePolygon(shape.d, { x: shape.box.x, y: shape.box.y });
  const box = bounds(polygon);

  const rows: Cell[][] = [];
  let total = 0;

  const firstRow = Math.floor(box.y / CELL);
  const lastRow = Math.floor((box.y + box.height) / CELL);
  const firstCol = Math.floor(box.x / CELL);
  const lastCol = Math.floor((box.x + box.width) / CELL);

  for (let row = firstRow; row <= lastRow; row += 1) {
    const cells: Cell[] = [];
    for (let col = firstCol; col <= lastCol; col += 1) {
      const x = col * CELL;
      const y = row * CELL;
      if (pointInPolygon({ x: x + CELL / 2, y: y + CELL / 2 }, polygon)) {
        cells.push({ x, y, row });
      }
    }
    if (cells.length > 0) {
      rows.push(cells);
      total += cells.length;
    }
  }

  const grid: SectorGrid = { polygon, box, rows, total };
  grids.set(sector, grid);
  return grid;
}

/* --------------------------------------------------------------------- bands */

export interface Band {
  unitId: string;
  /** The cells this unit works, in the order it works them. */
  cells: Cell[];
  /** The lawnmower run through them, as waypoints in stage coordinates. */
  path: Point[];
  /** Centre and radius of the band, for a unit that orbits rather than mows. */
  centre: Point;
  radius: number;
}

/**
 * Who works which strip of the sector.
 *
 * The sector is cut into horizontal bands, one per searching unit, in unit-ID
 * order. Contiguous bands rather than interleaved ones, because the point of
 * drawing this at all is that the operator can see a unit's own work: when
 * HYD-07–13 stop, seven neighbouring strips stop with them, and Sector B is
 * visibly half-searched rather than uniformly a bit behind.
 */
export function bandsFor(sector: SectorId, unitIds: readonly string[]): Band[] {
  const grid = sectorGrid(sector);
  const working = [...unitIds].sort();
  if (working.length === 0 || grid.rows.length === 0) return [];

  const bands: Band[] = [];
  const rowCount = grid.rows.length;

  /*
   * Bands are cut to hold roughly the same amount of ground, not the same
   * number of rows. A sector is not a rectangle: cutting Sector B into ten
   * equal row-bands gives whoever draws the narrow tip five cells and whoever
   * draws the middle fifty, and the unit on the tip finishes its strip in the
   * first few minutes. Equal area keeps every unit working for the whole
   * mission, which is what the motion and the clearing both assume.
   */
  const perBand = grid.total / working.length;
  const splits: number[] = [];
  let cursor = 0;
  let seen = 0;

  for (let index = 0; index < working.length - 1; index += 1) {
    const want = perBand * (index + 1);
    // Always leave one row for each band still to come.
    const limit = rowCount - (working.length - index - 1);
    let take = cursor;
    let count = seen;
    while (take < limit && count + grid.rows[take].length / 2 < want) {
      count += grid.rows[take].length;
      take += 1;
    }
    cursor = Math.max(take, cursor + 1);
    seen = grid.rows.slice(0, cursor).reduce((sum, row) => sum + row.length, 0);
    splits.push(cursor);
  }
  splits.push(rowCount);

  working.forEach((unitId, index) => {
    const from = index === 0 ? 0 : splits[index - 1];
    const rows = grid.rows.slice(from, splits[index]);

    const cells: Cell[] = [];
    const path: Point[] = [];

    rows.forEach((row, rowIndex) => {
      // Alternate direction each row: a lawnmower does not fly back empty.
      const ordered = rowIndex % 2 === 0 ? row : [...row].reverse();
      cells.push(...ordered);

      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      path.push({ x: first.x + CELL / 2, y: first.y + CELL / 2 });
      path.push({ x: last.x + CELL / 2, y: last.y + CELL / 2 });
    });

    const xs = cells.map((cell) => cell.x);
    const ys = cells.map((cell) => cell.y);
    const centre = {
      x: (Math.min(...xs) + Math.max(...xs) + CELL) / 2,
      y: (Math.min(...ys) + Math.max(...ys) + CELL) / 2,
    };
    const radius = Math.min(
      (Math.max(...xs) - Math.min(...xs) + CELL) / 2,
      (Math.max(...ys) - Math.min(...ys) + CELL) / 2,
    );

    bands.push({ unitId, cells, path, centre, radius: Math.max(radius * 0.7, CELL) });
  });

  return bands;
}

/* ------------------------------------------------------------ what is cleared */

/** Whole minutes this unit has spent searching by now. */
export function activeMinutes(
  unitId: string,
  minute: number,
  outages: readonly Outage[],
): number {
  const end = Math.max(0, Math.min(Math.floor(minute), SEARCH_WINDOW_MINUTES));
  let active = 0;

  for (let m = 0; m < end; m += 1) {
    const out = outages.some(
      (outage) =>
        outage.unitIds.includes(unitId) &&
        m >= outage.from &&
        (outage.until === undefined || m < outage.until),
    );
    if (!out) active += 1;
  }

  return active;
}

/**
 * How many of each band's cells are cleared.
 *
 * The total is fixed first, from the percentage the rail is showing, and only
 * then shared out — so however the shares round, the cells on the map always
 * come to the number in the panel. Largest-remainder, so the rounding error
 * cannot accumulate, and any share a band is too small to take is passed on to
 * the bands that still have room.
 */
export function clearedPerBand(
  bands: readonly Band[],
  searchedPercent: number,
  minute: number,
  outages: readonly Outage[],
): number[] {
  const caps = bands.map((band) => band.cells.length);
  const total = caps.reduce((sum, one) => sum + one, 0);
  const target = Math.min(total, Math.max(0, Math.round((total * searchedPercent) / 100)));

  if (bands.length === 0) return [];
  if (target <= 0) return bands.map(() => 0);
  if (target >= total) return caps;

  const worked = bands.map((band) => activeMinutes(band.unitId, minute, outages));
  const workedTotal = worked.reduce((sum, one) => sum + one, 0);

  // Nothing has searched yet but the sector reports progress: spread it evenly
  // rather than leave the map blank against a number that says otherwise.
  const shares = workedTotal === 0 ? bands.map(() => 1) : worked;

  /*
   * Water-filling. Each band is owed `scale x its share`, and a band that
   * cannot hold what it is owed takes what it can and the rest flows to the
   * bands still working. Solved for `scale` by bisection, which is the part
   * that matters: the overflow from a full strip must never land on a strip
   * whose unit has stopped, or a sector would go on clearing ground nobody is
   * flying over.
   */
  const filled = (scale: number) =>
    shares.reduce((sum, share, index) => sum + Math.min(caps[index], scale * share), 0);

  let low = 0;
  let high = Math.max(...caps) / Math.min(...shares.filter((share) => share > 0), 1) + 1;
  for (let step = 0; step < 60; step += 1) {
    const mid = (low + high) / 2;
    if (filled(mid) < target) low = mid;
    else high = mid;
  }

  const exact = shares.map((share, index) => Math.min(caps[index], high * share));
  const counts = exact.map((value) => Math.floor(value));
  let remaining = target - counts.reduce((sum, one) => sum + one, 0);

  // Whatever rounding leaves over goes to the closest claims first, and only
  // to bands with room.
  const byRemainder = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    if (counts[index] >= caps[index]) continue;
    counts[index] += 1;
    remaining -= 1;
  }

  // Only reachable if every band that is owed anything is full; the few cells
  // left have to go somewhere, so they go to whoever still has room.
  for (let index = 0; index < counts.length && remaining > 0; index += 1) {
    const room = Math.min(remaining, caps[index] - counts[index]);
    counts[index] += room;
    remaining -= room;
  }

  return counts;
}

/** The cells still covered: everything no unit has worked yet. */
export function coveredCells(
  sector: SectorId,
  unitIds: readonly string[],
  searchedPercent: number,
  minute: number,
  outages: readonly Outage[],
): Cell[] {
  const bands = bandsFor(sector, unitIds);
  if (bands.length === 0) return sectorGrid(sector).rows.flat();

  const counts = clearedPerBand(bands, searchedPercent, minute, outages);
  return bands.flatMap((band, index) => band.cells.slice(counts[index]));
}

/** How many cells a sector has, and how many are cleared — for the tests. */
export function sweepTally(
  sector: SectorId,
  unitIds: readonly string[],
  searchedPercent: number,
  minute: number,
  outages: readonly Outage[],
): { cleared: number; total: number } {
  const total = sectorGrid(sector).total;
  const bands = bandsFor(sector, unitIds);
  if (bands.length === 0) return { cleared: 0, total };

  const counts = clearedPerBand(bands, searchedPercent, minute, outages);
  return { cleared: counts.reduce((sum, one) => sum + one, 0), total };
}

/* -------------------------------------------------------------------- motion */

/** Total length of a run of waypoints. */
const pathLength = (path: readonly Point[]): number => {
  let length = 0;
  for (let i = 1; i < path.length; i += 1) {
    length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return length;
};

/** The point a given distance along a run of waypoints. */
function along(path: readonly Point[], distance: number): Point {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1 || distance <= 0) return path[0];

  let left = distance;
  for (let i = 1; i < path.length; i += 1) {
    const span = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (left <= span || i === path.length - 1) {
      const t = span === 0 ? 0 : Math.min(1, left / span);
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * t,
      };
    }
    left -= span;
  }

  return path[path.length - 1];
}

/**
 * Where a unit is at this minute.
 *
 * Everything moves at a constant speed, and slowly: a band takes the whole
 * two-hour window to work, which is the same window the coverage model runs
 * on, so a unit reaching the end of its strip and the sector reaching its
 * expected coverage are the same event.
 *
 * A unit that is not searching does not move. It stays where it stopped,
 * which is what makes "holding at last known position" true on the map as
 * well as in the card.
 */
export function unitPosition(
  unitId: string,
  band: Band,
  minute: number,
  outages: readonly Outage[],
): Point {
  const worked = activeMinutes(unitId, minute, outages);
  const progress = Math.min(1, worked / SEARCH_WINDOW_MINUTES);

  if (unitType(unitId) === 'ROC') {
    // Fixed-wing: it circles its strip rather than mowing it, two turns over
    // the window, starting at the top of the circle.
    const angle = progress * Math.PI * 4 - Math.PI / 2;
    return {
      x: band.centre.x + Math.cos(angle) * band.radius,
      y: band.centre.y + Math.sin(angle) * band.radius,
    };
  }

  return along(band.path, pathLength(band.path) * progress);
}

/* ---------------------------------------------------------------- rendering */

/** The cells that have been searched: what the units have been over. */
export function clearedCells(
  sector: SectorId,
  unitIds: readonly string[],
  searchedPercent: number,
  minute: number,
  outages: readonly Outage[],
): Cell[] {
  const bands = bandsFor(sector, unitIds);
  if (bands.length === 0) return [];

  const counts = clearedPerBand(bands, searchedPercent, minute, outages);
  return bands.flatMap((band, index) => band.cells.slice(0, counts[index]));
}

/** How much smaller a drawn cell is than its slot, so the grid reads as grid. */
const CELL_GAP = 1;

/**
 * A run of cells as one SVG path.
 *
 * One path rather than a few hundred `<rect>`s: the grid is rebuilt every
 * mission minute, and a sector's worth of elements being reconciled that often
 * is the one thing on this screen that could cost a frame.
 */
export const cellsPath = (cells: readonly Cell[]): string => {
  const size = CELL - CELL_GAP;
  return cells
    .map((cell) => `M${cell.x} ${cell.y}h${size}v${size}h${-size}Z`)
    .join('');
};
