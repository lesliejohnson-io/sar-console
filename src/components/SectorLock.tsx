import lockClosed from '../assets/icons/lock-closed.svg';
import lockOpen from '../assets/icons/lock-open.svg';

/*
 * A locked sector is one the autonomy may not re-task when it re-proposes.
 * It is not a lock against the operator: dragging a unit in or out of a
 * locked sector still works, and simply makes the assignment theirs.
 *
 * The padlock is not a permanent fixture of the sector header. The header
 * shows it only when the sector *is* locked, so a locked sector can be picked
 * out at a glance and an unlocked one carries nothing. The control that
 * changes it lives in the sector's own panel, which opens when the sector is
 * selected.
 *
 * **Flagged for design review:** no frame draws the indicator, the toggle or
 * its copy. Both are proposed here.
 */

/** Persistent mark on a locked sector's header, selected or not. */
export function LockIndicator() {
  return (
    <span className="flex size-[16px] shrink-0 items-center justify-center" title="Locked">
      <img alt="" src={lockClosed} width={14} height={14} className="block" />
      <span className="sr-only">Locked</span>
    </span>
  );
}

/** The lock control, in a selected sector's panel. */
export function LockToggle({
  sectorId,
  locked,
  onToggle,
}: {
  sectorId: string;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-[8px]">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={locked}
        aria-describedby={`lock-help-${sectorId}`}
        className={`flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[3px] border px-[8px] py-[3px] text-[12px] font-semibold whitespace-nowrap ${
          locked
            ? 'border-status-operator-set text-status-operator-set'
            : 'border-text-secondary text-text-primary'
        }`}
      >
        <img alt="" src={locked ? lockClosed : lockOpen} width={14} height={14} className="block" />
        {locked ? 'Unlock sector' : 'Lock sector'}
      </button>
      <p id={`lock-help-${sectorId}`} className="min-w-px flex-1 text-[12px] text-text-secondary">
        {locked ? 'Locked: re-propose won’t change it' : 'Re-propose won’t change a locked sector'}
      </p>
    </div>
  );
}
