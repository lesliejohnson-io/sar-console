import { usePlanStore } from '../store/usePlanStore';

/**
 * Development only. Milestone 2 replaces this with the real interaction —
 * dragging a unit between sectors — but until then it stands in for it, so the
 * single store update behind the demo's main move can be watched: the map
 * label, the sector markers, the tasking rows, the coverage bars, the warning
 * card and the top-bar stats all come from the same state.
 */
export function DevTools() {
  const moveUnit = usePlanStore((state) => state.moveUnit);
  const reset = usePlanStore((state) => state.reset);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="absolute top-[82px] left-[21px] z-10 flex items-center gap-[8px] rounded-[6px] border border-border-subtle bg-surface-panel px-[10px] py-[6px] opacity-80">
      <span className="text-[11px] tracking-[0.6px] text-text-secondary uppercase">Dev</span>
      {['KRK-03', 'KRK-04'].map((unitId) => (
        <button
          key={unitId}
          type="button"
          onClick={() => moveUnit(unitId, 'D')}
          className="cursor-pointer rounded-[3px] border border-interaction-primary px-[8px] py-[3px] text-[11px] font-semibold text-interaction-primary"
        >
          Move {unitId} → D
        </button>
      ))}
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer rounded-[3px] border border-text-secondary px-[8px] py-[3px] text-[11px] font-semibold text-text-secondary"
      >
        Reset
      </button>
    </div>
  );
}
