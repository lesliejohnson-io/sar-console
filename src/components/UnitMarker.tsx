import { useDraggable } from '@dnd-kit/core';
import { MARKER } from '../data/mapGeometry';
import { UNITS_BY_ID } from '../data/assets';
import { MarkerFace, padded } from './GroupMarker';
import { useStageScale } from './Stage';

/**
 * One unit, fanned out of its group and ready to be taken hold of. Same face
 * as the group marker, but the pill carries the whole ID ("KRK · 03") because
 * the operator is about to move this one and needs to know which it is.
 *
 * The transform is divided by the stage scale: dnd-kit measures the drag in
 * client pixels while this element lives inside the scaled stage, so the raw
 * delta would move it too far and it would drift out from under the cursor.
 */
export function UnitMarker({
  unitId,
  x,
  y,
  dimmed = false,
}: {
  unitId: string;
  x: number;
  y: number;
  dimmed?: boolean;
}) {
  const unit = UNITS_BY_ID[unitId];
  const scale = useStageScale();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: unitId,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`absolute cursor-grab touch-none rounded-[6px] ${
        isDragging ? 'z-30 cursor-grabbing opacity-90' : ''
      } ${dimmed ? 'opacity-60' : ''}`}
      style={{
        left: x,
        top: y,
        width: MARKER.width,
        height: MARKER.height,
        transform: transform
          ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
          : undefined,
      }}
      aria-label={`${unitId}. Press space to pick up, arrow keys to move, space to drop.`}
      {...listeners}
      {...attributes}
    >
      <MarkerFace type={unit.type} status={unit.status} suffix={padded(unitId)} />
    </button>
  );
}
