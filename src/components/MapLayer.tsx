import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  MARKER,
  MARKER_ROW,
  RELAY_LABEL_POS,
  RELAY_MARKER,
  SECTOR_LABEL_POS,
  STAGE,
} from '../data/mapGeometry';
import {
  SECTOR_FILL_OPACITY,
  SECTOR_SHAPES,
  SECTOR_STROKE_WIDTH,
} from '../data/sectorPaths';
import { SECTORS, SECTORS_BY_ID, SECTOR_IDS } from '../data/sectors';
import { UNITS_BY_ID } from '../data/assets';
import { REACH_WARNING_GLYPH, canOperatorMove } from '../data/reach';
import { groupByType } from '../lib/units';
import { sectorCollision } from '../lib/collision';
import { coverageAfterMove, type Assignments } from '../store/usePlanStore';
import { FannedGroup } from './FannedGroup';
import { GroupMarker } from './GroupMarker';
import { MapBackdrop } from './MapBackdrop';
import type { AssetType, AssignmentTarget, SectorId } from '../data/types';

/** Which group the operator has opened, if any. */
export interface FannedGroupId {
  target: AssignmentTarget;
  type: AssetType;
}

export interface MapLayerProps {
  assignments: Assignments;
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  coverage: Record<SectorId, number>;
  selectedSector: SectorId | null;
  fanned: FannedGroupId | null;
  onFan: (group: FannedGroupId | null) => void;
  onMove: (unitId: string, toSector: SectorId) => void;
  onRefuse: (unitId: string, toSector: SectorId, reason: string) => void;
}

export function MapLayer({
  assignments,
  unitsBySector,
  relayUnits,
  coverage,
  selectedSector,
  fanned,
  onFan,
  onMove,
  onRefuse,
}: MapLayerProps) {
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<SectorId | null>(null);

  const collisionDetection = useMemo(() => sectorCollision(paths.current, SECTOR_IDS), []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  // Escape closes an open group, as it closes the reach card on Screen 1.
  useEffect(() => {
    if (!fanned) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dragging) onFan(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fanned, dragging, onFan]);

  const onDragStart = (event: DragStartEvent) => setDragging(String(event.active.id));

  const onDragOver = (event: DragOverEvent) =>
    setOver(event.over ? (event.over.id as SectorId) : null);

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    setOver(null);
    if (!event.over) return;

    const unitId = String(event.active.id);
    const sector = event.over.id as SectorId;
    const verdict = canOperatorMove(unitId, sector);

    if (!verdict.ok) onRefuse(unitId, sector, verdict.reason);
    else onMove(unitId, sector);
  };

  const onDragCancel = () => {
    setDragging(null);
    setOver(null);
  };

  /*
   * What a screen reader hears during a drag. dnd-kit announces its own
   * "Draggable item ... was dropped over droppable area ..." otherwise, which
   * names the machinery rather than the mission; these say what the operator
   * actually did, in the words the rest of the console uses.
   *
   * Coverage is read from `coverageAfterMove` on the plan as it stands before
   * the drop, which is the same number the drop produces — so the announcement
   * does not depend on when the store happens to update.
   */
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${active.id} picked up. Use the arrow keys to choose a sector, space to drop, escape to cancel.`,
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      const sector = over.id as SectorId;
      const verdict = canOperatorMove(String(active.id), sector);
      if (!verdict.ok) return `Over ${label(sector)}. ${verdict.reason}.`;
      if (assignments[active.id]?.target === sector) return `Over ${label(sector)}, where it is now.`;
      const caution = verdict.caution ? ` ${verdict.caution}.` : '';
      return `Over ${label(sector)}.${caution} Coverage would be ${coverageAfterMove(
        assignments,
        String(active.id),
        sector,
      )}%.`;
    },
    onDragEnd: ({ active, over }) => {
      const unitId = String(active.id);
      const from = assignments[unitId]?.target;
      if (!over) return `${unitId} stays in ${from === 'ALL' ? 'relay' : label(from as SectorId)}.`;

      const sector = over.id as SectorId;
      const verdict = canOperatorMove(unitId, sector);
      if (!verdict.ok) return `${unitId} cannot move to ${label(sector)}. ${verdict.reason}.`;
      if (from === sector) return `${unitId} stays in ${label(sector)}.`;

      const origin = from === 'ALL' ? 'relay' : `Sector ${from}`;
      const caution = verdict.caution ? ` ${verdict.caution}.` : '';
      return `${unitId} moved from ${origin} to Sector ${sector}.${caution} Sector ${sector} coverage ${coverageAfterMove(
        assignments,
        unitId,
        sector,
      )}%.`;
    },
    onDragCancel: ({ active }) => `Move cancelled. ${active.id} stays where it was.`,
  };

  /** How each sector should read while a unit is in the air. */
  const stateOf = (sector: SectorId) => {
    if (!dragging) return { mode: 'idle' as const };

    const verdict = canOperatorMove(dragging, sector);
    const isSource = assignments[dragging]?.target === sector;
    const isOver = over === sector;

    if (!verdict.ok) return { mode: 'refused' as const, isOver, reason: verdict.reason };
    if (isSource) return { mode: 'source' as const, isOver };
    return {
      mode: 'target' as const,
      isOver,
      caution: verdict.caution,
      preview: coverageAfterMove(assignments, dragging, sector),
    };
  };

  return (
    <DndContext
      sensors={sensors}
      accessibility={{ announcements }}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div
        role="region"
      aria-label="Mission map: sectors and the units proposed for each"
      className="absolute inset-0 overflow-hidden border border-border-subtle bg-map-backdrop"
        style={{ width: STAGE.width, height: STAGE.height }}
        onClick={() => onFan(null)}
      >
        <MapBackdrop />

        {SECTOR_SHAPES.map((shape) => (
          <SectorShape
            key={shape.id}
            shape={shape}
            selected={shape.id === selectedSector}
            state={stateOf(shape.id)}
            registerPath={(element) => {
              paths.current[shape.id] = element;
            }}
          />
        ))}

        {SECTORS.map((sector) => {
          const position = SECTOR_LABEL_POS[sector.id];
          const selected = sector.id === selectedSector;
          const state = stateOf(sector.id);
          const preview = state.mode === 'target' && state.isOver ? state.preview : null;
          const note = state.mode !== 'idle' && state.isOver ? reachNote(state) : undefined;

          return (
            <div key={sector.id}>
              <p
                className={`absolute -translate-y-1/2 text-[14px] whitespace-nowrap ${
                  selected ? 'font-semibold text-text-primary' : 'font-medium text-map-zone-label'
                }`}
                style={{ left: position.x, top: position.y }}
              >
                {sector.mapLabel[0]}
                <br />
                {sector.mapLabel[1]} ·{' '}
                {preview === null ? (
                  <span className="font-mono">{coverage[sector.id]}%</span>
                ) : (
                  <>
                    <span className="font-mono line-through opacity-60">
                      {coverage[sector.id]}%
                    </span>{' '}
                    <span className="font-mono font-semibold text-status-operator-set">
                      → {preview}%
                    </span>
                  </>
                )}
              </p>

              {note && <ReachTag x={position.x} y={position.y + 22} reason={note} />}
            </div>
          );
        })}

        <p
          className="absolute -translate-y-1/2 text-[14px] font-medium whitespace-nowrap text-map-zone-label"
          style={{ left: RELAY_LABEL_POS.x, top: RELAY_LABEL_POS.y }}
        >
          {RELAY_LABEL_POS.lines[0]}
          <br />
          {RELAY_LABEL_POS.lines[1]}
        </p>

        {relayUnits.length > 0 &&
          (isFanned(fanned, 'ALL', 'GRF') ? (
            <FannedGroup unitIds={relayUnits} anchor={RELAY_MARKER} />
          ) : (
            <GroupMarker
              type="GRF"
              unitIds={relayUnits}
              status={UNITS_BY_ID[relayUnits[0]].status}
              x={RELAY_MARKER.x}
              y={RELAY_MARKER.y}
              expanded={false}
              onExpand={() => onFan({ target: 'ALL', type: 'GRF' })}
            />
          ))}

        {SECTORS.map((sector) =>
          groupByType(unitsBySector[sector.id]).map((group, index) => {
            const anchor = {
              x: MARKER_ROW[sector.id].x + index * MARKER.step,
              y: MARKER_ROW[sector.id].y,
            };

            if (isFanned(fanned, sector.id, group.type)) {
              return (
                <FannedGroup
                  key={`${sector.id}-${group.type}`}
                  unitIds={group.unitIds}
                  anchor={anchor}
                />
              );
            }

            return (
              <GroupMarker
                key={`${sector.id}-${group.type}`}
                type={group.type}
                unitIds={group.unitIds}
                status={UNITS_BY_ID[group.unitIds[0]].status}
                x={anchor.x}
                y={anchor.y}
                expanded={false}
                onExpand={() => onFan({ target: sector.id, type: group.type })}
              />
            );
          }),
        )}
      </div>
    </DndContext>
  );
}

const label = (sector: SectorId): string => SECTORS_BY_ID[sector].label;

/** What the sector has to say about the unit over it, if anything. */
const reachNote = (state: SectorState): string | undefined => {
  if (state.mode === 'refused') return state.reason;
  if (state.mode === 'target') return state.caution;
  return undefined;
};

const isFanned = (
  fanned: FannedGroupId | null,
  target: AssignmentTarget,
  type: AssetType,
): boolean => fanned?.target === target && fanned.type === type;

type SectorState =
  | { mode: 'idle' }
  | { mode: 'source'; isOver: boolean }
  | { mode: 'target'; isOver: boolean; preview: number; caution?: string }
  | { mode: 'refused'; isOver: boolean; reason: string };

/**
 * One sector outline, and the drop target it becomes while a unit is in the
 * air. Teal marks a sector the operator may drop into, because teal is the
 * operator's own colour; amber marks one the operator should think about
 * first, and says so in words next to the label rather than by colour alone.
 *
 * Amber comes in two strengths, told apart by the outline rather than by the
 * colour: **dashed** refuses the drop, **solid** accepts it with a caution —
 * a sector the type only partly reaches. The console never blocks the
 * operator over a partial reach; it tells them what they are taking on.
 */
function SectorShape({
  shape,
  selected,
  state,
  registerPath,
}: {
  shape: (typeof SECTOR_SHAPES)[number];
  selected: boolean;
  state: SectorState;
  registerPath: (element: SVGPathElement | null) => void;
}) {
  const { setNodeRef } = useDroppable({ id: shape.id });

  const highlighted = state.mode === 'target' || state.mode === 'refused';
  const cautioned = state.mode === 'target' && state.caution !== undefined;
  const strokeClass =
    state.mode === 'refused' || cautioned
      ? 'stroke-status-needs-operator'
      : state.mode === 'target'
        ? 'stroke-status-operator-set'
        : selected
          ? 'stroke-text-primary'
          : 'stroke-map-zone-boundary';

  const strokeWidth =
    (highlighted && state.isOver) || selected
      ? SECTOR_STROKE_WIDTH.selected
      : highlighted
        ? 1.6
        : SECTOR_STROKE_WIDTH.default;

  const fillOpacity =
    state.mode === 'target' && state.isOver ? 0.22 : SECTOR_FILL_OPACITY;

  // The droppable ref goes on a wrapper rather than the <svg>: dnd-kit types
  // its node as an HTMLElement, and the wrapper's rect is also what the
  // keyboard fallback measures when there is no pointer to hit-test with.
  return (
    <div
      ref={setNodeRef}
      className="absolute"
      style={{
        left: shape.box.x,
        top: shape.box.y,
        width: shape.box.width,
        height: shape.box.height,
      }}
    >
    <svg
      className="absolute inset-0 overflow-visible"
      width={shape.box.width}
      height={shape.box.height}
      viewBox={`0 0 ${shape.box.width} ${shape.box.height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <path
        ref={registerPath}
        d={shape.d}
        className="fill-map-searched transition-opacity duration-150"
        opacity={fillOpacity}
      />
      <path
        d={shape.d}
        fill="none"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        strokeDasharray={state.mode === 'refused' ? '6 4' : undefined}
        className={`transition-[stroke-width] duration-150 ${strokeClass}`}
      />
    </svg>
    </div>
  );
}

/**
 * The reach warning, in the shape frame 179:1782 draws it. It carries both a
 * refusal and a caution: the words say which, so the amber is never the only
 * thing telling them apart.
 */
function ReachTag({ x, y, reason }: { x: number; y: number; reason: string }) {
  return (
    <div
      className="absolute z-10 flex items-center gap-[6px] overflow-hidden rounded-[4px] border border-status-needs-operator bg-surface-panel py-[3px] pr-[8px] pl-[6px] whitespace-nowrap"
      style={{ left: x, top: y }}
    >
      <p className="text-[10px] font-semibold text-status-needs-operator">
        {REACH_WARNING_GLYPH}
      </p>
      <p className="text-[11px] text-text-primary">{reason}</p>
    </div>
  );
}
