import { MARKER } from '../data/mapGeometry';
import { MINUTE_MS } from '../data/live';
import { badgeAt, BADGE_SIZE, glyphBox, LABEL_HEIGHT, labelTop } from '../lib/markers';
import { unitNumber } from '../lib/units';
import { StateBadge, STATE_NAME } from './StateBadge';
import { formatUnitRange } from '../lib/units';
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
 * The 52 x 44 box is the hit area. The glyph drawn inside it is much smaller —
 * its size is the one `MARKER.icon` token, laid out by `lib/markers` — so a
 * drone reads smaller than a cell of the search grid without becoming harder
 * to click or drag.
 *
 * Clicking a group of more than one fans it out into its individual units, so
 * the operator can take hold of one. The face itself is shared with
 * `UnitMarker`, which is what a fanned-out unit is.
 */

const GLYPH_SRC: Record<AssetType, string> = {
  ROC: glyphRoc,
  GRF: glyphGrf,
  HYD: glyphHyd,
  KRK: glyphKrk,
};

/**
 * The glyph, badge and pill. Laid out in the marker's own 52 x 44 box.
 *
 * The glyph turns to the unit's heading and nothing else does. Every symbol is
 * drawn nose-up, so the bearing is the rotation; the badge keeps its corner
 * and the pill stays level, because a label that leans with the aircraft is a
 * label the operator has to tilt their head to read.
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
  bearing = 0,
  turning = false,
}: {
  type: AssetType;
  status: UnitStatus;
  suffix: string;
  showStatus?: boolean;
  showLabel?: boolean;
  /**
   * Which way the unit is pointing: degrees clockwise from north, from the
   * telemetry it reports. Zero — a unit that is not flying anywhere, which is
   * every unit before launch — leaves the glyph as Figma drew it.
   */
  bearing?: number;
  /** True for a unit in flight, so a change of heading reads as a turn. */
  turning?: boolean;
}) {
  const glyph = glyphBox(type);
  const badge = badgeAt(type);

  return (
    <>
      <img
        alt=""
        src={GLYPH_SRC[type]}
        width={glyph.width}
        height={glyph.height}
        className={`absolute max-w-none ${type === 'KRK' ? 'drop-shadow-marker' : ''}`}
        style={{
          left: glyph.left,
          top: glyph.top,
          transform: bearing === 0 ? undefined : `rotate(${bearing}deg)`,
          transition: turning ? `transform ${MINUTE_MS}ms linear` : undefined,
        }}
      />
      {showStatus && (
        <div className="absolute" style={{ left: badge.left, top: badge.top }}>
          <StateBadge status={status} size={BADGE_SIZE} />
        </div>
      )}
      {showLabel && (
        <div
          className="absolute inset-x-0 flex items-center gap-[5px] rounded-[99px] bg-map-label-pill px-[5px] py-px font-mono text-[9px] whitespace-nowrap text-text-primary"
          style={{ top: labelTop(), height: LABEL_HEIGHT }}
        >
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
  /**
   * Which way the unit is pointing, in degrees clockwise from north. Taken
   * from the track or the reported telemetry by the caller, never worked out
   * here from where the marker used to be.
   */
  bearing?: number;
  /**
   * True for a unit that is flying a pattern. The clock moves a marker once
   * per mission minute; gliding over that same minute turns a row of jumps
   * back into flight. Reduced motion switches this off at the call site, and
   * the global `prefers-reduced-motion` rule cancels the transition anyway.
   */
  moving?: boolean;
  /**
   * The hover tooltip. It names the state in words, so a glyph the operator
   * does not know can be read at the marker without opening the key. Defaults
   * to the units and their state.
   */
  title?: string;
}

/** "HYD-21–24 · Ready": the units, then their state in words. */
export const markerTitle = (unitIds: readonly string[], status: UnitStatus): string =>
  `${formatUnitRange(unitIds)} · ${STATE_NAME[status]}`;

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
  bearing = 0,
  moving = false,
  title,
}: GroupMarkerProps) {
  const tooltip = title ?? markerTitle(unitIds, status);
  const count = unitIds.length;
  const suffix = count === 1 ? padded(unitIds[0]) : `×${count}`;
  const position = {
    left: x,
    top: y,
    width: MARKER.width,
    height: MARKER.height,
    opacity,
    transition: moving ? `left ${MINUTE_MS}ms linear, top ${MINUTE_MS}ms linear` : undefined,
  };
  const face = (
    <MarkerFace
      type={type}
      status={status}
      suffix={suffix}
      showStatus={showStatus}
      showLabel={showLabel}
      bearing={bearing}
      turning={moving}
    />
  );

  if (!onExpand) {
    return (
      <div
        className="absolute"
        style={position}
        title={tooltip}
        aria-hidden={!label || undefined}
      >
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
      title={tooltip}
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
