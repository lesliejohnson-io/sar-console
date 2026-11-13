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

/* --------------------------------------------- Screen 1 · Area overview */
/*
 * Frame 171:805, in the same 1440 x 1035 space. Screen 1 shows the area
 * before any tasking exists, so it draws three things Screen 2 does not —
 * launch sites, help-call pins and a priority chip over each sector label —
 * and gives the stat bar a different set of numbers, further right.
 */

export const OVERVIEW_STAT_BAR = { x: 587, y: 12, width: 448, height: 61 };

/**
 * The sector label on Screen 1 is anchored by its box rather than its centre,
 * because the priority chip has to sit exactly 24 px above it.
 */
export const OVERVIEW_SECTOR_LABEL: Record<SectorId, { x: number; y: number }> = {
  A: { x: 896.63, y: 403.98 },
  B: { x: 745.55, y: 577.59 },
  C: { x: 582.31, y: 680.32 },
  D: { x: 435.63, y: 800.03 },
};

export const PRIORITY_CHIP_OFFSET = { dy: -24, width: 60, height: 18 };

/** One pin per sector, at the heart of where the calls came from. */
export const HELP_CALL_POS: Record<SectorId, { x: number; y: number }> = {
  A: { x: 845, y: 284 },
  B: { x: 587, y: 394 },
  C: { x: 462, y: 486 },
  D: { x: 217, y: 675 },
};

/**
 * The Hydra range ring (frame 177:948): an 820 px circle centred on Staging A's
 * reach, drawn dashed so it reads as a limit rather than a boundary.
 */
export const RANGE_RING = {
  cx: 531,
  cy: 347,
  r: 410,
  label: { x: 417, y: 717 },
};

/** The reach card the selected sector opens (frame 177:1326). */
export const REACH_CARD = { x: 526.63, y: 760.03, width: 300 };

/** The unavailable-asset tooltip (frame 177:1693). */
export const UNAVAILABLE_TOOLTIP = { width: 216, height: 72 };

/** The empty state's card (frame 179:1345). */
export const DRAW_CARD = { x: 330, y: 560, width: 380 };

/**
 * The asset roster, in the rail's own coordinates. Cards are placed by their
 * top edge and take whatever height their rows give them, which reproduces the
 * frame's 221 / 89 / 161 / 161 exactly.
 */
export const ROSTER = {
  /** Where the rail's content starts, below the title bar. */
  content: { x: PANEL.x, y: PANEL.y + PANEL.titleHeight, width: PANEL.width },
  columns: { x: 4, y: 8, width: 366, height: 19 },
  card: { x: 4, width: 366 },
  cardTop: { ROC: 35, HYD: 264, GRF: 361, KRK: 530 } as Record<string, number>,
  row: { height: 28 },
  footer: { x: 4, y: 894, width: 366, height: 44 },
  /** The empty state's "Draw at least one sector…" line, above the button. */
  hint: { y: 872 },
};

/* ------------------------------------------- Screen 3 · Tasking live */
/*
 * Frames 238:2144 and 289:2394. The stat bar is anchored by its right edge
 * rather than its left: the live readings are wider than Screen 2's and
 * narrower than the incident's, and in all three frames the row ends against
 * the same edge of the top bar.
 */

export const LIVE_STAT_BAR = { right: STAGE.width - (TOP_BAR.x + TOP_BAR.width) };

/**
 * The event feed. Anchored by its bottom edge, just above the legend, so it
 * grows upward as the incident card opens inside it — which is what the two
 * frames draw (top 809 without the card, 612 with it, the same bottom).
 */
export const LIVE_FEED = { x: 580, width: 459, bottom: STAGE.height - 974 };

/** How much brighter searched ground is than the sector's own wash. */
export const SEARCHED_FILL_OPACITY = 0.34;
