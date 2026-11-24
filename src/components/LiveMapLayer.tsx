import {
  HIGHLIGHT_DIM,
  MARKER,
  MARKER_ANCHOR,
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
  reportedBearing,
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
import { formatUnitRange, unitType } from '../lib/units';
import { bandsFor, bearingOf, cellsPath, clearedCells, unitTrack, type Band } from '../lib/sweep';
import { useReducedMotion } from '../lib/useReducedMotion';
import type { Outage } from '../lib/live';
import { GroupMarker, markerTitle } from './GroupMarker';
import { MapBackdrop } from './MapBackdrop';
import type { SectorLive } from '../store/useLiveStore';
import type { AssetType, SectorId, UnitStatus } from '../data/types';

export interface LiveMapLayerProps {
  unitsBySector: Record<SectorId, string[]>;
  relayUnits: string[];
  live: Record<SectorId, SectorLive>;
  outOfContact: string[];
  /** The mission minute: where every unit is, and how much ground is cleared. */
  minute: number;
  /** Who has not been searching, and since when. */
  outages: readonly Outage[];
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
 * Three things are true here that are not true on Screen 2. The ground is
 * searched cell by cell, by the units that fly over it, so the map shows not
 * just how much has been covered but which part. Units fly their own patterns
 * rather than standing in a row per sector. And the map carries the colour
 * rule from the `note/Live map color rule` frame: purple for a change the
 * autonomy made by itself, amber for a place the operator has to decide, and
 * nothing at all for everything running to plan.
 */
export function LiveMapLayer({
  unitsBySector,
  relayUnits,
  live,
  outOfContact,
  minute,
  outages,
  incidentOpen,
  relayDown,
  since,
  movingRelay,
  returnedToStaging,
  selectedSector,
  highlight,
}: LiveMapLayerProps) {
  const stillMoving = !useReducedMotion();
  const bands = allBands(unitsBySector);
  const placed = placements(
    unitsBySector,
    relayUnits,
    movingRelay,
    returnedToStaging,
    bands,
    minute,
    outages,
    stillMoving,
  );
  const lit = highlight ? new Set(highlight.units) : null;
  const affected = labelOver(placed, outOfContact);

  return (
    <div
      role="region"
      aria-label="Mission map: sectors, searched ground and live unit positions"
      className="absolute inset-0 overflow-hidden bg-map-backdrop"
      style={{ width: STAGE.width, height: STAGE.height }}
    >
      <MapBackdrop />

      {SECTOR_SHAPES.map((shape) => (
        <SectorShape
          key={shape.id}
          shape={shape}
          highlighted={highlight !== null && highlight.sector === shape.id}
        />
      ))}

      <SearchedGround unitsBySector={unitsBySector} live={live} minute={minute} outages={outages} />

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
            /*
             * Pointed where it is going. A unit out of contact holds the
             * heading it had when the link dropped, which is what it is
             * actually doing: holding, not turning.
             */
            bearing={marker.bearing}
            label={labelFor(marker.unitIds, marker.type, lost, isRelayDown, since)}
            title={titleFor(marker.unitIds, lost, isRelayDown, since)}
            /*
             * A unit that is flying glides between one minute's position and
             * the next, so the pattern reads as a pattern rather than a
             * sequence of jumps. A unit out of contact is not moving and is
             * not given the transition either: it is drawn exactly where it
             * stopped.
             */
            moving={marker.moving && stillMoving}
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

          {/*
            * The pill follows the units it is about. Figma pins it beside the
            * cluster the frame draws, but a unit holding at its last known
            * position holds wherever it happened to be, so the label is placed
            * from where they actually are and only falls back to the frame's
            * own spot if none of them is on the map.
            */}
          <MapPill
            x={affected?.x ?? INCIDENT_AFFECTED_LABEL.x}
            y={affected?.y ?? INCIDENT_AFFECTED_LABEL.y}
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

/** One sector: the ground it holds, washed and outlined. */
function SectorShape({
  shape,
  highlighted,
}: {
  shape: (typeof SECTOR_SHAPES)[number];
  highlighted: boolean;
}) {
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

/**
 * The ground that has actually been searched, cell by cell.
 *
 * Every sector starts covered by its own dim wash and brightens a cell at a
 * time as the unit working that strip passes over it, so the map answers a
 * question the old drifting fill could not: not how much has been searched,
 * but *which* part — and, when seven Hydras stop, which strips nobody is
 * flying any more.
 *
 * The count is not emergent. It is taken from the same `searched` figure the
 * rail reports and handed out to the units in proportion to how long each has
 * been searching, so the cleared cells always come to the percentage in the
 * panel. See `lib/sweep.ts`.
 *
 * **Flagged for design review:** Figma exports a fixed `searched/...` shape
 * per frame, which a running screen cannot use. The grid is the adaptation —
 * the cell size and the 1 px gap between cells are proposed here.
 */
function SearchedGround({
  unitsBySector,
  live,
  minute,
  outages,
}: {
  unitsBySector: Record<SectorId, string[]>;
  live: Record<SectorId, SectorLive>;
  minute: number;
  outages: readonly Outage[];
}) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0"
      width={STAGE.width}
      height={STAGE.height}
      fill="none"
    >
      {SECTOR_SHAPES.map((shape) => (
        <path
          key={shape.id}
          d={cellsPath(
            clearedCells(
              shape.id,
              unitsBySector[shape.id],
              live[shape.id].searched,
              minute,
              outages,
            ),
          )}
          className="fill-map-searched"
          opacity={SEARCHED_FILL_OPACITY - SECTOR_FILL_OPACITY}
        />
      ))}
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
  /**
   * Which way the unit is pointing, in degrees clockwise from north: off its
   * own track while it is flying a pattern, off the heading it reports while
   * it is holding station.
   */
  bearing: number;
  /** Whether this marker is flying a pattern, and so should glide. */
  moving: boolean;
}

/** Each sector's strips, worked out once per render and shared. */
const allBands = (
  unitsBySector: Record<SectorId, string[]>,
): Record<SectorId, Band[]> =>
  Object.fromEntries(
    (Object.keys(unitsBySector) as SectorId[]).map((sector) => [
      sector,
      bandsFor(sector, unitsBySector[sector]),
    ]),
  ) as Record<SectorId, Band[]>;

/**
 * Where a marker's box goes for a unit at a point: the box is offset so its
 * anchor — where the glyph is centred — lands on the spot, rather than the
 * box's own corner.
 */
const GLYPH_CENTRE = MARKER_ANCHOR;

/**
 * Where every flying unit is drawn.
 *
 * Searching units fly their own patterns — a Hydra or a Kraken mows its strip,
 * a Roc circles its own — computed from the mission minute, so the markers and
 * the ground they have cleared are the same story told twice. The Griffins
 * hold station where the script places them, which is what a relay does.
 *
 * Under `prefers-reduced-motion` nothing is computed from the clock: every
 * searching unit is drawn at the centre of its strip and stays there. The
 * ground still fills in — that is the mission, not an animation — but no
 * marker moves.
 *
 * **Flagged for design review:** the frames draw one marker per asset type per
 * sector. Flying lanes needs a unit to be its own marker, so a sector's seven
 * Hydras are now seven markers; labels and badges stay off unless a unit is an
 * exception, which is the rule in the `note/Live map labels and badges` frame.
 */
function placements(
  unitsBySector: Record<SectorId, string[]>,
  relayUnits: string[],
  movingRelay: { unitId: string; progress: number } | null,
  returnedToStaging: readonly string[],
  bands: Record<SectorId, Band[]>,
  minute: number,
  outages: readonly Outage[],
  moving: boolean,
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
        bearing: reportedBearing(returnedToStaging[0]),
        moving: false,
      });
    }
  }

  /* The relays: on station over a sector, or crossing to another. */
  for (const marker of LIVE_MARKERS) {
    if (marker.type !== 'GRF') continue;

    const unitIds = marker.unitIds.filter(
      (unitId) => !done.has(unitId) && relayUnits.includes(unitId),
    );
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
      /*
       * On station it flies the heading it reports. Crossing to another
       * sector it flies the leg itself, so the glyph and the dashed path
       * point the same way.
       */
      bearing: target
        ? bearingOf({ x: target.x - marker.x, y: target.y - marker.y })
        : marker.bearing,
      moving: target !== undefined,
    });
  }

  /* Everything searching: one marker per unit, on its own pattern. */
  for (const [sector, unitIds] of Object.entries(unitsBySector) as [SectorId, string[]][]) {
    for (const band of bands[sector]) {
      if (done.has(band.unitId) || !unitIds.includes(band.unitId)) continue;
      done.add(band.unitId);

      /*
       * The band is this unit's track, so the heading comes off the leg it is
       * on — not off the last two positions it was drawn at, which at a band
       * an hour long would wander by a degree or two a minute and set every
       * marker shivering.
       *
       * Frozen positions mean a frozen heading too: under reduced motion the
       * clock drives nothing, so the unit is drawn at the centre of its strip
       * on the heading it reports rather than one that turns as time passes.
       */
      const track = unitTrack(band.unitId, band, minute, outages);
      const point = moving ? track : band.centre;

      placed.push({
        unitIds: [band.unitId],
        type: unitType(band.unitId),
        x: point.x - GLYPH_CENTRE.x,
        y: point.y - GLYPH_CENTRE.y,
        bearing: moving ? track.bearing : reportedBearing(band.unitId),
        moving,
      });
    }
  }

  return placed;
}

/**
 * Where to put one label for a scattered group of units: centred on them and
 * just below, in the map's own coordinate space.
 */
function labelOver(
  placed: readonly Placement[],
  unitIds: readonly string[],
): { x: number; y: number } | null {
  const theirs = placed.filter((marker) => marker.unitIds.some((id) => unitIds.includes(id)));
  if (theirs.length === 0) return null;

  const left = Math.min(...theirs.map((marker) => marker.x));
  const right = Math.max(...theirs.map((marker) => marker.x)) + MARKER.width;
  const bottom = Math.max(...theirs.map((marker) => marker.y)) + MARKER.height;

  // Below the group, not above: the relay that caused this is drawn above
  // them with a label of its own, and two pills in the same place read as one.
  return { x: (left + right) / 2 - AFFECTED_LABEL_WIDTH / 2, y: bottom + 4 };
}

/** Roughly how wide "HYD x7 · OUT OF CONTACT · nn MIN" runs, for centring. */
const AFFECTED_LABEL_WIDTH = 210;

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * Math.max(0, Math.min(1, t));

/** What a marker's badge says, when it says anything. */
function statusOf(unitIds: string[], lost: boolean, relayDown: boolean): UnitStatus {
  if (lost) return 'out-of-contact';
  if (relayDown) return 'degraded';
  return UNITS_BY_ID[unitIds[0]]?.status ?? 'ready';
}

/**
 * The hover tooltip: the state in words, and for a unit out of contact the
 * reason it is dimmed, so the operator never needs the key to read a marker.
 */
function titleFor(unitIds: string[], lost: boolean, relayDown: boolean, since: number): string {
  const units = formatUnitRange(unitIds);
  if (lost) return `${units} · Out of contact ${since} min · position not current`;
  if (relayDown) return `${units} · Degraded · relay link lost`;
  return markerTitle(unitIds, statusOf(unitIds, lost, relayDown));
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
