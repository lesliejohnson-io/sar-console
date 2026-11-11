import { MARKER } from '../data/mapGeometry';
import { unitNumber } from '../lib/units';
import { StateBadge } from './StateBadge';
import type { AssetType, UnitStatus } from '../data/types';
import glyphRoc from '../assets/icons/glyph-roc.svg';
import glyphHyd from '../assets/icons/glyph-hyd.svg';
import glyphKrk from '../assets/icons/glyph-krk.svg';
import glyphGrf from '../assets/icons/glyph-grf.svg';

/**
 * One marker per asset type per sector. The symbol says what the asset is, the
 * badge says how it is doing, and the pill names it: a single unit shows its
 * number ("ROC · 01"), a group shows its count ("HYD · x6").
 *
 * Positions are the exported Figma geometry for the 52 x 44 marker: the glyph
 * sits at its natural size, the badge is 8 px, and the pill fills the bottom.
 */

const GLYPH: Record<AssetType, { src: string; x: number; y: number; w: number; h: number }> = {
  ROC: { src: glyphRoc, x: 13.45, y: -1, w: 29.1111, h: 30 },
  GRF: { src: glyphGrf, x: 13.45, y: -1, w: 29.1111, h: 30 },
  HYD: { src: glyphHyd, x: 16, y: 4, w: 24.3633, h: 25.0448 },
  KRK: { src: glyphKrk, x: 15, y: 0, w: 24, h: 24 },
};

const BADGE: Record<AssetType, { x: number; y: number }> = {
  ROC: { x: 36.5, y: 15.5 },
  HYD: { x: 37.6, y: 17.54 },
  KRK: { x: 35, y: 15.5 },
  GRF: { x: 33, y: 18 },
};

export interface GroupMarkerProps {
  type: AssetType;
  unitIds: string[];
  status: UnitStatus;
  x: number;
  y: number;
}

export function GroupMarker({ type, unitIds, status, x, y }: GroupMarkerProps) {
  const glyph = GLYPH[type];
  const badge = BADGE[type];
  const count = unitIds.length;
  const suffix = count === 1 ? String(unitNumber(unitIds[0])).padStart(2, '0') : `x${count}`;

  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width: MARKER.width, height: MARKER.height }}
    >
      <img
        alt=""
        src={glyph.src}
        width={glyph.w}
        height={glyph.h}
        className={`absolute max-w-none ${type === 'KRK' ? 'drop-shadow-marker' : ''}`}
        style={{ left: glyph.x, top: glyph.y }}
      />
      <div className="absolute" style={{ left: badge.x, top: badge.y }}>
        <StateBadge status={status} size={8} />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-[14px] items-center gap-[5px] rounded-[99px] bg-map-label-pill px-[5px] py-px font-mono text-[9px] whitespace-nowrap text-text-primary">
        <p>{type} ·</p>
        <p>{suffix}</p>
      </div>
    </div>
  );
}
