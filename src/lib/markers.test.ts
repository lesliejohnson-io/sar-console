import { describe, expect, it } from 'vitest';
import { MARKER, MARKER_ANCHOR } from '../data/mapGeometry';
import type { AssetType } from '../data/types';
import { BADGE_SIZE, badgeAt, glyphBox, LABEL_HEIGHT, labelTop } from './markers';
import { CELL } from './sweep';

const TYPES: AssetType[] = ['ROC', 'HYD', 'KRK', 'GRF'];

describe('asset marker scale', () => {
  it('draws every glyph smaller than one search-grid cell', () => {
    expect(MARKER.icon).toBeLessThan(CELL);
    for (const type of TYPES) {
      const box = glyphBox(type);
      expect(Math.max(box.width, box.height)).toBeCloseTo(MARKER.icon, 5);
    }
  });

  it('centres every glyph on the anchor, so rotation and position agree', () => {
    for (const type of TYPES) {
      const box = glyphBox(type);
      expect(box.left + box.width / 2).toBeCloseTo(MARKER_ANCHOR.x, 5);
      expect(box.top + box.height / 2).toBeCloseTo(MARKER_ANCHOR.y, 5);
    }
  });

  it('keeps the hit area well larger than the drawn glyph', () => {
    expect(MARKER.width).toBeGreaterThanOrEqual(MARKER.icon * 3);
    expect(MARKER.height).toBeGreaterThanOrEqual(MARKER.icon * 3);
  });

  it('keeps glyph, badge and label inside the box, so neighbours never overlap', () => {
    // Markers in a row or a fanned group are spaced by whole boxes, so anything
    // drawn inside the box cannot touch the next marker.
    expect(MARKER.step).toBeGreaterThanOrEqual(MARKER.width);
    for (const type of TYPES) {
      const glyph = glyphBox(type);
      const badge = badgeAt(type);
      expect(glyph.left).toBeGreaterThanOrEqual(0);
      expect(glyph.top).toBeGreaterThanOrEqual(0);
      expect(badge.left + BADGE_SIZE).toBeLessThanOrEqual(MARKER.width);
      expect(badge.top + BADGE_SIZE).toBeLessThanOrEqual(labelTop());
    }
    expect(labelTop() + LABEL_HEIGHT).toBeLessThanOrEqual(MARKER.height);
  });
});
