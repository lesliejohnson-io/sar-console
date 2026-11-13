import { useEffect, useState } from 'react';

/**
 * Whether the operator has asked their system for less movement.
 *
 * The console has one piece of motion worth skipping — the short pass between
 * proposing and reviewing a plan — and no blinking anywhere. Everything else
 * is handled by the blanket transition override in `tokens.css`; this hook
 * exists so a transition made of renders rather than CSS can respect the
 * setting too.
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
