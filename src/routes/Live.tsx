import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EventFeed } from '../components/EventFeed';
import { IncidentCard } from '../components/IncidentCard';
import { Legend } from '../components/Legend';
import { LiveFlagCard } from '../components/LiveFlagCard';
import { LiveMapLayer } from '../components/LiveMapLayer';
import { LiveRegion } from '../components/LiveRegion';
import { LiveTopBar } from '../components/LiveTopBar';
import { RestartDemo } from '../components/RestartDemo';
import { SectorStatusPanel } from '../components/SectorStatusPanel';
import { Stage } from '../components/Stage';
import { BEHIND_TOLERANCE, INCIDENT, MINUTE_MS } from '../data/live';
import { SECTORS_BY_ID, SECTOR_IDS } from '../data/sectors';
import { coverage } from '../lib/coverage';
import { formatUnitRange, unitType } from '../lib/units';
import {
  clock,
  feed,
  furthestBehind,
  highlighted,
  incidentPhase,
  liveBySector,
  outOfContact,
  sinceIncident,
  untilResolved,
  useLiveStore,
} from '../store/useLiveStore';
import { availableCount, unitsIn, usePlanStore } from '../store/usePlanStore';
import type { SectorId } from '../data/types';

/**
 * Screen 3 · Tasking live, at `/live` (frames 238:2144 and 289:2394).
 *
 * The plan is up and the operator is watching it work. Everything on the
 * screen is derived from two pieces of state — the plan that launched, which
 * never changes again, and the minute the mission is in — so the bars, the
 * map, the feed and the top bar can never drift apart from each other.
 *
 * `/live?at=incident` opens two minutes into the relay loss, which is the
 * moment frame 289:2394 draws.
 */
export function Live() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const atIncident = params.get('at') === 'incident';

  const assignments = usePlanStore((state) => state.assignments);
  const launched = usePlanStore((state) => state.launched);
  const selectedSector = usePlanStore((state) => state.selectedSector);
  const resetPlan = usePlanStore((state) => state.reset);
  const lockedUnits = usePlanStore((state) => state.lockedUnits);
  const toggleSectorLock = usePlanStore((state) => state.toggleSectorLock);

  const live = useLiveStore();
  const [announcement, setAnnouncement] = useState('');
  const incidentRef = useRef<HTMLDivElement>(null);

  /*
   * The mission clock. One mission minute per tick, stopping at the end of the
   * two-hour window the plan was drawn for. The interval is cleared on every
   * change of pace, so a jump to the incident never leaves a second clock
   * running behind it.
   */
  const running = live.running;
  const advance = live.advance;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(advance, MINUTE_MS);
    return () => window.clearInterval(timer);
  }, [running, advance]);

  // Deep link: open at the minute the incident frame draws, not at the moment
  // the link drops, so the card reads "2 min ago" as the frame does.
  const jumpTo = live.jumpTo;
  useEffect(() => {
    if (atIncident) jumpTo(INCIDENT.atMinute + 2);
  }, [atIncident, jumpTo]);

  /*
   * `/live?at=incident` is a way into the middle of the story, so it brings
   * its own plan: the proposed tasking with the move the demo is about, sent
   * up. Opening `/live` on its own still says that nothing is flying — the
   * console should never pretend a plan launched that the operator never saw.
   */
  const moveUnit = usePlanStore((state) => state.moveUnit);
  const setStaged = usePlanStore((state) => state.setStaged);
  const launchPlan = usePlanStore((state) => state.launch);
  useEffect(() => {
    if (!atIncident || usePlanStore.getState().launched !== null) return;
    moveUnit('KRK-03', 'D');
    moveUnit('KRK-04', 'D');
    SECTOR_IDS.forEach((id) => setStaged(id, true));
    launchPlan();
  }, [atIncident, moveUnit, setStaged, launchPlan]);

  /*
   * Escape clears a selected feed line, the same key that collapses a fanned
   * group on Screen 2. Nothing on this screen traps the operator in a state
   * they have to click their way out of.
   */
  const selectEvent = live.selectEvent;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') selectEvent(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectEvent]);

  const phase = incidentPhase(live);
  const unresolved = phase === 'deciding' || phase === 'in-progress';

  /* Nothing launched: there is no mission to watch. */
  if (launched === null) {
    return (
      <Stage>
        <div className="absolute inset-0 bg-surface-app" />
        <LiveTopBar
          minute={0}
          worst={null}
          incidentOpen={false}
          inContact={availableCount()}
          available={availableCount()}
        />
        <section
          aria-labelledby="live-title"
          className="absolute flex flex-col gap-[8px] rounded-[10px] border border-border-subtle bg-surface-panel p-[21px] shadow-panel"
          style={{ left: 9, top: 85, width: 460 }}
        >
          {/* No Figma frame for this state — copy proposed, flagged for review. */}
          <h2
            id="live-title"
            className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase"
          >
            Nothing is flying
          </h2>
          <p className="text-[12px] text-text-secondary">
            This screen follows a plan that has launched. Review the proposed tasking and
            send it up first.
          </p>
          <button
            type="button"
            onClick={() => navigate('/review')}
            className="mt-[4px] flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[3px] bg-interaction-primary text-[14px] font-medium text-text-on-interaction"
          >
            BACK TO THE PLAN
          </button>
        </section>
        <Legend />
        <RestartDemo
          onRestart={() => {
            resetPlan();
            live.reset();
            navigate('/overview');
          }}
        />
      </Stage>
    );
  }

  const unitsBySector = Object.fromEntries(
    SECTOR_IDS.map((id) => [id, launched.includes(id) ? unitsIn(assignments, id) : []]),
  ) as Record<SectorId, string[]>;
  const relayUnits = unitsIn(assignments, 'ALL');

  /*
   * The incident is scripted against a plan that launched Sector B with its
   * seven Hydras. If the operator sent up something else, the relay loss has
   * nothing to happen to, and the console says nothing rather than reporting
   * a failure of units that never left the ground.
   */
  const incidentApplies =
    launched.includes(INCIDENT.sector) &&
    INCIDENT.affectedUnits.every((id) => unitsBySector[INCIDENT.sector].includes(id));

  const bySector = liveBySector(live, unitsBySector);
  const lost = incidentApplies ? outOfContact(live) : [];
  const since = sinceIncident(live);
  const until = untilResolved(live);

  // The incident's impact, straight from the coverage model: what Sector B was
  // expected to reach, and what the units still in contact give on their own.
  const incidentUnits = unitsBySector[INCIDENT.sector];
  const before = coverage(INCIDENT.sector, incidentUnits.map(unitType));
  const after = coverage(
    INCIDENT.sector,
    incidentUnits.filter((id) => !INCIDENT.affectedUnits.includes(id)).map(unitType),
  );

  const flags: Partial<Record<SectorId, ReactNode>> = {};

  const incidentOpen = unresolved && incidentApplies;

  if (incidentOpen) {
    flags[INCIDENT.sector] = (
      <LiveFlagCard
        title={INCIDENT.title}
        body={`${formatUnitRange(INCIDENT.affectedUnits)} ${INCIDENT.effect}. Expected coverage ${before}% → ${after}%.`}
        primary={{
          label: 'See options',
          onClick: () => {
            if (live.feedHidden) live.toggleFeed();
            requestAnimationFrame(() => incidentRef.current?.focus({ preventScroll: true }));
          },
        }}
        secondary={{
          label: `Pause Sector ${INCIDENT.sector}`,
          onClick: () => live.pauseSector(INCIDENT.sector),
        }}
      />
    );
  }

  /*
   * Option b is two things: the Hydras come back, and Sector B is re-proposed.
   * The second half is the operator's to do, so once the units are at staging
   * the sector asks for it directly. Waiting for the behind-plan rule to ask
   * would not do — the sector reads as on plan for the best part of an hour
   * after losing seven of its ten units, because the plan tick it is measured
   * against falls behind at the same time.
   *
   * **Flagged for design review:** no frame draws this card. The copy below is
   * proposed, built from the incident card's own wording for the option.
   */
  if (
    incidentApplies &&
    live.resolution === 'b' &&
    phase === 'resolved' &&
    !flags[INCIDENT.sector]
  ) {
    flags[INCIDENT.sector] = (
      <LiveFlagCard
        title={`${formatUnitRange(INCIDENT.affectedUnits)} at staging · Sector ${INCIDENT.sector} needs new tasking`}
        body={`Returned to staging after the ${INCIDENT.relayUnit} relay loss. ${
          unitsBySector[INCIDENT.sector].length - INCIDENT.affectedUnits.length
        } of ${unitsBySector[INCIDENT.sector].length} units still on task.`}
        primary={{
          label: `Re-propose Sector ${INCIDENT.sector}`,
          onClick: () => navigate('/review'),
        }}
        secondary={{ label: 'Keep current plan', onClick: () => {} }}
      />
    );
  }

  /*
   * A sector more than the tolerance behind its plan asks to be re-proposed,
   * which is the spec's rule. An open incident takes the card instead: the
   * operator is already being asked about the cause, and asking twice about
   * the same thing in the same card is how a console gets ignored.
   */
  for (const sectorId of SECTOR_IDS) {
    const state = bySector[sectorId];
    if (flags[sectorId] || !state.flagged || !launched.includes(sectorId)) continue;

    const idle = state.stopped;
    const sector = SECTORS_BY_ID[sectorId];
    flags[sectorId] = (
      <LiveFlagCard
        title={`${state.behind} pts behind plan (${state.planned}% expected by now)`}
        body={
          idle.length > 0
            ? `${formatUnitRange(idle)} not searching. ${
                unitsBySector[sectorId].length - idle.length
              } of ${unitsBySector[sectorId].length} units still on task.`
            : sector.lowCoverageCause
        }
        primary={{
          label: `Re-propose Sector ${sectorId}`,
          onClick: () => navigate('/review'),
        }}
        secondary={{ label: 'Keep current plan', onClick: () => {} }}
      />
    );
  }

  const worst = furthestBehind(bySector);
  const inContact = availableCount() - lost.length;

  return (
    <Stage>
      <LiveMapLayer
        unitsBySector={unitsBySector}
        relayUnits={relayUnits}
        live={bySector}
        outOfContact={lost}
        incidentOpen={incidentOpen}
        relayDown={incidentApplies && phase !== 'none'}
        since={since}
        movingRelay={
          live.resolution === 'a' && live.resolvedFrom !== null
            ? {
                unitId: INCIDENT.options[0].moveUnit!,
                progress: 1 - until / INCIDENT.options[0].minutes,
              }
            : null
        }
        returnedToStaging={
          live.resolution === 'b' && phase === 'resolved' ? INCIDENT.affectedUnits : []
        }
        selectedSector={selectedSector}
        highlight={highlighted(live, unitsBySector)}
      />

      <LiveTopBar
        minute={live.minute}
        worst={worst}
        incidentOpen={incidentOpen}
        inContact={inContact}
        available={availableCount()}
      />

      <SectorStatusPanel
        assignments={assignments}
        unitsBySector={unitsBySector}
        relayUnits={relayUnits}
        live={bySector}
        outOfContact={lost}
        flags={flags}
        holding={live.heldAllAt !== null}
        onToggleHold={live.toggleHoldAll}
        lockedUnits={lockedUnits}
        onToggleLock={toggleSectorLock}
      />

      <EventFeed
        entries={feed(live)}
        hidden={live.feedHidden}
        onToggle={live.toggleFeed}
        selected={live.selectedEvent}
        onSelect={live.selectEvent}
        incident={
          incidentOpen ? (
            <div ref={incidentRef} tabIndex={-1} className="w-full">
              <IncidentCard
                phase={phase}
                at={clock(INCIDENT.atMinute)}
                since={since}
                until={until}
                resolution={live.resolution}
                chosenAt={live.resolvedFrom === null ? null : clock(live.resolvedFrom)}
                before={before}
                after={after}
                effectsOpen={live.effectsOpen}
                onToggleEffects={live.toggleEffects}
                onChoose={live.choose}
                onPauseSector={() => live.pauseSector(INCIDENT.sector)}
                sectorPaused={bySector[INCIDENT.sector].paused}
              />
            </div>
          ) : undefined
        }
      />

      <Legend />
      <RestartDemo
        onRestart={() => {
          resetPlan();
          live.reset();
          navigate('/overview');
        }}
      />
      <LiveRegion message={announcement} />
      <Announcer
        phase={phase}
        before={before}
        after={after}
        worst={worst}
        onSay={setAnnouncement}
      />
    </Stage>
  );
}

/**
 * What a screen reader is told, and when.
 *
 * Only two things on this screen are worth interrupting for: a link going
 * down, and the decision about it taking effect. Coverage climbing a point is
 * not news, and announcing it every few seconds would bury the one sentence
 * that matters.
 */
function Announcer({
  phase,
  before,
  after,
  worst,
  onSay,
}: {
  phase: string;
  before: number;
  after: number;
  worst: { sector: SectorId; behind: number; flagged: boolean };
  onSay: (message: string) => void;
}) {
  const said = useRef<string>('');

  useEffect(() => {
    const say = (message: string) => {
      if (said.current === message) return;
      said.current = message;
      onSay(message);
    };

    if (phase === 'deciding') {
      say(
        `${INCIDENT.title}. ${formatUnitRange(INCIDENT.affectedUnits)} out of contact. Sector ${INCIDENT.sector} expected coverage ${before}% down to ${after}%. Two options in the event feed.`,
      );
    } else if (phase === 'resolved') {
      say(`${INCIDENT.title} resolved.`);
    } else if (worst.flagged) {
      say(
        `Sector ${worst.sector} is ${worst.behind} points behind plan, past the ${BEHIND_TOLERANCE} point tolerance.`,
      );
    }
  }, [phase, before, after, worst.flagged, worst.sector, worst.behind, onSay]);

  return null;
}
