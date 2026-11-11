import {
  MAP_PATCH,
  MAP_RASTER,
  MARKER,
  MARKER_ROW,
  OCEAN_LABEL,
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
import { SECTORS } from '../data/sectors';
import { UNITS_BY_ID } from '../data/assets';
import { groupByType } from '../lib/units';
import { GroupMarker } from './GroupMarker';
import type { SectorId } from '../data/types';
import raster from '../assets/map/raster.png';

export interface MapLayerProps {
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  coverage: Record<SectorId, number>;
  selectedSector: SectorId | null;
}

export function MapLayer({
  unitsBySector,
  relayUnits,
  coverage,
  selectedSector,
}: MapLayerProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden border border-border-subtle bg-map-backdrop"
      style={{ width: STAGE.width, height: STAGE.height }}
    >
      <img
        alt=""
        src={raster}
        className="pointer-events-none absolute max-w-none"
        style={{
          left: MAP_RASTER.x,
          top: MAP_RASTER.y,
          width: MAP_RASTER.width,
          height: MAP_RASTER.height,
        }}
      />

      {/* Covers the label baked into the raster, so it can be redrawn in the UI font. */}
      <div
        className="absolute bg-map-patch"
        style={{
          left: MAP_PATCH.x,
          top: MAP_PATCH.y,
          width: MAP_PATCH.width,
          height: MAP_PATCH.height,
        }}
      />
      <p
        className="absolute -translate-x-1/2 text-center text-[11px] font-light text-text-secondary italic"
        style={{ left: OCEAN_LABEL.x, top: OCEAN_LABEL.y }}
      >
        {OCEAN_LABEL.lines[0]}
        <br />
        {OCEAN_LABEL.lines[1]}
      </p>

      {SECTOR_SHAPES.map((shape) => {
        const selected = shape.id === selectedSector;
        return (
          <svg
            key={shape.id}
            className="absolute overflow-visible"
            style={{
              left: shape.box.x,
              top: shape.box.y,
              width: shape.box.width,
              height: shape.box.height,
            }}
            width={shape.box.width}
            height={shape.box.height}
            viewBox={`0 0 ${shape.box.width} ${shape.box.height}`}
            preserveAspectRatio="none"
            fill="none"
            aria-hidden
          >
            <path d={shape.d} className="fill-map-searched" opacity={SECTOR_FILL_OPACITY} />
            <path
              d={shape.d}
              fill="none"
              strokeLinejoin="round"
              strokeWidth={
                selected ? SECTOR_STROKE_WIDTH.selected : SECTOR_STROKE_WIDTH.default
              }
              className={selected ? 'stroke-text-primary' : 'stroke-map-zone-boundary'}
            />
          </svg>
        );
      })}

      {SECTORS.map((sector) => {
        const position = SECTOR_LABEL_POS[sector.id];
        const selected = sector.id === selectedSector;
        return (
          <p
            key={sector.id}
            className={`absolute -translate-y-1/2 text-[14px] whitespace-nowrap ${
              selected ? 'font-semibold text-text-primary' : 'font-medium text-map-zone-label'
            }`}
            style={{ left: position.x, top: position.y }}
          >
            {sector.mapLabel[0]}
            <br />
            {sector.mapLabel[1]} · <span className="font-mono">{coverage[sector.id]}%</span>
          </p>
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

      {relayUnits.length > 0 && (
        <GroupMarker
          type="GRF"
          unitIds={relayUnits}
          status={UNITS_BY_ID[relayUnits[0]].status}
          x={RELAY_MARKER.x}
          y={RELAY_MARKER.y}
        />
      )}

      {SECTORS.map((sector) =>
        groupByType(unitsBySector[sector.id]).map((group, index) => (
          <GroupMarker
            key={`${sector.id}-${group.type}`}
            type={group.type}
            unitIds={group.unitIds}
            status={UNITS_BY_ID[group.unitIds[0]].status}
            x={MARKER_ROW[sector.id].x + index * MARKER.step}
            y={MARKER_ROW[sector.id].y}
          />
        )),
      )}
    </div>
  );
}
