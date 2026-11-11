import { useEffect, useState, type ReactNode } from 'react';
import { STAGE } from '../data/mapGeometry';

/** Below this the console is too cramped to read; show a note instead. */
const MIN_WIDTH = 1100;

/**
 * The console is a fixed 1440 x 1035 stage, scaled to fit the viewport. Every
 * position in the design is an absolute coordinate in that space, so the
 * layout never reflows and always matches the Figma frame.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (viewport.width < MIN_WIDTH) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-app px-8">
        {/* No Figma frame for this state — copy proposed, flagged for review. */}
        <p className="max-w-[28rem] text-center text-[14px] text-text-secondary">
          This console is built for a mission desk. Best viewed on a desktop display at least
          1100 px wide.
        </p>
      </div>
    );
  }

  const scale = Math.min(viewport.width / STAGE.width, viewport.height / STAGE.height);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-surface-app">
      <div
        className="relative shrink-0 origin-center"
        style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
