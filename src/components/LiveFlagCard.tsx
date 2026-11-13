import type { ReactNode } from 'react';

/**
 * The amber card inside a sector's rail card: something here needs the
 * operator.
 *
 * Two things wear this shape on Screen 3 — a sector that has fallen behind its
 * plan (frame 238:2144) and a sector holding an open incident (frame
 * 289:2394) — and they wear it identically on purpose: whatever the cause, the
 * operator reads a title, what it costs, and what they can do about it, in the
 * same place in the card. Amber is the console's one mark for "you decide".
 */
export function LiveFlagCard({
  title,
  body,
  primary,
  secondary,
}: {
  title: ReactNode;
  body: ReactNode;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex w-full flex-col items-start gap-[6px] overflow-hidden border-l-2 border-status-needs-operator bg-feedback-info/10 py-[6px] pr-[8px] pl-[10px]">
      <div className="flex w-full items-start gap-[4px] overflow-hidden text-[12px] font-semibold whitespace-nowrap">
        <p aria-hidden className="shrink-0 text-status-needs-operator">
          ◆
        </p>
        <p className="shrink-0 text-text-primary">{title}</p>
      </div>

      <p className="w-full text-[12px] text-text-secondary">{body}</p>

      <div className="flex items-center gap-[14px] overflow-hidden pt-[2px]">
        <button
          type="button"
          onClick={primary.onClick}
          className="flex shrink-0 cursor-pointer items-start overflow-hidden rounded-[3px] border border-interaction-primary px-[10px] py-[4px] text-[12px] font-semibold whitespace-nowrap text-interaction-primary"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="shrink-0 cursor-pointer text-[12px] font-semibold whitespace-nowrap text-text-secondary"
        >
          {secondary.label}
        </button>
      </div>
    </div>
  );
}
