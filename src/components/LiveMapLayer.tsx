import {
  MARKER,
  MARKER_ROW,
  SEARCHED_FILL_OPACITY,
  SECTOR_LABEL_POS,
  STAGE,
} from '../data/mapGeometry';
import {
  INCIDENT_AFFECTED_LABEL,
  INCIDENT_RELAY_LABEL,
  INCIDENT_RING,
  INCIDENT_SECTOR_LABEL,
  LIVE_MARKERS,
  UNTRUSTED_OPACITY,
} from '../data/liveMap';
import {
  SECTOR_FILL_OPACITY,
  SECTOR_SHAPES,
  SECTOR_STROKE_WIDTH,
} from '../data/sectorPaths';
import { SECTORS } from '../data/sectors';
import { INCIDENT } from '../data/live';
import { SITE_GROUPS } from '../data/launchSites';
import { UNITS_BY_ID } from '../data/assets';
import { groupByType, unitType } from '../lib/units';
import { GroupMarker } from './GroupMarker';
import { MapBackdrop } from './MapBackdrop';
import type { SectorLive } from '../store/useLiveStore';
import type { AssetType, SectorId, UnitStatus } from '../data/types';

/** How far a marker steps back while a feed line picks out other units. */
const HIGHLIGHT_DIM = 0.3;

export interface LiveMapLayerProps {
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  live: Record<SectorId, SectorLive>;
  outOfContact: string[];
  /** True while the operator still has to decide: the ring and labels show. */
  incidentOpen: boolean;
  /**
   * True from the moment the link drops, and after. Resolving the incident
   * covers the sector again; it does not mend the aircraft, so GRF-02 keeps
   * its degraded badge for the rest of the mission.
   */
  relayDown: boolean;
  /** Minutes since the link dropped, for the out-of-contact label. */
  since: number;
  /** The relay moving in to cover the sector, and how far along it is (0–1). */
  movingRelay: { unitId: string; progress: number } | null;
  /** Units that have been sent back to staging and are no longer on station. */
  returnedToStaging: readonly string[];
  selectedSector: SectorId | null;
  /**
   * What a selected feed line is about. Everything else on the map steps back
   * so the units and sector the line names stand out — `spec.md`: "Selecting a
   * feed event highlights the assets and sector involved."
   *
   * **Flagged for design review:** no frame draws this state.
   */
  highlight: { units: string[]; sector: SectorId | null } | null;
}

/**
 * The map, live (frames 238:2144 and 289:2394).
 *
 * Three things are true here that are not true on Screen 2. Searched ground
 * fills in, so the sector shows its own progress rather than a forecast. Units
 * stand where they are rather than in a row per sector. And the map carries
 * the colour rule from the `note/Live map color rule` frame: purple for a
 * change the autonomy made by itself, amber for a place the operator has to
 * decide, and nothing at all for everything running to plan.
 */
export function LiveMapLayer({
  unitsBySector,
  relayUnits,
  live,
  outOfContact,
  incidentOpen,
  relayDown,
  since,
  movingRelay,
  returnedToStaging,
  selectedSector,
  highlight,
}: LiveMapLayerProps) {
  const placed = placements(unitsBySector, relayUnits, movingRelay, returnedToStaging);
  const lit = highlight ? new Set(highlight.units) : null;

  return (
    <div
      role="region"
      aria-label="Mission map: sectors, searched ground and live unit positions"
      className="absolute inset-0 overflow-hidden border border-border-subtle bg-map-backdrop"
      style={{ width: STAGE.width, height: STAGE.height }}
    >
      <MapBackdrop />

      {SECTOR_SHAPES.map((shape) => (
        <SectorShape
          key={shape.id}
          shape={shape}
          searched={live[shape.id].searched}
          highlighted={highlight !== null && highlight.sector === shape.id}
        />
      ))}

      {SECTORS.map((sector) => {
        const position =
          (incidentOpen && INCIDENT_SECTOR_LABEL[sector.id]) || SECTOR_LABEL_POS[sector.id];
        const state = live[sector.id];
        const flagged =
          state.flagged ||
          state.paused ||
          state.stopped.some((id) => outOfContact.includes(id));

        return (
          <p
            key={sector.id}
            className={`absolute -translate-y-1/2 text-[14px] whitespace-nowrap ${
              highlight !== null && highlight.sector === sector.id
                ? 'font-semibold text-interaction-primary'
                : flagged
                  ? 'font-medium text-status-needs-operator'
                  : sector.id === selectedSector
                    ? 'font-semibold text-map-zone-label'
                    : 'font-medium text-map-zone-label'
            }`}
            style={{ left: position.x, top: position.y }}
          >
            {sector.mapLabel[0]}
            <br />
            {sector.mapLabel[1]} · <span className="font-mono">{state.searched}%</span>
          </p>
        );
      })}

      {/*
        * Screen 2's "ALL SECTORS · COMMS RELAY" corner has no counterpart
        * here, and neither frame draws one: once the plan is flying each
        * Griffin holds station over a sector of its own, so the relay has a
        * place on the map rather than a label beside it.
        */}

      {/*
        * The relay moving in to cover the sector that lost one, drawn dashed
        * from where it was to where it is going.
        *
        * Teal, not purple: the colour rule gives purple to a change the
        * autonomy made on its own, and this move is the operator's — they
        * chose it in the incident card. Flagged for design review, since the
        * only dashed path drawn in Figma is an autonomy-initiated one.
        */}
      {movingRelay && <RelayPath unitId={movingRelay.unitId} />}

      {placed.map((marker) => {
        const lost = marker.unitIds.every((id) => outOfContact.includes(id));
        const isRelayDown = relayDown && marker.unitIds.includes(INCIDENT.relayUnit);
        const exception = lost || isRelayDown;
        // While a feed line is selected, everything it is not about steps back.
        const unlit = lit !== null && !marker.unitIds.some((id) => lit.has(id));

        return (
          <GroupMarker
            key={marker.unitIds.join('-')}
            type={marker.type}
            unitIds={marker.unitIds}
            status={statusOf(marker.unitIds, lost, isRelayDown)}
            x={marker.x}
            y={marker.y}
            showStatus={exception}
            /*
             * A badge for anything out of the ordinary, but a label only for
             * the unit at the centre of it and for clusters, which need their
             * count. Seven dimmed Hydras each carrying an ID would bury the
             * one marker that matters; the map says "HYD ×7 · OUT OF CONTACT"
             * over them instead, as frame 289:2394 does.
             */
            showLabel={isRelayDown || marker.unitIds.length > 1 || (lit !== null && !unlit)}
            opacity={unlit ? HIGHLIGHT_DIM : lost ? UNTRUSTED_OPACITY : undefined}
            label={labelFor(marker.unitIds, marker.type, lost, isRelayDown, since)}
          />
        );
      })}

      {incidentOpen && (
        <>
          {/*
            * A steady ring, never a blink: the operator's eye is drawn once
            * and then left alone. Redrawn here from the exported 38 px
            * `ring/needs-attention` circle so its colour stays the token.
            */}
          <svg
            aria-hidden
            className="absolute"
            style={{ left: INCIDENT_RING.x, top: INCIDENT_RING.y }}
            width={INCIDENT_RING.size}
            height={INCIDENT_RING.size}
            viewBox="0 0 38 38"
            fill="none"
          >
            <circle
              cx="19"
              cy="19"
              r="18"
              strokeWidth="2"
              className="stroke-status-needs-operator"
            />
          </svg>

          <MapPill
            x={INCIDENT_RELAY_LABEL.x}
            y={INCIDENT_RELAY_LABEL.y}
            className="text-status-needs-operator"
          >
            {INCIDENT.mapLabel}
          </MapPill>

          <MapPill
            x={INCIDENT_AFFECTED_LABEL.x}
            y={INCIDENT_AFFECTED_LABEL.y}
            className="text-status-out-of-contact"
          >
            HYD ×{INCIDENT.affectedUnits.length} · OUT OF CONTACT · {since} MIN
          </MapPill>
        </>
      )}
    </div>
  );
}

/** A label over the map: caps, tracked out, on the map's own pill. */
function MapPill({
  x,
  y,
  className,
  children,
}: {
  x: number;
  y: number;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute flex items-start overflow-hidden rounded-[30px] bg-map-label-pill px-[6px] py-[2px]"
      style={{ left: x, top: y }}
    >
      <p className={`text-[10px] font-bold tracking-[0.4px] whitespace-nowrap ${className}`}>
        {children}
      </p>
    </div>
  );
}

/**
 * One sector: the ground it holds, and how much of that has been searched.
 *
 * The searched part is the sector's own outline, drawn brighter and scaled
 * down about the corner the search started from, so the shape of what has
 * been covered has the shape of the sector rather than the shape of the
 * drawing tool. The scale is the square root of the percentage, which makes
 * the *area* it covers follow the number — a sector that reads 42% has 42% of
 * its ground filled in.
 *
 * Figma exports a different fixed `searched/...` shape per frame, which a
 * running screen cannot do. This is the adaptation, and it is flagged for
 * design review.
 */
function SectorShape({
  shape,
  searched,
  highlighted,
}: {
  shape: (typeof SECTOR_SHAPES)[number];
  searched: number;
  highlighted: boolean;
}) {
  const reach = Math.sqrt(Math.max(0, Math.min(100, searched)) / 100);

  return (
    <svg
      aria-hidden
      className="absolute overflow-visible"
      style={{ left: shape.box.x, top: shape.box.y }}
      width={shape.box.width}
      height={shape.box.height}
      viewBox={`0 0 ${shape.box.width} ${shape.box.height}`}
      preserveAspectRatio="none"
      fill="none"
    >
      <path d={shape.d} className="fill-map-searched" opacity={SECTOR_FILL_OPACITY} />
      <g transform={`scale(${reach})`}>
        <path
          d={shape.d}
          className="fill-map-searched"
          opacity={SEARCHED_FILL_OPACITY - SECTOR_FILL_OPACITY}
        />
      </g>
      <path
        d={shape.d}
        fill="none"
        strokeLinejoin="round"
        strokeWidth={
          highlighted ? SECTOR_STROKE_WIDTH.selected : SECTOR_STROKE_WIDTH.default
        }
        className={highlighted ? 'stroke-interaction-primary' : 'stroke-map-zone-boundary'}
      />
    </svg>
  );
}

/** The dashed run a relay is flying to take over the sector that lost one. */
function RelayPath({ unitId }: { unitId: string }) {
  const from = LIVE_MARKERS.find((marker) => marker.unitIds.includes(unitId));
  const to = LIVE_MARKERS.find((marker) => marker.unitIds.includes(INCIDENT.relayUnit));
  if (!from || !to) return null;

  const centre = (marker: { x: number; y: number }) => ({
    x: marker.x + MARKER.width / 2,
    y: marker.y + MARKER.height / 2,
  });
  const start = centre(from);
  const end = centre(to);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0"
      width={STAGE.width}
      height={STAGE.height}
      fill="none"
    >
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        className="stroke-status-operator-set"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ markers */

interface Placement {
  unitIds: string[];
  type: AssetType;
  x: number;
  y: number;
}

/**
 * Where every flying unit is drawn.
 *
 * The scripted positions are used wherever the plan still matches the one the
 * frame was drawn from. A unit the operator moved somewhere else before launch
 * falls back to its sector's marker row, so a changed plan never leaves a
 * marker sitting over the sector the unit left.
 */
function placements(
  unitsBySector: Record<SectorId, string[]>,
  relayUnits: string[],
  movingRelay: { unitId: string; progress: number } | null,
  returnedToStaging: readonly string[],
): Placement[] {
  const placed: Placement[] = [];
  const done = new Set<string>();

  // Units the operator sent back: they are no longer where they were working,
  // so they are drawn as one cluster at the staging site they came from.
  if (returnedToStaging.length > 0) {
    const staging = SITE_GROUPS.find(
      (site) => site.site === 'stagingA' && !site.unavailable,
    );
    if (staging) {
      returnedToStaging.forEach((unitId) => done.add(unitId));
      placed.push({
        unitIds: [...returnedToStaging],
        type: unitType(returnedToStaging[0]),
        x: staging.x,
        y: staging.y,
      });
    }
  }

  const sectorOf = new Map<string, SectorId | 'ALL'>();
  for (const [sector, unitIds] of Object.entries(unitsBySector)) {
    for (const unitId of unitIds) sectorOf.set(unitId, sector as SectorId);
  }
  for (const unitId of relayUnits) sectorOf.set(unitId, 'ALL');

  for (const marker of LIVE_MARKERS) {
    // A Griffin flies relay over one sector while it is live, so it is drawn
    // where the script stations it whether the plan calls that "all sectors"
    // or one of them.
    const unitIds = marker.unitIds.filter((unitId) => {
      if (done.has(unitId)) return false;
      const sector = sectorOf.get(unitId);
      return sector === marker.sector || (sector === 'ALL' && marker.type === 'GRF');
    });
    if (unitIds.length === 0) continue;

    unitIds.forEach((unitId) => done.add(unitId));

    // A relay on its way to cover another sector is drawn along the run it is
    // flying, so the marker and the dashed path tell the same story.
    const flying = movingRelay && unitIds.length === 1 && unitIds[0] === movingRelay.unitId;
    const target = flying
      ? LIVE_MARKERS.find((one) => one.unitIds.includes(INCIDENT.relayUnit))
      : undefined;

    placed.push({
      unitIds,
      type: marker.type,
      x: target ? lerp(marker.x, target.x, movingRelay!.progress) : marker.x,
      y: target ? lerp(marker.y, target.y, movingRelay!.progress) : marker.y,
    });
  }

  // Anything the script does not know about: lay it out the way Screen 2 does.
  for (const [sector, unitIds] of Object.entries(unitsBySector) as [SectorId, string[]][]) {
    const loose = unitIds.filter((unitId) => !done.has(unitId));
    groupByType(loose).forEach((group, index) => {
      placed.push({
        unitIds: group.unitIds,
        type: group.type,
        x: MARKER_ROW[sector].x + index * MARKER.step,
        y: MARKER_ROW[sector].y,
      });
    });
  }

  return placed;
}

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * Math.max(0, Math.min(1, t));

/** What a marker's badge says, when it says anything. */
function statusOf(unitIds: string[], lost: boolean, relayDown: boolean): UnitStatus {
  if (lost) return 'out-of-contact';
  if (relayDown) return 'degraded';
  return UNITS_BY_ID[unitIds[0]]?.status ?? 'ready';
}

/** What a screen reader hears, since the map's own labels stay off. */
function labelFor(
  unitIds: string[],
  type: AssetType,
  lost: boolean,
  relayDown: boolean,
  since: number,
): string {
  const names = unitIds.join(', ');
  if (lost) return `${names}: out of contact ${since} min, holding at last known position.`;
  if (relayDown) return `${names}: relay link lost.`;
  if (unitIds.length > 1) return `${unitIds.length} ${type} units: ${names}.`;
  return `${names}, ${unitType(unitIds[0])}.`;
}
