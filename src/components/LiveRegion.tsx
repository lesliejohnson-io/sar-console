/**
 * Every move is spoken, whether it came from a drag or from the keyboard.
 * Visually hidden rather than `display: none`, which would stop screen
 * readers announcing it.
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="absolute h-px w-px overflow-hidden whitespace-nowrap"
      style={{ clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)' }}
    >
      {message}
    </div>
  );
}
