import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SECTORS, SECTOR_IDS } from '../data/sectors';
import { REACH_WARNING_GLYPH, canOperatorMove } from '../data/reach';
import { coverageAfterMove, type Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';

/**
 * The keyboard path to the same move the map does by drag.
 *
 * No Figma frame covers this, so it is built from the rail's own parts: a
 * `surface/card` popover on `border/subtle`, one item per sector, each showing
 * the coverage that sector would have **after** the move. The number comes
 * from `coverageAfterMove`, which is also what the drag preview reads, so the
 * menu can never promise something the drop does not deliver.
 *
 * A sector the unit may not be sent to stays in the list and says why, rather
 * than disappearing: the operator should be able to see that they considered
 * it and why it is out.
 */
export function MoveToSectorMenu({
  unitId,
  current,
  assignments,
  onMove,
}: {
  unitId: string;
  current: SectorId | null;
  assignments: Assignments;
  onMove: (unitId: string, toSector: SectorId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  /*
   * The rail clips its content, so a menu opened on one of the last rows
   * would have its lowest sectors cut off — exactly the rows the operator is
   * most likely to be moving, since Sector D is the one that needs help. Open
   * upward instead whenever there is not room below.
   */
  useLayoutEffect(() => {
    if (!open || !menu.current) return;

    setDropUp(false);
    const rect = menu.current.getBoundingClientRect();
    const clip = clippingAncestor(menu.current);
    const limit = clip ? clip.getBoundingClientRect().bottom : window.innerHeight;
    if (rect.bottom > limit) setDropUp(true);
  }, [open]);

  // First item takes focus when the menu opens, so the keyboard path never
  // needs the pointer.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();

    const items = Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : items[(index - 1 + items.length) % items.length];
    next?.focus();
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Move ${unitId} to another sector`}
        onClick={() => setOpen((was) => !was)}
        className="flex h-[16px] w-[18px] cursor-pointer items-center justify-center rounded-[3px] text-[12px] leading-none text-text-secondary hover:bg-surface-app hover:text-text-primary"
      >
        ⋯
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={`Move ${unitId} to sector`}
          onKeyDown={onKeyDown}
          className={`absolute right-0 z-40 w-[268px] rounded-[6px] border border-border-subtle bg-surface-card py-[4px] shadow-panel ${
            dropUp ? 'bottom-[20px]' : 'top-[20px]'
          }`}
        >
          <p className="px-[10px] py-[4px] text-[11px] tracking-[0.4px] text-text-secondary uppercase">
            Move {unitId} to
          </p>

          {SECTOR_IDS.map((id) => {
            const sector = SECTORS.find((candidate) => candidate.id === id)!;
            const verdict = canOperatorMove(unitId, id);

            if (id === current) {
              return (
                <div
                  key={id}
                  role="menuitem"
                  aria-disabled
                  className="flex items-center gap-[8px] px-[10px] py-[5px] text-[12px] text-text-secondary"
                >
                  <span className="min-w-px flex-1 truncate">{sector.label}</span>
                  <span className="shrink-0">Current</span>
                </div>
              );
            }

            if (!verdict.ok) {
              return (
                <div
                  key={id}
                  role="menuitem"
                  aria-disabled
                  className="flex flex-col items-start px-[10px] py-[5px] text-[12px]"
                >
                  <span className="w-full truncate text-text-secondary">{sector.label}</span>
                  <span className="flex items-start gap-[6px] text-[11px] text-status-needs-operator">
                    <span aria-hidden>{REACH_WARNING_GLYPH}</span>
                    <span>{verdict.reason}</span>
                  </span>
                </div>
              );
            }

            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onMove(unitId, id);
                }}
                className="flex w-full cursor-pointer flex-col items-start px-[10px] py-[5px] text-left text-[12px] text-text-primary hover:bg-surface-app"
              >
                <span className="flex w-full items-center gap-[8px]">
                  <span className="min-w-px flex-1 truncate">{sector.label}</span>
                  <span className="shrink-0 font-mono text-text-secondary">
                    {coverageAfterMove(assignments, unitId, id)}%
                  </span>
                </span>
                {verdict.caution && (
                  <span className="flex items-start gap-[6px] text-[11px] text-status-needs-operator">
                    <span aria-hidden>{REACH_WARNING_GLYPH}</span>
                    <span>{verdict.caution}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The nearest ancestor that would cut the menu off. */
function clippingAncestor(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'hidden' || overflow === 'auto' || overflow === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}
