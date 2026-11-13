import { RANGE_RING, STAGE } from '../data/mapGeometry';

/**
 * How far a class can work from its launch site (frame 177:948).
 *
 * Dashed, not solid: a range is a limit, not a boundary, and the sector
 * outlines on this map are already solid. The label names the class, the
 * distance and the site, so the ring means something without the roster card
 * that opened it.
 *
 * Only the Hydras get a ring. A Roc's 400 km and a Kraken's 80 km both run
 * clear off the stage, so a circle would say nothing true about either; those
 * classes keep the label and drop the ring, and the label says the thing the
 * ring would have shown — that they reach the whole area. That copy has no
 * Figma frame and is flagged for design review.
 */
export function RangeRing({ label, ring }: { label: string; ring: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {ring && (
        <svg width={STAGE.width} height={STAGE.height} fill="none" className="absolute inset-0">
          <circle
            cx={RANGE_RING.cx}
            cy={RANGE_RING.cy}
            r={RANGE_RING.r}
            className="stroke-text-primary"
            strokeWidth={1.5}
            strokeDasharray="8 7"
            opacity={0.75}
          />
        </svg>
      )}
      <p
        className="absolute text-[11px] font-semibold tracking-[0.8px] whitespace-nowrap text-text-primary"
        style={{ left: RANGE_RING.label.x, top: RANGE_RING.label.y }}
      >
        {label}
      </p>
    </div>
  );
}
