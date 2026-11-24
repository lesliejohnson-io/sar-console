import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import type { RailSelection } from '../store/usePlanStore';

/**
 * One selectable row of the rail: a sector header, a group of units, or a
 * single unit. Every level uses the same gesture — click the row (or focus it
 * and press Enter or Space) to select it, which also expands its options
 * directly beneath it; click again, press Escape, or select another row to
 * collapse it.
 *
 * The whole row is the hit target. It is drawn as a button laid *under* the
 * row's content rather than wrapped around it, so the content can still hold
 * its own controls (the "Stage sector" button) and its own heading without
 * nesting one interactive element inside another. The content ignores the
 * pointer, so a click anywhere on the row lands on that button.
 *
 * Hover only lightens the row; nothing is revealed by hover alone.
 *
 * **Flagged for design review:** no frame draws the chevron, the hover and
 * selected fills, or the expanded panels. They are built from the rail's own
 * tokens.
 */
export function RailRow({
  rowId,
  label,
  labelledBy,
  selected,
  expanded = selected,
  expandable = true,
  onToggle,
  children,
  className = '',
  contentClassName = '',
  hideContent = false,
}: {
  /** Stable DOM id stem: the row is `${rowId}-row`, its panel `${rowId}-panel`. */
  rowId: string;
  /** The row's accessible name, when no visible element names it. */
  label?: string;
  /** An element that names the row, such as the sector's heading. */
  labelledBy?: string;
  selected: boolean;
  /**
   * Whether its options are showing. Usually the same as `selected`; a group
   * row stays open while one of its own units is the selection.
   */
  expanded?: boolean;
  /** False for a row that can be selected but has no options to show. */
  expandable?: boolean;
  onToggle: (rowElementId: string) => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * Hide the visible content from assistive technology, when `label` already
   * says everything it does and it holds nothing interactive.
   */
  hideContent?: boolean;
}) {
  const buttonId = `${rowId}-row`;

  return (
    <div className={`relative w-full ${className}`}>
      <button
        type="button"
        id={buttonId}
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy}
        aria-expanded={expandable ? expanded : undefined}
        aria-controls={expandable && expanded ? `${rowId}-panel` : undefined}
        aria-pressed={expandable ? undefined : selected}
        onClick={() => onToggle(buttonId)}
        className={`absolute inset-0 cursor-pointer rounded-[3px] focus-visible:outline-offset-[-2px] ${
          selected ? 'bg-text-primary/[0.07]' : 'hover:bg-text-primary/[0.05]'
        }`}
      />
      <div
        aria-hidden={hideContent || undefined}
        className={`pointer-events-none relative flex w-full items-center ${contentClassName}`}
      >
        {children}
        {expandable && <Chevron expanded={expanded} />}
      </div>
    </div>
  );
}

/** Right when collapsed, down when expanded. Sits where "…" used to. */
export function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={`ml-[4px] shrink-0 text-text-secondary transition-transform ${
        expanded ? 'rotate-90' : ''
      }`}
    >
      <path
        d="M3.5 2 L6.5 5 L3.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The options a selected row reveals, directly beneath it. */
export function RailPanel({
  rowId,
  label,
  bare = false,
  children,
}: {
  rowId: string;
  label: string;
  /** No inset or fill: the panel holds more rows rather than options. */
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={`${rowId}-panel`}
      role="group"
      aria-label={label}
      className={
        bare
          ? 'w-full'
          : 'w-full border-t border-border-subtle bg-surface-panel/60 px-[9px] py-[6px]'
      }
    >
      {children}
    </div>
  );
}

/**
 * Selection for a whole rail: one row expanded at a time, Escape collapses it,
 * and the row the operator acted on stays where it was on screen.
 *
 * Expanding a row pushes what is below it down, which is fine. What is not
 * fine is the row itself moving — which it does whenever selecting it
 * collapses a row *above* it. So the row's position is noted before the
 * change and the rail's scroll is corrected after it, in the same frame, by
 * however far the row drifted.
 *
 * Known limit, accepted: the correction can only use scroll that exists. When
 * the rail is not scrolled (or its content fits without scrolling), a panel
 * closing above the clicked row still moves that row up by the panel's
 * height.
 */
export function useRailSelection<T extends HTMLElement>(
  scrollRef: RefObject<T | null>,
  selection: RailSelection | null,
  onSelect: (next: RailSelection | null) => void,
) {
  const anchor = useRef<{ id: string; top: number } | null>(null);

  useLayoutEffect(() => {
    const pending = anchor.current;
    anchor.current = null;
    if (!pending) return;

    const row = document.getElementById(pending.id);
    const scroller = scrollRef.current;
    if (!row || !scroller) return;

    const drift = row.getBoundingClientRect().top - pending.top;
    if (drift !== 0) scroller.scrollTop += drift;
  });

  useEffect(() => {
    if (!selection) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, onSelect]);

  return useCallback(
    (next: RailSelection, rowElementId: string) => {
      const row = document.getElementById(rowElementId);
      if (row) anchor.current = { id: rowElementId, top: row.getBoundingClientRect().top };
      // Selecting the selected row again collapses it.
      onSelect(selection?.key === next.key ? null : next);
    },
    [selection, onSelect],
  );
}
