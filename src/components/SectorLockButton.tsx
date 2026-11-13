import lockClosed from '../assets/icons/lock-closed.svg';
import lockOpen from '../assets/icons/lock-open.svg';

/**
 * The padlock in the corner of a sector card.
 *
 * `spec.md` makes this a real control: a locked sector is one the autonomy may
 * not re-task when it re-proposes. It is not a lock against the operator —
 * dragging a locked unit still works, and simply makes the assignment theirs.
 *
 * **Flagged for design review:** the frames draw the open padlock only, so the
 * locked state is proposed here. It follows the console's colour rule — a lock
 * is a thing the operator chose, so it is drawn in `status/operator-set` — and
 * carries the closed padlock from the unit rows, so the shape changes as well
 * as the colour.
 */
export function SectorLockButton({
  sectorLabel,
  locked,
  onToggle,
}: {
  sectorLabel: string;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={locked}
      aria-label={`Lock ${sectorLabel} against autonomy re-tasking`}
      title={
        locked
          ? 'Locked: the autonomy will not re-task this sector'
          : 'Unlocked: the autonomy may re-task this sector'
      }
      className={`flex size-[26px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[3px] border ${
        locked ? 'border-status-operator-set' : 'border-text-secondary'
      }`}
    >
      <img
        alt=""
        src={locked ? lockClosed : lockOpen}
        width={16}
        height={16}
        className="block"
      />
    </button>
  );
}
