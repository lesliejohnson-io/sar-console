import { useCallback, useState } from 'react';
import { ATTENTION_STATES, attentionNoun, type Attention } from '../lib/attention';
import { StateBadge, STATE_NAME } from './StateBadge';
import type { UnitStatus } from '../data/types';

/*
 * The header's second row, right-aligned and pinned by its right edge: one
 * chip for each attention state that is present right now, and a chevron that
 * opens the full key. With nothing to report it is just the chevron, because
 * that absence is the signal; it never says "All nominal".
 *
 * It is status, not a legend, so it has no title. The chevron is the one
 * control and carries its name in a tooltip and its accessible label.
 *
 * **Flagged for design review:** no frame draws the strip, the chips or the
 * key's open state. They reuse the old legend's badges and copy.
 */

const KEY_ID = 'status-key';
const STORAGE_KEY = 'sar-console.status-key-open';

/** Remembered while the tab is open; falls back to memory if storage is blocked. */
let fallbackOpen = false;

function readOpen(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return fallbackOpen;
  }
}

export function useStatusKeyOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(readOpen);
  const toggle = useCallback(() => {
    setOpen((was) => {
      const next = !was;
      fallbackOpen = next;
      try {
        window.sessionStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* the in-memory copy still holds it */
      }
      return next;
    });
  }, []);
  return [open, toggle];
}

export function StatusStrip({
  attention,
  open,
  onToggle,
}: {
  attention: Attention;
  open: boolean;
  onToggle: () => void;
}) {
  const present = ATTENTION_STATES.filter((state) => attention[state] > 0);
  const toggleLabel = open ? 'Hide state key' : 'Show state key';

  return (
    <div className="flex shrink-0 items-center gap-[14px]">
      {present.length > 0 && (
        <ul aria-label="Needs attention" className="flex items-center gap-[14px]">
          {present.map((state) => (
            <li key={state} className="flex items-center gap-[6px] whitespace-nowrap">
              <StateBadge status={state} size={10} />
              <span className="text-[12px] text-text-secondary">
                {/* The words carry the state, so the glyph is never the only cue. */}
                <span className="font-mono font-medium text-text-primary">
                  {attention[state]}
                </span>
                {` ${attentionNoun(state, attention[state])}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={KEY_ID}
        aria-label={toggleLabel}
        title={toggleLabel}
        className="-mr-[6px] flex size-[22px] cursor-pointer items-center justify-center rounded-[3px] text-text-secondary hover:bg-text-primary/[0.07] hover:text-text-primary"
      >
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 3.5 L5 6.5 L8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

/** Every state the console draws, in the order the old legend listed them. */
const KEY_ITEMS: { status: UnitStatus; size: number }[] = [
  { status: 'ready', size: 10 },
  { status: 'autonomous', size: 8 },
  { status: 'needs-operator', size: 10 },
  { status: 'degraded', size: 10 },
  { status: 'out-of-contact', size: 10 },
  { status: 'unavailable', size: 10 },
];

/** The full key: every state, and the two rules that are not states. */
export function StatusKey() {
  return (
    <div
      id={KEY_ID}
      role="group"
      aria-label="State key"
      className="flex w-full flex-wrap items-center justify-end gap-x-[18px] gap-y-[6px] border-t border-border-subtle px-[12px] py-[7px]"
    >
      {KEY_ITEMS.map((item) => (
        <div key={item.status} className="flex shrink-0 items-center gap-[6px]">
          <StateBadge status={item.status} size={item.size} />
          <p className="text-[12px] whitespace-nowrap text-text-secondary">
            {STATE_NAME[item.status]}
          </p>
        </div>
      ))}

      <div className="flex shrink-0 items-center gap-[6px]">
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" strokeWidth="1.5" className="stroke-status-needs-operator" />
        </svg>
        <p className="text-[12px] whitespace-nowrap text-text-secondary">Ring = needs attention</p>
      </div>

      <div className="flex shrink-0 items-center gap-[6px]">
        <span aria-hidden className="opacity-40">
          <StateBadge status="ready" size={10} />
        </span>
        <p className="text-[12px] whitespace-nowrap text-text-secondary">
          Dimmed = position not current
        </p>
      </div>
    </div>
  );
}
