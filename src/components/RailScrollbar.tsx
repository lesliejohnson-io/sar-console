import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

const EMPTY: ScrollMetrics = { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };

/**
 * Measures a scrolling element so something else can draw its scrollbar.
 *
 * Re-read on every render as well as on scroll, because the rail's content
 * changes height on its own — a sector that needs the operator grows a card,
 * and the bar has to know. The state is only replaced when a number actually
 * changes, so reading after every render cannot loop.
 */
export function useRailScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY);

  const read = () => {
    const node = ref.current;
    if (!node) return;
    setMetrics((was) =>
      was.scrollTop === node.scrollTop &&
      was.scrollHeight === node.scrollHeight &&
      was.clientHeight === node.clientHeight
        ? was
        : {
            scrollTop: node.scrollTop,
            scrollHeight: node.scrollHeight,
            clientHeight: node.clientHeight,
          },
    );
  };

  useLayoutEffect(read);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.addEventListener('scroll', read, { passive: true });
    return () => node.removeEventListener('scroll', read);
  }, []);

  return { ref, metrics };
}

/**
 * The rail's scrollbar, as the frames draw it: a 4 px track in
 * `text/secondary` at low opacity with a brighter thumb.
 *
 * The native bar is hidden and this is drawn in its place, because the frames
 * draw it this way and a platform scrollbar in the middle of the console reads
 * as a browser, not an instrument. Drawing it does mean it has to be told the
 * truth — the thumb is sized and placed from the real scroll position, so a
 * rail with an open incident card in it shows that there is more below.
 *
 * It is `aria-hidden`: the element it describes is the scrolling region
 * itself, which assistive technology already reports and can already scroll.
 */
export function RailScrollbar({
  metrics,
  style,
}: {
  metrics: ScrollMetrics;
  /** Where the track sits, in stage coordinates. */
  style: CSSProperties;
}) {
  const { scrollTop, scrollHeight, clientHeight } = metrics;

  // A rail that fits has no bar at all, rather than a thumb filling the track.
  if (clientHeight === 0 || scrollHeight <= clientHeight + 1) return null;

  const trackHeight = Number(style.height ?? 0);
  const thumbHeight = Math.max(24, trackHeight * (clientHeight / scrollHeight));
  const offset =
    (trackHeight - thumbHeight) * (scrollTop / (scrollHeight - clientHeight));

  return (
    <div aria-hidden className="absolute w-[4px]" style={style}>
      <div className="absolute inset-0 rounded-[2px] bg-text-secondary opacity-15" />
      <div
        className="absolute left-0 w-[4px] rounded-[2px] bg-text-secondary opacity-60"
        style={{ top: offset, height: thumbHeight }}
      />
    </div>
  );
}
