import { TASK_COPY } from '../data/assets';
import type { AssetType } from '../data/types';
import lockClosed from '../assets/icons/lock-closed.svg';

/**
 * One row of the tasking table: the units, what they are told to do, and the
 * one condition the operator cares about. Identical units collapse to a single
 * row with their range, which is what keeps 38 assets scannable.
 */
export function UnitRow({
  label,
  type,
  locked = false,
  dimmed = false,
  taskOverride,
  detailOverride,
  showLockSlot = true,
}: {
  label: string;
  type: AssetType;
  locked?: boolean;
  dimmed?: boolean;
  taskOverride?: string;
  detailOverride?: string;
  showLockSlot?: boolean;
}) {
  const copy = TASK_COPY[type];

  return (
    <div
      className={`flex h-[25px] w-full items-center gap-[12px] overflow-hidden border-t border-border-subtle py-[4px] pr-[5px] pl-[9px] ${
        dimmed ? 'opacity-70' : ''
      }`}
    >
      <p className="h-[16px] w-[77px] shrink-0 text-[12px] font-semibold text-text-primary">
        {label}
      </p>
      <p className="h-[21px] w-[96px] shrink-0 content-center text-[12px] text-text-primary">
        {taskOverride ?? copy.task}
      </p>
      <p className="h-[16px] min-w-px flex-1 text-[12px] text-text-secondary">
        {detailOverride ?? copy.detail}
      </p>
      {showLockSlot && (
        <div className="size-[16px] shrink-0 overflow-hidden">
          {locked && (
            <img
              alt="Locked"
              title="Locked: the autonomy will not move these units"
              src={lockClosed}
              width={14}
              height={14}
              className="m-px block"
            />
          )}
        </div>
      )}
    </div>
  );
}
