import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { LIVE_SHELL, MAP_VIEW, STAGE } from '../data/mapGeometry';

/** Below this the console is too cramped to read; show a note instead. */
const MIN_WIDTH = 1100;

/**
 * How far the map plane is scaled to fit its area.
 *
 * Anything that reads pointer movement needs this. dnd-kit reports a drag
 * delta in client pixels, but a marker's transform is applied inside the
 * scaled plane, so applying the delta raw moves the marker by delta x scale
 * and it slides out from under the cursor. Dividing by this puts it back.
 */
const StageScaleContext = createContext(1);

export const useStageScale = (): number => useContext(StageScaleContext);

/**
 * The console fills the window on every screen.
 *
 * The rail is laid out in real pixels at its frame width and runs the full
 * height of the window; the chrome over the map (header, feed) is laid
 * out in real pixels against the map area; and only the map plane scales. The
 * operator's eye learns one place for the header and the rail's action, and
 * nothing jumps when the plan launches.
 *
 * **Flagged for design review:** the frames are drawn at 1440 x 1035 and say
 * nothing about other window sizes. The rail's width, the header's offset and
 * the gutters are the frame's own; everything else is the map.
 */
export function ConsoleShell({
  map,
  chrome,
  rail,
}: {
  /** Drawn in the scaled 1440 x 1035 map plane. */
  map: ReactNode;
  /** Drawn over the map area in real pixels: the header and the feed. */
  chrome: ReactNode;
  rail: ReactNode;
}) {
  return (
    <DesktopOnly>
      <div className="flex h-screen w-screen overflow-hidden bg-surface-void">
        <main className="relative min-w-0 flex-1 overflow-hidden bg-map-backdrop">
          <MapPlane>{map}</MapPlane>
          {chrome}
        </main>

        <aside className="relative h-screen shrink-0" style={{ width: LIVE_SHELL.railWidth }}>
          {rail}
        </aside>
      </div>
    </DesktopOnly>
  );
}

/**
 * Below about 1100 px the console cannot be read; say so rather than squeeze
 * it.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (width < MIN_WIDTH) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-app px-8">
        {/* No Figma frame for this state — copy proposed, flagged for review. */}
        <p className="max-w-[28rem] text-center text-[14px] text-text-secondary">
          This console is built for a mission desk. Best viewed on a desktop display at least 1100
          px wide.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * The 1440 x 1035 map plane, scaled so it always runs the full height of the
 * window, from under the header to the bottom edge, and pinned to the left.
 *
 * Height wins over width. In a window wider than the map's shape, the room
 * left over is to the east, which is open water on this map, so the area beyond
 * the raster is filled in the ocean's own colour and reads as more sea rather
 * than a frame. In a window narrower than the map's shape, the east is
 * what gets cut off behind the rail. That can take Sector A and part of
 * Sector B off screen in a tall, narrow window; the operator chose that over
 * leaving empty sea under the map.
 *
 * **Flagged for design review:** the frames show the map at one size only.
 *
 * Everything inside keeps its stage coordinates, which is what lets the sector
 * outlines, the coverage grid and the unit positions go on being computed in
 * one fixed space while the window is any shape at all.
 */
function MapPlane({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!node) return;
    const measure = () => setArea({ width: node.clientWidth, height: node.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const scale = area ? area.height / MAP_VIEW.height : 1;

  return (
    <StageScaleContext.Provider value={scale}>
      <div ref={setNode} className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: STAGE.width,
            height: STAGE.height,
            transform: `scale(${scale})`,
          }}
        >
          {/* Until the first measurement the plane is hidden rather than wrong. */}
          <div style={{ visibility: area ? 'visible' : 'hidden' }}>{children}</div>
        </div>
      </div>
    </StageScaleContext.Provider>
  );
}

/**
 * Where a piece of chrome sits over the map area.
 *
 * The header's offset is fixed at every window size, which is the point of
 * laying this out in pixels rather than on the stage: the operator's eye
 * learns one place for the mission clock and keeps it.
 */
export const CHROME = {
  /** Stretched across the map area; its height is its content's. */
  header: {
    left: LIVE_SHELL.gutter,
    right: LIVE_SHELL.gutter,
    top: LIVE_SHELL.headerTop,
  },
  /** The header's height with the state key closed: its two rows. */
  headerHeight: LIVE_SHELL.headerHeight + LIVE_SHELL.stripHeight,
  /** Nothing runs along the foot of the map any more, so the feed sits on it. */
  feed: {
    right: LIVE_SHELL.gutter,
    bottom: LIVE_SHELL.headerTop,
    width: 459,
  },
} as const;
