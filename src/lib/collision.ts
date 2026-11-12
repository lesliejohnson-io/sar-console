import { closestCenter, type CollisionDetection } from '@dnd-kit/core';
import type { SectorId } from '../data/types';

/**
 * Which sector is under the pointer.
 *
 * dnd-kit's built-in strategies compare bounding rectangles, which does not
 * work here: the four sectors run diagonally across the map and their boxes
 * overlap heavily — A with B, B with C, C with D — so a drop near a boundary
 * would land in the wrong sector by a wide margin.
 *
 * Instead this asks the browser to hit-test the actual outline, the same path
 * the operator sees, with `isPointInFill`. The point is converted through the
 * path's own screen matrix, so the stage's scale is handled for free.
 *
 * Sectors are tested front to back, so the one drawn last wins where outlines
 * genuinely overlap. With no pointer — a keyboard drag — it falls back to
 * dnd-kit's `closestCenter` over the same containers.
 */
export function sectorCollision(
  paths: Record<string, SVGPathElement | null>,
  order: readonly SectorId[],
): CollisionDetection {
  return (args) => {
    const pointer = args.pointerCoordinates;

    if (pointer) {
      for (let index = order.length - 1; index >= 0; index -= 1) {
        const id = order[index];
        const container = args.droppableContainers.find((candidate) => candidate.id === id);
        if (!container) continue;
        if (hits(paths[id], pointer.x, pointer.y)) {
          return [{ id, data: { droppableContainer: container, value: 0 } }];
        }
      }
      return [];
    }

    return closestCenter(args);
  };
}

function hits(path: SVGPathElement | null | undefined, x: number, y: number): boolean {
  if (!path) return false;

  const svg = path.ownerSVGElement;
  const matrix = path.getScreenCTM();
  if (!svg || !matrix) return false;

  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;

  try {
    return path.isPointInFill(point.matrixTransform(matrix.inverse()));
  } catch {
    // jsdom and older engines do not implement isPointInFill; the keyboard
    // path and the tests do not depend on it.
    return false;
  }
}
