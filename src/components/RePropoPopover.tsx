import { useEffect, useRef, useState } from 'react';
import { SECTORS_BY_ID } from '../data/sectors';
import { formatUnitRange } from '../lib/units';
import { rePropoPreview, type Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';
import lockClosed from '../assets/icons/lock-closed.svg';

/** Where the popover hangs under the Re-propose button, from frame 160:694. */
export const POPOVER = { x: 1098, y: 66, width: 320 };

export interface RePropoPopoverProps {
  assignments: Assignments;
  lockedUnits: string[];
  /** The sector the "<Sector> only" scope would apply to, if one is selected. */
  selectedSector: SectorId | null;
  onConfirm: (scope: SectorId | 'all') => void;
  onCancel: () => void;
}

/**
 * Asking the autonomy for the plan again (frame 160:694).
 *
 * The popover exists to answer one question before the operator commits:
 * what of mine survives this? So it leads with what it keeps — every locked
 * unit and every unit the operator placed themselves — and only then says how
 * much it may move. Both figures come from the same preview the action is
 * built on, so neither can drift from what pressing the button actually does.
 */
export function RePropoPopover({
  assignments,
  lockedUnits,
  selectedSector,
  onConfirm,
  onCancel,
}: RePropoPopoverProps) {
  const [scope, setScope] = useState<SectorId | 'all'>('all');
  const ref = useRef<HTMLDivElement>(null);

  /*
   * The popover is dismissible: Escape, or a click anywhere outside it. The
   * operator is being asked to hand the plan back to the autonomy, and a
   * question like that must always be answerable with "no, thank you".
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onCancel();
    };

    window.addEventListener('keydown', onKeyDown);
    // Deferred so the click that opened the popover does not close it again.
    const timer = window.setTimeout(
      () => window.addEventListener('mousedown', onPointerDown),
      0,
    );
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
      window.clearTimeout(timer);
    };
  }, [onCancel]);

  // Focus moves into the popover, so the keyboard is where the eye is.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const preview = rePropoPreview(assignments, lockedUnits, scope);
  const span =
    preview.sectors.length > 1
      ? `Sectors ${preview.sectors[0]}–${preview.sectors[preview.sectors.length - 1]}`
      : `Sector ${preview.sectors[0]}`;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby="re-propose-title"
      tabIndex={-1}
      className="absolute flex flex-col items-start gap-[14px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-app p-[16px] shadow-panel"
      style={{ left: POPOVER.x, top: POPOVER.y, width: POPOVER.width }}
    >
      <h3
        id="re-propose-title"
        className="shrink-0 text-[14px] font-semibold whitespace-nowrap text-text-primary"
      >
        Re-propose plan
      </h3>

      <div
        role="radiogroup"
        aria-label="How much of the plan to re-propose"
        className="flex w-full shrink-0 items-start overflow-hidden rounded-[6px] border border-border-subtle p-[2px]"
      >
        <ScopeOption
          label="All sectors"
          selected={scope === 'all'}
          onSelect={() => setScope('all')}
        />
        {selectedSector && (
          <ScopeOption
            label={`Sector ${selectedSector} only`}
            selected={scope === selectedSector}
            onSelect={() => setScope(selectedSector)}
          />
        )}
      </div>

      <div className="flex w-full shrink-0 flex-col items-start gap-[6px] overflow-hidden">
        <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">Keeps</p>
        {preview.keeps.length === 0 ? (
          /* No frame draws an empty "Keeps" — proposed, flagged for review. */
          <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
            Nothing: the autonomy may move every unit in scope.
          </p>
        ) : (
          preview.keeps.map((group) => (
            <div
              key={group.reason}
              className="flex shrink-0 items-center gap-[8px] overflow-hidden"
            >
              {group.reason === 'locked' ? (
                <img alt="" src={lockClosed} width={12} height={12} className="block shrink-0" />
              ) : (
                /* The operator's own teal bar, as it appears on a tasking row. */
                <span aria-hidden className="relative block size-[12px] shrink-0">
                  <span className="absolute top-0 left-[4.5px] block h-[12px] w-[3px] bg-status-operator-set" />
                </span>
              )}
              <p className="shrink-0 text-[12px] font-semibold whitespace-nowrap text-text-primary">
                {formatUnitRange(group.unitIds)}
              </p>
              <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
                {group.reason === 'locked' ? 'locked' : 'set by operator'}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="flex w-full shrink-0 flex-col items-start gap-[6px] overflow-hidden text-[12px] whitespace-nowrap">
        <p className="shrink-0 text-text-secondary">May change</p>
        <p className="shrink-0 text-text-primary">
          {preview.mayChange} {preview.mayChange === 1 ? 'unit' : 'units'} across {span}
        </p>
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-[8px] overflow-hidden">
        <button
          type="button"
          onClick={onCancel}
          className="flex shrink-0 cursor-pointer items-start overflow-hidden px-[12px] py-[7px] text-[12px] font-semibold whitespace-nowrap text-text-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(scope)}
          className="flex shrink-0 cursor-pointer items-start overflow-hidden rounded-[4px] bg-interaction-primary px-[14px] py-[7px] text-[12px] font-semibold whitespace-nowrap text-text-on-interaction"
        >
          Re-propose
        </button>
      </div>
    </div>
  );
}

/** One half of the scope control: a radio drawn as a segment. */
function ScopeOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-w-px flex-1 cursor-pointer items-start justify-center overflow-hidden rounded-[4px] py-[6px] text-[12px] whitespace-nowrap ${
        selected
          ? 'bg-surface-card font-semibold text-text-primary'
          : 'text-text-secondary'
      }`}
    >
      {label}
    </button>
  );
}

/** The sector's full label, for announcements. */
export const scopeLabel = (scope: SectorId | 'all'): string =>
  scope === 'all' ? 'all sectors' : SECTORS_BY_ID[scope].label;
