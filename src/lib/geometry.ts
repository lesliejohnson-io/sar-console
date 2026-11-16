/**
 * Just enough geometry to work with the sector outlines as shapes rather than
 * as drawings.
 *
 * The Figma exports are closed polygons — `M`, `L` and `Z`, no curves — so
 * they parse into a list of corners exactly, with no approximation. That is
 * what lets the coverage grid be a pure function: which cells lie inside a
 * sector is decided here, in plain arithmetic, and can be tested without a
 * browser.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The corners of a Figma-exported sector path, offset into stage coordinates.
 *
 * Throws on anything that is not a straight-line polygon: a curve would be
 * silently mis-parsed as a corner, and a sector that is subtly the wrong shape
 * is worse than one that fails loudly at startup.
 */
export function parsePolygon(d: string, offset: Point = { x: 0, y: 0 }): Point[] {
  const points: Point[] = [];
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];

  const number = (token: string | undefined, command: string): number => {
    const value = Number(token);
    if (token === undefined || !Number.isFinite(value)) {
      throw new Error(`Malformed sector path near "${command}"`);
    }
    return value;
  };

  let index = 0;
  let command = '';
  let x = 0;
  let y = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (/[A-Za-z]/.test(token)) {
      command = token;
      index += 1;
      if (command === 'Z' || command === 'z') continue;
    }
    // Anything else repeats the command in force, which is how SVG writes a
    // run of line segments without naming `L` every time.

    switch (command) {
      case 'M':
      case 'L':
        x = number(tokens[index], command);
        y = number(tokens[index + 1], command);
        index += 2;
        break;
      // Figma writes an axis-aligned edge as its shorthand.
      case 'H':
        x = number(tokens[index], command);
        index += 1;
        break;
      case 'V':
        y = number(tokens[index], command);
        index += 1;
        break;
      case 'Z':
      case 'z':
        continue;
      default:
        throw new Error(
          `Unsupported sector path command "${command}": expected M, L, H, V or Z`,
        );
    }

    points.push({ x: x + offset.x, y: y + offset.y });
  }

  return points;
}

/**
 * Whether a point is inside a polygon, by the even-odd ray rule.
 *
 * Points exactly on an edge are not promised either way, which is fine here:
 * cells are tested at their centres, and no cell centre lands on an edge by
 * construction.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];

    const straddles = a.y > point.y !== b.y > point.y;
    if (!straddles) continue;

    const crossingX = a.x + ((point.y - a.y) / (b.y - a.y)) * (b.x - a.x);
    if (point.x < crossingX) inside = !inside;
  }

  return inside;
}

/** The smallest box containing every point. */
export function bounds(polygon: Point[]): Box {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
