import { useEffect, useState, type ReactNode } from 'react';
import { LIVE_SHELL, STAGE } from '../data/mapGeometry';

/**
 * The live screen's frame: a map that fills the window, and a rail beside it.
 *
 * Screens 1 and 2 sit on `Stage`, which scales the whole console as one
 * picture — right for a plan being reviewed, where the frame is the artefact.
 * A mission being watched wants the opposite. The rail has to be reachable and
 * the header has to be where the operator's eye already is, at whatever size
 * the console is open. So here the chrome is laid out in real pixels against
 * the window, and only the map plane scales.
 *
 * The plane is scaled to *cover* the map area rather than fit inside it, so
 * there is never a letterbox beside the mission; what falls outside is clipped
 * the way any map is clipped by its window.
 *
 * **Flagged for design review:** the frames are drawn at 1440 x 1035 and say
 * nothing about other window sizes. The rail's width, the header's offset and
 * the gutters are the frame's own; everything else is the map.
 */
export function LiveShell({
  map,
  chrome,
  rail,
}: {
  /** Drawn in the scaled 1440 x 1035 map plane. */
  map: ReactNode;
  /** Drawn over the map area in real pixels: header, feed, legend. */
  chrome: ReactNode;
  rail: ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-void">
      <main className="relative min-w-0 flex-1 overflow-hidden bg-map-backdrop">
        <MapPlane>{map}</MapPlane>
        {chrome}
      </main>

      <aside
        className="relative h-screen shrink-0"
        style={{ width: LIVE_SHELL.railWidth }}
      >
        {rail}
      </aside>
    </div>
  );
}

/**
 * The 1440 x 1035 map plane, scaled to cover its parent and centred.
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
    const measure = () =>
      setArea({ width: node.clientWidth, height: node.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const scale = area
    ? Math.max(area.width / STAGE.width, area.height / STAGE.height)
    : 1;

  return (
    <div ref={setNode} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: STAGE.width,
          height: STAGE.height,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {/* Until the first measurement the plane is hidden rather than wrong. */}
        <div style={{ visibility: area ? 'visible' : 'hidden' }}>{children}</div>
      </div>
    </div>
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
  header: {
    left: LIVE_SHELL.gutter,
    right: LIVE_SHELL.gutter,
    top: LIVE_SHELL.headerTop,
    height: LIVE_SHELL.headerHeight,
  },
  legend: {
    left: LIVE_SHELL.gutter,
    right: LIVE_SHELL.gutter,
    bottom: LIVE_SHELL.headerTop,
    height: LIVE_SHELL.legendHeight,
  },
  feed: {
    right: LIVE_SHELL.gutter,
    bottom: LIVE_SHELL.headerTop + LIVE_SHELL.legendHeight + 15,
    width: 459,
  },
  restart: {
    left: LIVE_SHELL.gutter + 12,
    bottom: LIVE_SHELL.headerTop + LIVE_SHELL.legendHeight + 15,
  },
} as const;
