import type { ReactNode } from 'react';
import { TASK_COPY } from '../data/assets';
import type { AssetType } from '../data/types';
import lockClosed from '../assets/icons/lock-closed.svg';

/**
 * One row of the tasking table: the units, what they are told to do, and the
 * one condition the operator cares about. Identical units collapse to a single
 * row with their range, which is what keeps 38 assets scannable.
 *
 * A row standing for more than one unit opens into a row per unit, because the
 * keyboard path moves one unit at a time and has to be able to name it.
 */
export function UnitRow({
  label,
  type,
  locked = false,
  dimmed = false,
  taskOverride,
  detailOverride,
  detailFlagged = false,
  showLockSlot = true,
  expandable = false,
  expanded = false,
  onToggleExpand,
  trailing,
  inset = false,
}: {
  label: string;
  type: AssetType;
  locked?: boolean;
  dimmed?: boolean;
  taskOverride?: string;
  detailOverride?: string;
  /** Amber: this row's condition is the one that changed (Screen 3). */
  detailFlagged?: boolean;
  showLockSlot?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Sits before the lock slot; the "Move to sector…" trigger goes here. */
  trailing?: ReactNode;
  /** A row for a single unit inside an opened group. */
  inset?: boolean;
}) {
  const copy = TASK_COPY[type];

  return (
    <div
      className={`flex h-[25px] w-full items-center gap-[12px] overflow-visible border-t border-border-subtle py-[4px] pr-[5px] ${
        inset ? 'pl-[21px]' : 'pl-[9px]'
      } ${dimmed ? 'opacity-70' : ''}`}
    >
      {expandable ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggleExpand}
          className="relative h-[16px] w-[77px] shrink-0 cursor-pointer rounded-[2px] text-left text-[12px] font-semibold whitespace-nowrap text-text-primary"
        >
          {/*
            * The disclosure marker sits in the row's own left padding, so the
            * unit range keeps the full 77 px the table column gives it and the
            * task column stays where Figma puts it.
            */}
          <span
            aria-hidden
            className="absolute top-[1px] -left-[7px] text-[9px] text-text-secondary"
          >
            {expanded ? '▾' : '▸'}
          </span>
          {label}
        </button>
      ) : (
        <p
          className={`h-[16px] shrink-0 text-[12px] font-semibold text-text-primary ${
            inset ? 'w-[65px]' : 'w-[77px]'
          }`}
        >
          {label}
        </p>
      )}

      <p className="h-[21px] w-[96px] shrink-0 content-center text-[12px] text-text-primary">
        {taskOverride ?? copy.task}
      </p>
      <p
        className={`h-[16px] min-w-px flex-1 truncate text-[12px] ${
          detailFlagged ? 'text-status-needs-operator' : 'text-text-secondary'
        }`}
      >
        {detailOverride ?? copy.detail}
      </p>

      {trailing}

      {/*
        * The lock slot is dropped on a row that carries a move control and is
        * not locked, so the condition column keeps the width it has in Figma
        * rather than losing the end of "Until battery 50%".
        */}
      {showLockSlot && (!trailing || locked) && (
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
