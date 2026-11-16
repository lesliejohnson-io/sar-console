import type { CSSProperties } from 'react';
import { LEGEND } from '../data/mapGeometry';
import { StateBadge } from './StateBadge';
import type { UnitStatus } from '../data/types';

const ITEMS: { status: UnitStatus; label: string; size: number }[] = [
  { status: 'ready', label: 'Ready', size: 10 },
  { status: 'autonomous', label: 'Autonomous', size: 8 },
  { status: 'needs-operator', label: 'Needs operator', size: 10 },
  { status: 'degraded', label: 'Degraded', size: 10 },
  { status: 'out-of-contact', label: 'Out of contact', size: 10 },
  { status: 'unavailable', label: 'Unavailable', size: 10 },
];

const LEGEND_BOX: CSSProperties = {
  left: LEGEND.x,
  top: LEGEND.y,
  width: LEGEND.width,
  height: LEGEND.height,
};

export function Legend({ box = LEGEND_BOX }: { box?: CSSProperties }) {
  return (
    <div
      className="absolute flex items-center gap-[18px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-panel px-[12px] shadow-legend"
      style={box}
    >
      {ITEMS.map((item) => (
        <div key={item.status} className="flex shrink-0 items-center gap-[6px]">
          <StateBadge status={item.status} size={item.size} />
          <p className="whitespace-nowrap text-[12px] text-text-secondary">{item.label}</p>
        </div>
      ))}
      <p className="min-w-[291px] flex-1 text-[12px] text-text-secondary">
        Ring = needs attention · Dimmed = position not current
      </p>
    </div>
  );
}
