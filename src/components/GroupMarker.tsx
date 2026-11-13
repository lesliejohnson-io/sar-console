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
 *
 * Clicking a group of more than one fans it out into its individual units, so
 * the operator can take hold of one. The face itself is shared with
 * `UnitMarker`, which is what a fanned-out unit is.
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

/**
 * The glyph, badge and pill. Laid out in the marker's own 52 x 44 box.
 *
 * The badge and the pill are both optional, because what a marker has to say
 * depends on the screen. Screen 2 is a plan, so every marker is labelled and
 * carries its state. Screen 3 is 36 units flying at once: labels stay off
 * until a unit is an exception or the operator asks, and a badge shows only
 * when the unit is not in the state the screen expects — the rule in the
 * `note/Live map labels and badges` frame.
 */
export function MarkerFace({
  type,
  status,
  suffix,
  showStatus = true,
  showLabel = true,
}: {
  type: AssetType;
  status: UnitStatus;
  suffix: string;
  showStatus?: boolean;
  showLabel?: boolean;
}) {
  const glyph = GLYPH[type];
  const badge = BADGE[type];

  return (
    <>
      <img
        alt=""
        src={glyph.src}
        width={glyph.w}
        height={glyph.h}
        className={`absolute max-w-none ${type === 'KRK' ? 'drop-shadow-marker' : ''}`}
        style={{ left: glyph.x, top: glyph.y }}
      />
      {showStatus && (
        <div className="absolute" style={{ left: badge.x, top: badge.y }}>
          <StateBadge status={status} size={8} />
        </div>
      )}
      {showLabel && (
        <div className="absolute inset-x-0 bottom-0 flex h-[14px] items-center gap-[5px] rounded-[99px] bg-map-label-pill px-[5px] py-px font-mono text-[9px] whitespace-nowrap text-text-primary">
          <p>{type} ·</p>
          <p>{suffix}</p>
        </div>
      )}
    </>
  );
}

/** "HYD-07" -> "07" */
export const padded = (unitId: string): string =>
  String(unitNumber(unitId)).padStart(2, '0');

export interface GroupMarkerProps {
  type: AssetType;
  unitIds: string[];
  status: UnitStatus;
  x: number;
  y: number;
  /** Omitted for a group that cannot be opened, such as on a static screen. */
  onExpand?: () => void;
  expanded?: boolean;
  label?: string;
  showStatus?: boolean;
  showLabel?: boolean;
  /** Dimmed when the position is no longer current (out of contact). */
  opacity?: number;
}

export function GroupMarker({
  type,
  unitIds,
  status,
  x,
  y,
  onExpand,
  expanded = false,
  label,
  showStatus = true,
  showLabel = true,
  opacity,
}: GroupMarkerProps) {
  const count = unitIds.length;
  const suffix = count === 1 ? padded(unitIds[0]) : `×${count}`;
  const position = { left: x, top: y, width: MARKER.width, height: MARKER.height, opacity };
  const face = (
    <MarkerFace
      type={type}
      status={status}
      suffix={suffix}
      showStatus={showStatus}
      showLabel={showLabel}
    />
  );

  if (!onExpand) {
    return (
      <div className="absolute" style={position} aria-hidden={!label || undefined}>
        {label && <span className="sr-only">{label}</span>}
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="absolute cursor-pointer rounded-[6px]"
      style={position}
      aria-expanded={expanded}
      aria-label={
        label ??
        (count === 1
          ? `${unitIds[0]}. Open to move it.`
          : `${type} group, ${count} units. Open to move one.`)
      }
      onClick={(event) => {
        event.stopPropagation();
        onExpand();
      }}
    >
      {face}
    </button>
  );
}
