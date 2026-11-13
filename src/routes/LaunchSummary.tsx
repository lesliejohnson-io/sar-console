import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Legend } from '../components/Legend';
import { LiveRegion } from '../components/LiveRegion';
import { PriorityBadge } from './../components/PriorityBadge';
import { Stage } from '../components/Stage';
import { TopBar } from '../components/TopBar';
import { UnitRow } from '../components/UnitRow';
import { MISSION_TIME } from '../data/plan';
import { SECTORS, SECTORS_BY_ID, SECTOR_IDS } from '../data/sectors';
import { formatUnitRange, groupByType } from '../lib/units';
import {
  availableCount,
  coverageBySector,
  overall,
  stagedCount,
  unassignedCount,
  unitsIn,
  usePlanStore,
  weakest,
  type Assignments,
} from '../store/usePlanStore';
import type { SectorId } from '../data/types';

/**
 * The step between the plan and the launch, at `/review/launch`.
 *
 * **No Figma frame covers this screen.** It is built from the console's own
 * parts — the sector header, the unit row, the operator bar, the primary
 * button — and is flagged for design review.
 *
 * Its whole job is the rule the rest of the console is built around: nothing
 * launches unseen. Every unit that is about to go up is listed under the
 * sector it is going to, operator changes are marked where they were made,
 * and a sector that was never staged is listed too — saying plainly that it
 * is staying on the ground, with the control to change that right there.
 */
export function LaunchSummary() {
  const navigate = useNavigate();
  const assignments = usePlanStore((state) => state.assignments);
  const staged = usePlanStore((state) => state.staged);
  const setStaged = usePlanStore((state) => state.setStaged);
  const launch = usePlanStore((state) => state.launch);

  const [announcement, setAnnouncement] = useState('');

  const coverage = coverageBySector(assignments);
  const stagedSectors = SECTOR_IDS.filter((id) => staged[id]);
  const heldSectors = SECTOR_IDS.filter((id) => !staged[id]);
  const relayUnits = unitsIn(assignments, 'ALL');

  const launching = stagedSectors.reduce(
    (total, id) => total + unitsIn(assignments, id).length,
    relayUnits.length,
  );

  const handleStage = useCallback(
    (sectorId: SectorId) => {
      setStaged(sectorId, true);
      setAnnouncement(`${SECTORS_BY_ID[sectorId].label} staged. It will launch.`);
    },
    [setStaged],
  );

  const handleLaunch = useCallback(() => {
    launch();
    navigate('/live');
  }, [launch, navigate]);

  return (
    <Stage>
      <div className="absolute inset-0 bg-surface-app" />

      <TopBar
        overall={overall(assignments)}
        weakest={weakest(assignments)}
        weakestPercent={coverage[weakest(assignments)]}
        unassigned={unassignedCount(assignments)}
        available={availableCount()}
      />

      <section
        aria-labelledby="launch-summary-title"
        className="absolute flex flex-col overflow-hidden rounded-[10px] border border-border-subtle bg-surface-panel shadow-panel"
        style={{ left: 9, top: 85, width: 1422, height: 896 }}
      >
        <header className="flex h-[61px] shrink-0 items-center gap-[12px] border-b border-border-subtle px-[21px]">
          <h1
            id="launch-summary-title"
            className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase"
          >
            Review and launch
          </h1>
          <p className="text-[12px] whitespace-nowrap text-text-secondary">
            {launching} units · {stagedSectors.length} of {SECTOR_IDS.length} sectors · {MISSION_TIME}
          </p>
        </header>

        <div className="grid min-h-px flex-1 auto-rows-min grid-cols-2 items-start gap-[12px] overflow-y-auto p-[16px]">
          <RelayCard unitIds={relayUnits} />

          {SECTORS.map((sector) => (
            <SectorCard
              key={sector.id}
              sectorId={sector.id}
              assignments={assignments}
              unitIds={unitsIn(assignments, sector.id)}
              percent={coverage[sector.id]}
              staged={staged[sector.id]}
              onStage={handleStage}
            />
          ))}
        </div>

        <footer className="flex h-[64px] shrink-0 items-center justify-end gap-[12px] border-t border-border-subtle px-[16px]">
          {heldSectors.length > 0 && (
            <p className="mr-auto text-[12px] text-status-needs-operator">
              {formatSectorList(heldSectors)} will not launch.
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate('/review')}
            className="flex h-[40px] cursor-pointer items-center justify-center rounded-[3px] px-[16px] text-[12px] font-semibold text-text-secondary hover:bg-surface-card hover:text-text-primary"
          >
            Back to plan
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={stagedSectors.length === 0}
            className="flex h-[40px] w-[280px] cursor-pointer items-center justify-center rounded-[3px] bg-interaction-primary px-[8px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-[14px] font-medium whitespace-nowrap text-text-on-interaction">
              LAUNCH · {stagedCount(staged)} SECTORS
            </span>
          </button>
        </footer>
      </section>

      <Legend />
      <LiveRegion message={announcement} />
    </Stage>
  );
}

/** "Sector D" or "Sectors C and D" — how the footer names what is staying. */
function formatSectorList(ids: SectorId[]): string {
  const names = ids.map((id) => `Sector ${id}`);
  if (names.length === 1) return names[0];
  return `Sectors ${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`;
}

/** The Griffins, which belong to the whole area rather than to a sector. */
function RelayCard({ unitIds }: { unitIds: string[] }) {
  return (
    <article className="flex flex-col items-start gap-[2px] rounded-[6px] border border-border-subtle bg-surface-card px-[6px] pt-[5px] pb-[6px]">
      <div className="flex h-[30px] w-full items-center gap-[8px] pl-[9px]">
        <p className="text-[14px] font-semibold whitespace-nowrap text-text-primary">
          All sectors
        </p>
        <p className="text-[12px] whitespace-nowrap text-text-secondary">
          Relay over every sector
        </p>
      </div>
      <UnitRow label={formatUnitRange(unitIds)} type="GRF" showLockSlot={false} />
    </article>
  );
}

/**
 * One sector's share of the launch. A sector that is not staged keeps its
 * full list — the operator still has to see what they are holding back — but
 * is dimmed and says so, and carries the control that changes its mind.
 */
function SectorCard({
  sectorId,
  assignments,
  unitIds,
  percent,
  staged,
  onStage,
}: {
  sectorId: SectorId;
  assignments: Assignments;
  unitIds: string[];
  percent: number;
  staged: boolean;
  onStage: (sectorId: SectorId) => void;
}) {
  const sector = SECTORS_BY_ID[sectorId];

  return (
    <article
      className={`flex flex-col items-start gap-[2px] rounded-[6px] border bg-surface-card px-[6px] pt-[5px] pb-[6px] ${
        staged ? 'border-border-subtle' : 'border-status-needs-operator'
      }`}
    >
      <div className="flex h-[30px] w-full items-center gap-[8px] pl-[9px]">
        <p className="shrink-0 text-[14px] font-semibold whitespace-nowrap text-text-primary">
          {sector.label}
        </p>
        <PriorityBadge priority={sector.priority} />
        <p className="shrink-0 font-mono text-[12px] text-text-secondary">{percent}%</p>
        <div className="h-px min-w-px flex-1" />
        {staged ? (
          <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
            ✓ Staged · will launch
          </p>
        ) : (
          <>
            <p className="shrink-0 text-[12px] whitespace-nowrap text-status-needs-operator">
              Not staged: will not launch
            </p>
            <button
              type="button"
              onClick={() => onStage(sectorId)}
              className="shrink-0 cursor-pointer rounded-[3px] border border-interaction-primary px-[10px] py-[4px] text-[12px] font-semibold whitespace-nowrap text-interaction-primary"
            >
              Stage sector
            </button>
          </>
        )}
      </div>

      <div className={`flex w-full flex-col items-start ${staged ? '' : 'opacity-60'}`}>
        {groupByType(unitIds).map((group) => {
          const operatorSet = group.unitIds.filter(
            (id) => assignments[id].source === 'operator',
          );
          const autonomySet = group.unitIds.filter(
            (id) => assignments[id].source === 'autonomy',
          );

          return (
            <div key={group.type} className="contents">
              {autonomySet.length > 0 && (
                <UnitRow label={formatUnitRange(autonomySet)} type={group.type} />
              )}
              {operatorSet.length > 0 && (
                <div className="relative flex w-full flex-col items-start">
                  <UnitRow label={formatUnitRange(operatorSet)} type={group.type} />
                  <div className="flex w-full items-start pb-[5px] pl-[9px]">
                    <p className="text-[12px] whitespace-nowrap text-text-secondary">
                      {operatorNote(assignments, operatorSet)}
                    </p>
                  </div>
                  <div className="absolute inset-y-0 left-0 w-[2px] bg-status-operator-set" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

/** "Set by operator · moved from Sector B · 08:41" */
function operatorNote(assignments: Assignments, unitIds: string[]): string {
  const assignment = assignments[unitIds[0]];
  const parts = ['Set by operator'];
  if (assignment.movedFrom) parts.push(`moved from Sector ${assignment.movedFrom}`);
  if (assignment.at) parts.push(assignment.at);
  return parts.join(' · ');
}
