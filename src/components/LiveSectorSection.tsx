import type { ReactNode } from 'react';
import { SECTORS_BY_ID } from '../data/sectors';
import { formatUnitRange, groupByType } from '../lib/units';
import { LiveCoverageBar } from './LiveCoverageBar';
import { PriorityBadge } from './PriorityBadge';
import { UnitRow } from './UnitRow';
import { OperatorSetGroup, operatorNote } from './SectorSection';
import type { SectorLive } from '../store/useLiveStore';
import type { Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';
import lockOpen from '../assets/icons/lock-open.svg';

export interface LiveSectorSectionProps {
  sectorId: SectorId;
  unitIds: string[];
  assignments: Assignments;
  live: SectorLive;
  /** Units the console cannot hear from, as opposed to merely not searching. */
  outOfContact: string[];
  /** The amber card, when this sector has something the operator must decide. */
  flag?: ReactNode;
}

/**
 * One sector, live (frames 238:2144 and 289:2394).
 *
 * The same card as Screen 2 with its meaning moved on: the operator is no
 * longer deciding what to send, so the stage control becomes a plain word for
 * how the sector is doing, and the coverage bar measures the sector against
 * its plan rather than against the target. The rows keep their tasking — what
 * each unit was told to do — and gain the one condition that has changed.
 */
export function LiveSectorSection({
  sectorId,
  unitIds,
  assignments,
  live,
  outOfContact,
  flag,
}: LiveSectorSectionProps) {
  const sector = SECTORS_BY_ID[sectorId];
  const groups = groupByType(unitIds);

  const subject = groups.find((group) => group.type === sector.reason.subjectType);
  const reason = subject
    ? `${formatUnitRange(subject.unitIds)} ${sector.reason.suffix}`
    : undefined;

  const status = statusOf(live, outOfContact, unitIds.length);

  const rowsFor = (ids: string[], type: (typeof groups)[number]['type']) => {
    const detail = detailFor(ids, live.stopped, outOfContact);
    return (
      <UnitRow
        label={formatUnitRange(ids)}
        type={type}
        detailOverride={detail}
        detailFlagged={detail !== undefined}
      />
    );
  };

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-[2px] rounded-[6px] border border-surface-card bg-surface-card px-[6px] pt-[5px] pb-[6px]">
      <div className="flex h-[30px] w-full items-center gap-[4px] pl-[9px]">
        <p className="h-[17px] w-[139px] shrink-0 text-[14px] font-semibold text-text-primary">
          {sector.label}
        </p>
        <PriorityBadge priority={sector.priority} />
        <div className="h-px min-w-px flex-1" />
        <div className="flex shrink-0 items-start overflow-hidden pr-[2px] pl-[6px]">
          <p
            className={`text-[12px] whitespace-nowrap ${
              status.flagged
                ? 'font-semibold text-status-needs-operator'
                : 'text-text-secondary'
            }`}
          >
            {status.label}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Lock ${sector.label}`}
          className="flex size-[26px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[3px] border border-text-secondary"
        >
          <img alt="" src={lockOpen} width={16} height={16} className="block" />
        </button>
      </div>

      <LiveCoverageBar
        searched={live.searched}
        planned={live.planned}
        flagged={live.flagged || status.flagged}
        label={sector.label}
      />

      {/*
        * The flag card takes the reason line's place, the way the low-coverage
        * warning does on Screen 2: a sector says one thing at a time, and when
        * something has gone wrong that thing is not why the plan was drawn.
        */}
      {flag ?? (
        reason && (
          <div className="flex w-full items-start overflow-hidden px-[9px] pb-[2px]">
            <p className="min-w-px flex-1 text-[12px] text-text-secondary">{reason}</p>
          </div>
        )
      )}

      {groups.map((group) => {
        const operatorSet = group.unitIds.filter((id) => assignments[id]?.source === 'operator');
        const autonomySet = group.unitIds.filter((id) => assignments[id]?.source !== 'operator');

        return (
          <div key={group.type} className="contents">
            {autonomySet.length > 0 && rowsFor(autonomySet, group.type)}
            {operatorSet.length > 0 && (
              <OperatorSetGroup
                note={operatorNote(assignments, operatorSet)}
                rows={rowsFor(operatorSet, group.type)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The word in the top right of the card.
 *
 * "On plan" and "Behind" are frame 238:2144's, "Relay lost" is frame
 * 289:2394's. "Paused" has no frame: it is proposed here and flagged for
 * design review.
 */
function statusOf(
  live: SectorLive,
  outOfContact: string[],
  total: number,
): { label: string; flagged: boolean } {
  // A sector the operator did not stage has nothing flying in it, so it is
  // neither on plan nor behind one. No frame — proposed, flagged for review.
  if (total === 0) return { label: 'Not launched', flagged: false };
  if (live.stopped.some((id) => outOfContact.includes(id))) {
    return { label: 'Relay lost', flagged: true };
  }
  if (live.paused) return { label: 'Paused', flagged: true };
  if (live.flagged) return { label: 'Behind', flagged: true };
  /*
   * A sector that has lost units is not on plan, even before the plan tick
   * catches up with it: the tick falls behind at the same time the sector
   * does, so "Behind" can be an hour late. "Holding" and "Reduced" have no
   * frame — proposed, flagged for review — and follow the row rule below, so
   * the card and its rows say the same thing.
   */
  if (live.stopped.length > 0) {
    return { label: live.stopped.length === total ? 'Holding' : 'Reduced', flagged: true };
  }
  return { label: 'On plan', flagged: false };
}

/**
 * What has changed for these units, in the row's last column. Only units that
 * have stopped searching say anything: everything running to plan stays quiet,
 * which is what keeps the one amber line findable.
 *
 * "Out of contact" and "5 of 7 searching" are frame copy. "Holding" — units
 * the operator paused or held, which the console can still hear from — has no
 * frame and is flagged for design review.
 */
function detailFor(
  unitIds: string[],
  stopped: string[],
  outOfContact: string[],
): string | undefined {
  const idle = unitIds.filter((id) => stopped.includes(id));
  if (idle.length === 0) return undefined;

  const lost = unitIds.filter((id) => outOfContact.includes(id));
  if (lost.length === unitIds.length) return 'Out of contact';
  if (idle.length === unitIds.length) return 'Holding';
  return `${unitIds.length - idle.length} of ${unitIds.length} searching`;
}
