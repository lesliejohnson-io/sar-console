import { useEffect, useState } from 'react';

/**
 * Whether the operator has asked their system for less movement.
 *
 * The console has two pieces of motion worth skipping — the short pass
 * between proposing and reviewing a plan, and the units flying their patterns
 * on the live map — and no blinking anywhere. Everything else is handled by
 * the blanket transition override in `tokens.css`; this hook exists because
 * motion made of renders rather than CSS has to be stopped at its source: a
 * unit on the live map is placed at the centre of its strip and left there,
 * rather than moved every minute with the transition switched off.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
