import { UNITS_BY_ID, unitsOfType } from '../data/assets';
import { LAUNCH_SITES, SITE_GROUPS, SITE_LABEL_POS } from '../data/launchSites';
import {
  MARKER,
  OVERVIEW_SECTOR_LABEL,
  PRIORITY_CHIP_OFFSET,
  STAGE,
  UNAVAILABLE_TOOLTIP,
} from '../data/mapGeometry';
import { SECTOR_FILL_OPACITY, SECTOR_SHAPES, SECTOR_STROKE_WIDTH } from '../data/sectorPaths';
import { SECTORS, SECTORS_BY_ID } from '../data/sectors';
import { TYPE_NAME } from '../data/reach';
import { HelpCallPin } from './HelpCallPin';
import { LaunchSiteMarker } from './LaunchSiteMarker';
import { MapBackdrop } from './MapBackdrop';
import { PriorityBadge } from './PriorityBadge';
import { RangeRing } from './RangeRing';
import { ReachCard } from './ReachCard';
import { UnavailableTooltip } from './UnavailableTooltip';
import type { AssetType, SectorId } from '../data/types';
import type { UnitHover } from '../routes/Overview';

/**
 * Screen 1's map (frame 171:805).
 *
 * Nothing is tasked yet, so the map shows what exists rather than what is
 * planned: where the assets are standing, where the calls for help came from,
 * and which sectors have been drawn around them. A sector carries no fill
 * here — there is no coverage to shade — so it is an outline and a label, and
 * the outline only appears when the operator is on it.
 *
 * Selecting a sector opens the reach card; pointing at a roster class draws
 * its range. Both are answers to questions asked in the rail, so both are
 * driven from the route above.
 */
export function OverviewMap({
  sectorsDrawn,
  selectedSector,
  onSelectSector,
  hoveredType,
  hover,
  onHover,
}: {
  /** False in the empty state: outlines, labels and chips all go with it. */
  sectorsDrawn: boolean;
  selectedSector: SectorId | null;
  onSelectSector: (sector: SectorId | null) => void;
  hoveredType: AssetType | null;
  hover: UnitHover | null;
  onHover: (hover: UnitHover | null) => void;
}) {
  const ringSite = hoveredType ? LAUNCH_SITES[siteOf(hoveredType)] : undefined;

  return (
    <div
      className="absolute inset-0 overflow-hidden border border-border-subtle bg-map-backdrop"
      style={{ width: STAGE.width, height: STAGE.height }}
      onClick={() => onSelectSector(null)}
    >
      <MapBackdrop />

      {sectorsDrawn &&
        SECTOR_SHAPES.map((shape) => (
          <SectorOutline
            key={shape.id}
            shape={shape}
            selected={shape.id === selectedSector}
            onSelect={() => onSelectSector(shape.id)}
          />
        ))}

      {hoveredType && ringSite && (
        <RangeRing
          ring={ringSite.rangeKm !== undefined}
          label={`${TYPE_NAME[hoveredType].toUpperCase()} RANGE · ${
            ringSite.rangeKm === undefined
              ? 'REACHES ALL SECTORS'
              : `${ringSite.rangeKm} KM FROM ${ringSite.name.toUpperCase()}`
          }`}
        />
      )}

      {sectorsDrawn &&
        SECTORS.map((sector) => {
          const position = OVERVIEW_SECTOR_LABEL[sector.id];
          const selected = sector.id === selectedSector;

          return (
            <div key={sector.id} className="pointer-events-none">
              <div
                className="absolute"
                style={{ left: position.x, top: position.y + PRIORITY_CHIP_OFFSET.dy }}
              >
                <PriorityBadge priority={sector.priority} />
              </div>
              <p
                className={`absolute text-[14px] whitespace-nowrap ${
                  selected ? 'font-semibold text-text-primary' : 'font-medium text-map-zone-label'
                }`}
                style={{ left: position.x, top: position.y }}
              >
                {sector.mapLabel[0]}
                <br />
                {sector.mapLabel[1]}
              </p>
            </div>
          );
        })}

      {Object.entries(SITE_LABEL_POS).map(([site, position]) => (
        <p
          key={site}
          className="absolute text-[11px] font-semibold tracking-[0.6px] whitespace-nowrap text-map-zone-label uppercase"
          style={{ left: position.x, top: position.y }}
        >
          {LAUNCH_SITES[site].name}
        </p>
      ))}

      {SITE_GROUPS.map((group) => {
        const units = unitsOfType(group.type).filter(
          (unit) =>
            unit.site === group.site && (unit.status === 'unavailable') === group.unavailable,
        );
        if (units.length === 0) return null;

        return (
          <LaunchSiteMarker
            key={`${group.site}-${group.type}-${group.unavailable}`}
            group={group}
            units={units}
            highlighted={units.some((unit) => unit.id === hover?.unitId)}
            onHover={
              group.unavailable
                ? (hovering) => onHover(hovering ? { unitId: units[0].id, from: 'map' } : null)
                : undefined
            }
          />
        );
      })}

      {SECTORS.map((sector) => (
        <HelpCallPin key={sector.id} sectorId={sector.id} count={sector.helpCalls} />
      ))}

      {sectorsDrawn && selectedSector && <ReachCard sectorId={selectedSector} />}

      {/*
        * Asked on the map, answered on the map: the tooltip opens beside the
        * marker rather than beside the rail, so it never crosses the screen
        * to reply to a question put over here.
        */}
      {hover?.from === 'map' && <MarkerTooltip unitId={hover.unitId} />}
    </div>
  );
}

/** Which site a class flies from, for the range ring's label. */
const siteOf = (type: AssetType): string => unitsOfType(type)[0].site;

function MarkerTooltip({ unitId }: { unitId: string }) {
  const unit = UNITS_BY_ID[unitId];
  const marker = SITE_GROUPS.find(
    (group) => group.type === unit.type && group.unavailable,
  );
  if (!marker || !unit.unavailableDetail) return null;

  return (
    <UnavailableTooltip
      title={`${unit.id} · Unavailable`}
      detail={unit.unavailableDetail}
      expectedBack={unit.expectedBack ?? ''}
      x={marker.x + MARKER.width + 12}
      y={marker.y + MARKER.height / 2 - UNAVAILABLE_TOOLTIP.height / 2}
    />
  );
}

/**
 * A drawn sector, before anything is flying it.
 *
 * It has nothing to say until the operator asks, so it draws no outline at
 * rest: hovering or focusing brings up the boundary, and selecting turns that
 * boundary white and opens the reach card. It is a button because that is
 * what it is — the keyboard reaches every sector, in map order.
 */
function SectorOutline({
  shape,
  selected,
  onSelect,
}: {
  shape: (typeof SECTOR_SHAPES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const sector = SECTORS_BY_ID[shape.id];

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${sector.label}, ${sector.priority} priority, ${sector.helpCalls} calls for help`}
      className="group absolute cursor-pointer"
      style={{
        left: shape.box.x,
        top: shape.box.y,
        width: shape.box.width,
        height: shape.box.height,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
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
          d={shape.d}
          opacity={selected ? SECTOR_FILL_OPACITY : SECTOR_FILL_OPACITY / 2}
          className={`fill-map-searched transition-opacity duration-150 ${
            selected ? '' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        />
        <path
          d={shape.d}
          fill="none"
          strokeLinejoin="round"
          strokeWidth={selected ? SECTOR_STROKE_WIDTH.selected : SECTOR_STROKE_WIDTH.default}
          className={`transition-opacity duration-150 ${
            selected
              ? 'stroke-text-primary'
              : 'stroke-map-zone-boundary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        />
      </svg>
    </button>
  );
}
