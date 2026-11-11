import type { UnitStatus } from '../data/types';

/**
 * Status badge. Shape and colour are always paired, so a state reads without
 * colour: a filled circle is ready, a square is autonomous, a diamond needs
 * the operator, a triangle is degraded, a dashed ring is out of contact and a
 * hollow ring is unavailable.
 */

const SHAPES: Record<UnitStatus, { d: string; className: string; stroke?: number }> = {
  ready: {
    d: 'M5 9C7.20914 9 9 7.20914 9 5C9 2.79086 7.20914 1 5 1C2.79086 1 1 2.79086 1 5C1 7.20914 2.79086 9 5 9Z',
    className: 'fill-status-ready',
  },
  autonomous: {
    d: 'M10 0H0V10H10V0Z',
    className: 'fill-status-autonomous',
  },
  'needs-operator': {
    d: 'M5 0.5L9.5 5L5 9.5L0.5 5L5 0.5Z',
    className: 'fill-status-needs-operator',
  },
  degraded: {
    d: 'M5 1L9.5 9H0.5L5 1Z',
    className: 'fill-status-degraded',
  },
  'out-of-contact': {
    d: 'M8.65674 4.16517C8.71777 4.43364 8.75 4.71305 8.75 5C8.75 5.28695 8.71777 5.56636 8.65674 5.83483M8.17565 3.00465C7.87575 2.52835 7.47165 2.12425 6.99535 1.82435M5.83483 1.34326C5.56636 1.28223 5.28695 1.25 5 1.25C4.71305 1.25 4.43364 1.28223 4.16517 1.34326M3.00465 1.82435C2.52835 2.12425 2.12425 2.52835 1.82435 3.00465M1.34326 4.16517C1.28223 4.43364 1.25 4.71305 1.25 5C1.25 5.28695 1.28223 5.56636 1.34326 5.83483M1.82435 6.99535C2.12425 7.47165 2.52835 7.87575 3.00465 8.17565M4.16517 8.65674C4.43364 8.71777 4.71305 8.75 5 8.75C5.28695 8.75 5.56636 8.71777 5.83483 8.65674M6.99535 8.17565C7.47165 7.87575 7.87575 7.47165 8.17565 6.99535',
    className: 'stroke-status-out-of-contact',
    stroke: 1.5,
  },
  unavailable: {
    d: 'M8.75 5C8.75 7.07107 7.07107 8.75 5 8.75C2.92893 8.75 1.25 7.07107 1.25 5C1.25 2.92893 2.92893 1.25 5 1.25C7.07107 1.25 8.75 2.92893 8.75 5Z',
    className: 'stroke-status-unavailable',
    stroke: 1.5,
  },
};

export function StateBadge({ status, size = 10 }: { status: UnitStatus; size?: number }) {
  const shape = SHAPES[status];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <path
        d={shape.d}
        className={shape.className}
        strokeWidth={shape.stroke}
        fill={shape.stroke ? 'none' : undefined}
      />
    </svg>
  );
}
