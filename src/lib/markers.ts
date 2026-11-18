import { MARKER, MARKER_ANCHOR } from '../data/mapGeometry';
import type { AssetType } from '../data/types';

/**
 * How big a symbol is drawn, and where its parts sit around it.
 *
 * Every asset glyph used to carry its own size and its own offset into the
 * marker box, four numbers per type, copied out of Figma. That made the drawn
 * size four separate decisions, and all four were too big: a single drone came
 * out larger than a cell of the search grid it is flying over, which reads as
 * one aircraft covering that whole square of ground.
 *
 * Now there is one number — `MARKER.icon` — and everything else is worked out
 * from it. The symbols keep their own proportions, so a Roc stays a Roc, but
 * none of them is wider than the token on its longest side.
 */

/**
 * The natural proportions of each symbol, taken from its own SVG. Only the
 * ratio is used: the drawn size comes from the token.
 */
const PROPORTIONS: Record<AssetType, { w: number; h: number }> = {
  ROC: { w: 29.1111, h: 30 },
  GRF: { w: 29.1111, h: 30 },
  HYD: { w: 24.3633, h: 25.0448 },
  KRK: { w: 24, h: 24 },
};

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The drawn box for one glyph, centred on the marker's anchor.
 *
 * Centred rather than offset from a corner, because the anchor is where the
 * unit actually is: the live map positions a marker by putting this point on
 * the unit's position, and the heading rotation turns the glyph about it. A
 * symbol that grew from a corner would drift off its own position every time
 * the size token changed.
 */
export function glyphBox(type: AssetType): Box {
  const { w, h } = PROPORTIONS[type];
  const scale = MARKER.icon / Math.max(w, h);
  const width = w * scale;
  const height = h * scale;

  return {
    width,
    height,
    left: MARKER_ANCHOR.x - width / 2,
    top: MARKER_ANCHOR.y - height / 2,
  };
}

/**
 * The state badge's size, which does *not* follow the glyph down.
 *
 * Status is never carried by colour alone here — each state has its own shape
 * — and a shape needs pixels to be a shape. So the badge keeps the 8 px it has
 * always had and moves to the edge of the symbol rather than sitting on it.
 * It is the one part of a marker that is now larger than the glyph it
 * annotates, which is a deliberate trade: a drone the size of the ground it
 * covers was the worse lie.
 */
export const BADGE_SIZE = 8;

/**
 * Where that badge sits: off the symbol's lower-right shoulder, its foot level
 * with the foot of the glyph so it never reaches down into the name pill.
 */
export function badgeAt(type: AssetType): { left: number; top: number } {
  const box = glyphBox(type);
  return {
    left: box.left + box.width - 1,
    top: box.top + box.height - BADGE_SIZE + 1,
  };
}

/** How tall the name pill is, and the gap it keeps from the symbol. */
export const LABEL_HEIGHT = 14;
const LABEL_GAP = 2;

/**
 * Where the name pill's top edge sits.
 *
 * Worked out from the token rather than from each symbol's own box, so a row
 * of mixed types has its labels on one line. It follows the glyph up as the
 * token shrinks: a label left at the foot of the box would float away from
 * the thing it names.
 */
export const labelTop = (): number =>
  MARKER_ANCHOR.y + MARKER.icon / 2 + LABEL_GAP;
