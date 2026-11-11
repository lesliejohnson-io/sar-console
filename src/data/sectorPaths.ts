import type { SectorId } from "./types";

/**
 * Sector outlines, exported from the Figma `sector/...` vectors and kept in
 * the same 1440 x 1035 coordinate space as the rest of the stage. Each path is
 * drawn in its own box, so the path data is identical to what Figma exported
 * and only the box is positioned. Fill and stroke are token classes applied in
 * React, which is what lets a sector respond to its own coverage.
 *
 * Generated from src/assets/map/fog-*.svg - do not hand-edit the path data.
 */

export interface SectorShape {
  id: SectorId;
  /** Position and size on the 1440 x 1035 stage. */
  box: { x: number; y: number; width: number; height: number };
  /** Path data, in a viewBox the same size as the box. */
  d: string;
}

export const SECTOR_SHAPES: SectorShape[] = [
  {
    id: "A",
    box: { x: 649.64, y: 85.01, width: 493.91, height: 440.285 },
    d: "M0 131.239L56.4468 112.894L225.787 98.7819L338.681 0H479.798L493.91 84.6702L395.128 225.787L225.787 381.016L127.005 440.285L35.2793 359.848L9.87819 296.346L4.23351 225.787L0 131.239Z",
  },
  {
    id: "B",
    box: { x: 480.3, y: 216.24, width: 296.346, height: 393.717 },
    d: "M0 94.5484L56.4468 38.1016L169.34 0L173.574 94.5484L179.219 165.107L204.62 228.61L296.346 309.046L254.011 334.447L155.229 393.717L127.005 285.056L98.782 228.61L49.391 165.107L0 94.5484Z",
  },
  {
    id: "C",
    box: { x: 367.41, y: 310.79, width: 268.122, height: 388.072 },
    d: "M0 118.538L42.3351 70.5585L112.894 0L162.285 70.5585L211.676 134.061L239.899 190.508L268.122 299.168L225.787 324.569L155.229 388.072L98.7819 324.569L77.6144 268.122L42.3351 197.564L0 118.538Z",
  },
  {
    id: "D",
    box: { x: 14.61, y: 429.33, width: 508.021, height: 544.712 },
    d: "M28.2234 544.712L0 431.818L70.5585 262.478L183.452 135.472L296.346 64.9138L352.793 0L395.128 79.0256L430.407 149.584L451.575 206.031L508.021 269.534L451.575 318.925L296.346 431.818L197.564 544.712H28.2234Z",
  },
];

/** Wash over a sector, as exported: map/searched at 15%. */
export const SECTOR_FILL_OPACITY = 0.15;

/** Outline weights, as exported: a selected sector draws heavier and brighter. */
export const SECTOR_STROKE_WIDTH = { default: 1.13487, selected: 2 };
