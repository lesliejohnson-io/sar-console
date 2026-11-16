import type { CSSProperties } from 'react';

/**
 * Puts the demo back to its opening state.
 *
 * No Figma frame covers it — it is a thing the demo needs rather than a thing
 * the console would have — so it is drawn as quietly as the console allows:
 * secondary text, no fill, no border, out of the way at the foot of the map.
 * Flagged for design review.
 */
export function RestartDemo({
  onRestart,
  box = { bottom: 58, left: 21 },
}: {
  onRestart: () => void;
  /** Where it sits; the live shell places it in the map area's own corner. */
  box?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onRestart}
      style={box}
      className="absolute cursor-pointer rounded-[3px] px-[8px] py-[4px] text-[12px] text-text-secondary hover:bg-surface-panel hover:text-text-primary"
    >
      Restart demo
    </button>
  );
}
