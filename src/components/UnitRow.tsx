import type { ReactNode } from 'react';
import { TASK_COPY } from '../data/assets';
import type { AssetType } from '../data/types';
import { RailPanel, RailRow } from './RailRow';

/**
 * One row of the tasking table: the units, what they are told to do, and the
 * one condition the operator cares about. Identical units collapse to a single
 * row with their range, which is what keeps 38 assets scannable.
 *
 * A row given `onToggle` is selectable (see `RailRow`): selecting a group row
 * opens it into a row per unit, because the keyboard path moves one unit at a
 * time and has to be able to name it; selecting a single unit opens `panel`,
 * its options, beneath it. A row without `onToggle` is plain text — the relay
 * and the unavailable units, which have nothing to choose.
 */
export function UnitRow({
  label,
  type,
  dimmed = false,
  taskOverride,
  detailOverride,
  detailFlagged = false,
  inset = false,
  rowId,
  selected = false,
  expanded = selected,
  expandable = true,
  onToggle,
  panel,
  panelLabel,
  bare = false,
}: {
  label: string;
  type: AssetType;
  dimmed?: boolean;
  taskOverride?: string;
  detailOverride?: string;
  /** Amber: this row's condition is the one that changed (Screen 3). */
  detailFlagged?: boolean;
  /** A row for a single unit inside an opened group. */
  inset?: boolean;
  rowId?: string;
  selected?: boolean;
  /** Whether `panel` is showing; a group row stays open while a unit in it is selected. */
  expanded?: boolean;
  /** False for a row that selects (and lights the map) but has no options. */
  expandable?: boolean;
  onToggle?: (rowElementId: string) => void;
  /** Shown beneath the row while it is selected. */
  panel?: ReactNode;
  panelLabel?: string;
  /** The panel holds more rows (a group's units) rather than options. */
  bare?: boolean;
}) {
  const copy = TASK_COPY[type];
  const task = taskOverride ?? copy.task;
  const detail = detailOverride ?? copy.detail;

  const cells = (
    <>
      <p
        className={`h-[16px] shrink-0 text-[12px] font-semibold whitespace-nowrap text-text-primary ${
          inset ? 'w-[65px]' : 'w-[77px]'
        }`}
      >
        {label}
      </p>
      <p className="h-[21px] w-[96px] shrink-0 content-center text-[12px] text-text-primary">
        {task}
      </p>
      <p
        className={`h-[16px] min-w-px flex-1 truncate text-[12px] ${
          detailFlagged ? 'text-status-needs-operator' : 'text-text-secondary'
        }`}
      >
        {detail}
      </p>
    </>
  );

  const padding = `py-[4px] pr-[5px] ${inset ? 'pl-[21px]' : 'pl-[9px]'}`;

  if (!onToggle || !rowId) {
    return (
      <div
        className={`flex h-[25px] w-full items-center gap-[12px] border-t border-border-subtle ${padding} ${
          dimmed ? 'opacity-70' : ''
        }`}
      >
        {cells}
      </div>
    );
  }

  return (
    <div className={`w-full border-t border-border-subtle ${dimmed ? 'opacity-70' : ''}`}>
      <RailRow
        rowId={rowId}
        label={`${label}, ${task}, ${detail}`}
        hideContent
        selected={selected}
        expanded={expanded}
        expandable={expandable}
        onToggle={onToggle}
        contentClassName={`h-[25px] gap-[12px] ${padding}`}
      >
        {cells}
      </RailRow>
      {expandable && expanded && panel && (
        <RailPanel rowId={rowId} label={panelLabel ?? label} bare={bare}>
          {panel}
        </RailPanel>
      )}
    </div>
  );
}
