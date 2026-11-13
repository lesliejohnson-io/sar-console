import { UNAVAILABLE_TOOLTIP } from '../data/mapGeometry';

/**
 * What is wrong with an asset, and when it comes back (frame 177:1693).
 *
 * The roster says only "Maintenance · Unavailable", which is enough to plan
 * around but not enough to decide whether to wait. This is the rest of it,
 * and it opens from either the roster row or the map marker — the two places
 * the operator might be looking when the question occurs to them.
 */
export function UnavailableTooltip({
  title,
  detail,
  expectedBack,
  x,
  y,
}: {
  title: string;
  detail: string;
  expectedBack: string;
  x: number;
  y: number;
}) {
  return (
    <div
      role="tooltip"
      className="absolute z-30 flex flex-col items-start gap-[4px] overflow-hidden rounded-[6px] border border-border-subtle bg-surface-app px-[12px] py-[10px] shadow-panel"
      style={{ left: x, top: y, width: UNAVAILABLE_TOOLTIP.width }}
    >
      <p className="text-[12px] font-semibold whitespace-nowrap text-text-primary">{title}</p>
      <p className="text-[12px] text-text-secondary">{detail}</p>
      <p className="text-[12px] whitespace-nowrap text-text-secondary">{expectedBack}</p>
    </div>
  );
}
