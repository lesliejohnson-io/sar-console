import { SECTORS_BY_ID } from '../data/sectors';
import { formatUnitRange, groupByType } from '../lib/units';
import { CoverageBar } from './CoverageBar';
import { InlineWarning } from './InlineWarning';
import { PriorityBadge } from './PriorityBadge';
import { UnitRow } from './UnitRow';
import type { Assignments } from '../store/usePlanStore';
import type { SectorId } from '../data/types';
import lockOpen from '../assets/icons/lock-open.svg';

export interface SectorSectionProps {
  sectorId: SectorId;
  unitIds: string[];
  assignments: Assignments;
  percent: number;
  belowTarget: boolean;
  staged: boolean;
  selected: boolean;
  lockedUnits: string[];
}

export function SectorSection({
  sectorId,
  unitIds,
  assignments,
  percent,
  belowTarget,
  staged,
  selected,
  lockedUnits,
}: SectorSectionProps) {
  const sector = SECTORS_BY_ID[sectorId];
  const groups = groupByType(unitIds);

  // The autonomy's reason names whatever units of its subject type are in the
  // sector right now, so it stays true after the operator moves one out.
  const subject = groups.find((group) => group.type === sector.reason.subjectType);
  const reason = subject
    ? `${formatUnitRange(subject.unitIds)} ${sector.reason.suffix}`
    : undefined;

  return (
    <div
      className={`flex w-full shrink-0 flex-col items-start gap-[2px] overflow-hidden rounded-[6px] border bg-surface-card px-[6px] pt-[5px] pb-[6px] ${
        selected ? 'border-text-primary' : 'border-surface-card'
      }`}
    >
      <div className="flex h-[30px] w-full items-center gap-[4px] pl-[9px]">
        <p className="h-[17px] w-[139px] shrink-0 text-[14px] font-semibold text-text-primary">
          {sector.label}
        </p>
        <PriorityBadge priority={sector.priority} />
        <div className="h-px min-w-px flex-1" />
        {staged ? (
          <div className="flex shrink-0 items-start overflow-hidden pr-[2px] pl-[6px]">
            <p className="text-[12px] whitespace-nowrap text-text-secondary">✓ Staged</p>
          </div>
        ) : (
          <button
            type="button"
            className="flex shrink-0 cursor-pointer items-start overflow-hidden rounded-[3px] border border-interaction-primary px-[10px] py-[4px]"
          >
            <p className="text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
              Stage sector
            </p>
          </button>
        )}
        <button
          type="button"
          aria-label={`Lock ${sector.label}`}
          className="flex size-[26px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[3px] border border-text-secondary"
        >
          <img alt="" src={lockOpen} width={16} height={16} className="block" />
        </button>
      </div>

      <CoverageBar percent={percent} />

      {/*
        * Below target the warning takes the reason line's place: it carries the
        * cause itself, so the sector does not say two things at once.
        */}
      {reason && !belowTarget && (
        <div className="flex w-full items-start overflow-hidden px-[9px] pb-[2px]">
          <p className="min-w-px flex-1 text-[12px] text-text-secondary">{reason}</p>
        </div>
      )}

      {belowTarget && (
        <InlineWarning
          percent={percent}
          priority={sector.priority}
          cause={sector.lowCoverageCause}
        />
      )}

      {groups.map((group) => {
        const operatorSet = group.unitIds.filter(
          (id) => assignments[id].source === 'operator',
        );
        const autonomySet = group.unitIds.filter(
          (id) => assignments[id].source === 'autonomy',
        );

        return (
          <div key={group.type} className="contents">
            {autonomySet.length > 0 && (
              <UnitRow
                label={formatUnitRange(autonomySet)}
                type={group.type}
                locked={autonomySet.every((id) => lockedUnits.includes(id))}
              />
            )}
            {operatorSet.length > 0 && (
              <OperatorSetGroup
                label={formatUnitRange(operatorSet)}
                type={group.type}
                note={operatorNote(assignments, operatorSet)}
              />
            )}
          </div>
        );
      })}
    </div>
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

/** An operator choice, marked with the teal bar and its own reason line. */
function OperatorSetGroup({
  label,
  type,
  note,
}: {
  label: string;
  type: Parameters<typeof UnitRow>[0]['type'];
  note: string;
}) {
  return (
    <div className="relative flex w-full flex-col items-start overflow-hidden">
      <UnitRow label={label} type={type} />
      <div className="flex w-full items-start overflow-hidden pb-[5px] pl-[9px]">
        <p className="text-[12px] whitespace-nowrap text-text-secondary">{note}</p>
      </div>
      <div className="absolute inset-y-0 left-0 w-[2px] bg-status-operator-set" />
    </div>
  );
}
