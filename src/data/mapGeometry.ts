import type { SectorId } from './types';

/**
 * Every position on Screen 2, in the 1440 x 1035 stage coordinate space, read
 * from Figma frame 158:572. The stage is fixed and scaled to fit the viewport,
 * so these numbers never change at runtime.
 */

export const STAGE = { width: 1440, height: 1035 };

/**
 * The Figma `map/raster` layer. In the frame it is a 1490.571 x 1035 image at
 * (-197.06, -42), clipped by the frame; Figma exports that clipped result, so
 * the exported file drops straight onto the stage at its own size.
 */
export const MAP_RASTER = { x: 0, y: 0, width: 1293.511, height: 993 };

/**
 * The raster carries its own baked-in "Atlantic Ocean" label. The frame covers
 * it with a patch in the ocean colour and redraws the label in the UI font;
 * this keeps that behaviour.
 */
export const MAP_PATCH = { x: 835.67, y: 615.09, width: 120.296, height: 64.688 };
export const OCEAN_LABEL = { x: 927, y: 809, lines: ['Atlantic', 'Ocean'] };

export const TOP_BAR = { x: 9, y: 12, width: 1030, height: 61 };
export const STAT_BAR = { x: 444, y: 12, height: 61 };
export const LEGEND = { x: 9, y: 989, width: 1030, height: 34 };
export const PANEL = { x: 1047, y: 12, width: 384, titleHeight: 61, height: 1007 };

/** Map label for each sector: the anchor is the left edge, centred vertically. */
export const SECTOR_LABEL_POS: Record<SectorId, { x: number; y: number }> = {
  A: { x: 895.63, y: 420.48 },
  B: { x: 744.55, y: 594.09 },
  C: { x: 581.31, y: 696.82 },
  D: { x: 434.63, y: 816.53 },
};

export const RELAY_LABEL_POS = { x: 140, y: 150, lines: ['ALL SECTORS', 'COMMS RELAY'] };

export const MARKER = { width: 52, height: 44, step: 66.96 };

/**
 * Where a sector's group markers sit: one marker per asset type, laid out left
 * to right from the row origin.
 */
export const MARKER_ROW: Record<SectorId, { x: number; y: number }> = {
  A: { x: 871.18, y: 454.63 },
  B: { x: 718.88, y: 630.54 },
  C: { x: 561.13, y: 730.41 },
  D: { x: 377.28, y: 854.11 },
};

/** The Griffins fly relay over the whole area, so they stand apart. */
export const RELAY_MARKER = { x: 159.46, y: 193.82 };
