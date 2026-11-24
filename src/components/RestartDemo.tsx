/**
 * Puts the demo back to its opening state.
 *
 * No Figma frame covers it. It is something the demo needs rather than
 * something the console would have, so it sits in the header's second row,
 * the console's one strip of app-level chrome, drawn as quietly as the
 * console allows: secondary text, no fill, no border. Flagged for design
 * review.
 */
export function RestartDemo({ onRestart }: { onRestart: () => void }) {
  return (
    <button
      type="button"
      onClick={onRestart}
      className="-ml-[8px] shrink-0 cursor-pointer rounded-[3px] px-[8px] py-[3px] text-[12px] whitespace-nowrap text-text-secondary hover:bg-text-primary/[0.07] hover:text-text-primary"
    >
      Restart demo
    </button>
  );
}
