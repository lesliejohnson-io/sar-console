import type { Priority } from '../data/types';

/**
 * Sector priority. HIGH draws in the primary text colour, the rest in
 * secondary, so priority never competes with the status colours.
 */
export function PriorityBadge({ priority }: { priority: Priority }) {
  const high = priority === 'HIGH';
  return (
    <div
      className={`flex w-[60px] shrink-0 items-start justify-center overflow-hidden rounded-[2px] border px-[6px] py-[2px] ${
        high ? 'border-text-primary' : 'border-text-secondary'
      }`}
    >
      <p
        className={`text-center text-[10px] font-semibold tracking-[0.6px] whitespace-nowrap ${
          high ? 'text-text-primary' : 'text-text-secondary'
        }`}
      >
        {priority}
      </p>
    </div>
  );
}
