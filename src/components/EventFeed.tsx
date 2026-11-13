import type { ReactNode } from 'react';
import { LIVE_FEED } from '../data/mapGeometry';
import { clock, type LogEntry } from '../store/useLiveStore';

/**
 * The event feed (frames 238:2144 and 289:2394): what the autonomy has done,
 * and what the operator has decided, newest first.
 *
 * It sits on the map rather than in the rail, and it is anchored by its bottom
 * edge: an open incident makes the card grow upward out of the feed instead of
 * pushing the feed down over the legend. Timestamps are mission clock, in the
 * mono face, so a column of times stays a column.
 */
export function EventFeed({
  entries,
  hidden,
  onToggle,
  incident,
}: {
  entries: LogEntry[];
  hidden: boolean;
  onToggle: () => void;
  /** The incident card, pinned above the feed while it is unresolved. */
  incident?: ReactNode;
}) {
  return (
    <section
      aria-label="Event feed"
      className="absolute flex flex-col items-start overflow-hidden rounded-[10px] border border-border-subtle bg-surface-panel pt-[10px] pr-[14px] pb-[8px] pl-[14px] leading-[normal] shadow-top-bar"
      style={{ left: LIVE_FEED.x, bottom: LIVE_FEED.bottom, width: LIVE_FEED.width }}
    >
      <div className={`flex w-full items-start overflow-hidden ${hidden ? '' : 'pb-[6px]'}`}>
        <h2 className="shrink-0 text-[12px] font-semibold whitespace-nowrap text-text-primary">
          EVENT FEED
        </h2>
        <div className="h-px min-w-px flex-1" />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!hidden}
          className="shrink-0 cursor-pointer text-[12px] font-semibold whitespace-nowrap text-text-secondary"
        >
          {/* "Hide" is frame copy; "Show" is proposed, flagged for review. */}
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>

      {!hidden && (
        <>
          {incident}
          {/*
            * The feed keeps the last few lines rather than everything: it is
            * anchored to the bottom of the map and grows upward, so an
            * unbounded list would climb over the mission itself. Four lines
            * on their own and two under an open incident card is what the two
            * frames draw. Flagged for design review — a feed that can be
            * scrolled back through is a thing this demo does not have.
            */}
          {entries.slice(0, incident ? 2 : 4).map((entry) => (
            <article
              key={`${entry.minute}-${entry.text}`}
              className="flex w-full items-start gap-[12px] overflow-hidden border-t border-border-subtle py-[5px]"
            >
              <p className="shrink-0 font-mono text-[12px] whitespace-nowrap text-text-secondary">
                {clock(entry.minute)}
              </p>
              {entry.flagged && (
                <p aria-hidden className="shrink-0 text-[11px] font-semibold text-status-needs-operator">
                  ◆
                </p>
              )}
              <p className="min-w-px flex-1 text-[12px] text-text-primary">{entry.text}</p>
            </article>
          ))}
          {entries.length === 0 && !incident && (
            /* No frame: the feed before anything has happened. Proposed copy. */
            <p className="w-full border-t border-border-subtle py-[5px] text-[12px] text-text-secondary">
              Nothing to report yet.
            </p>
          )}
        </>
      )}
    </section>
  );
}
